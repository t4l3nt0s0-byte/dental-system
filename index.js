// ══════════════════════════════════════════════════════════════
// DENTALOS — Firebase Cloud Functions
// ══════════════════════════════════════════════════════════════
//
// INSTRUCCIONES DE DEPLOY (cuando tengas Firebase Blaze):
//
// 1. Instalar Firebase CLI (una sola vez):
//    npm install -g firebase-tools
//
// 2. Login:
//    firebase login
//
// 3. Guardar el Access Token de MercadoPago:
//    firebase functions:config:set \
//      mp.access_token="TEST-241493843649057-060816-cee9fd57cd1bf937dbcb85ee3aabdd44-654088559"
//
// 4. Instalar dependencias:
//    cd functions && npm install
//
// 5. Deploy:
//    firebase deploy --only functions
//
// 6. Copiar la URL de la función y pegarla en planes.html:
//    backendUrl: 'https://us-central1-dental-add.cloudfunctions.net/createPreference'
//
// ══════════════════════════════════════════════════════════════

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const fetch     = require('node-fetch');
const cors      = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// Access token de MercadoPago (guardado con functions:config:set)
const MP_ACCESS_TOKEN = functions.config().mp?.access_token || '';

// ── CREAR PREFERENCIA DE PAGO ──────────────────────────────
exports.createPreference = functions
  .region('us-central1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') return res.status(405).end();

      const { planKey, precio, clinicaId, email, nombre, clinica,
              successUrl, failureUrl, pendingUrl } = req.body;

      if (!planKey || !precio || !clinicaId) {
        return res.status(400).json({ error: 'Faltan datos: planKey, precio, clinicaId' });
      }
      if (!MP_ACCESS_TOKEN) {
        return res.status(500).json({ error: 'MP no configurado. Ejecuta: firebase functions:config:set mp.access_token="..."' });
      }

      const BASE = 'https://t4l3nt0s0-byte.github.io/dental-system/planes.html';

      try {
        const preference = {
          items: [{
            id:          planKey,
            title:       `DentalOS Plan ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`,
            description: `Suscripción mensual DentalOS`,
            quantity:    1,
            unit_price:  Number(precio),
            currency_id: 'MXN',
          }],
          payer: { email: email || '', name: nombre || '' },
          back_urls: {
            success: successUrl || `${BASE}?status=approved&plan=${planKey}`,
            failure: failureUrl || `${BASE}?status=failure`,
            pending: pendingUrl || `${BASE}?status=pending`,
          },
          auto_return:          'approved',
          external_reference:   `${clinicaId}:${planKey}`,
          notification_url:     'https://us-central1-dental-add.cloudfunctions.net/mpWebhook',
          statement_descriptor: 'DENTALOS',
          metadata:             { clinica_id: clinicaId, plan_key: planKey },
        };

        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(preference),
        });

        const data = await mpRes.json();
        if (!mpRes.ok) {
          console.error('MP Error:', data);
          return res.status(mpRes.status).json({ error: data.message || 'Error MP' });
        }

        console.log(`Preference ${data.id} created for clinic ${clinicaId} plan ${planKey}`);
        return res.json({
          preference_id: data.id,
          init_point:    data.init_point,
          sandbox_init:  data.sandbox_init_point,
        });

      } catch(e) {
        console.error('createPreference error:', e.message);
        return res.status(500).json({ error: e.message });
      }
    });
  });

// ── WEBHOOK — MP notifica pagos aprobados ──────────────────
exports.mpWebhook = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') return res.status(200).end();
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return res.status(200).json({ ok: true });

    try {
      const payRes  = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
      });
      const payment = await payRes.json();

      if (payment.status !== 'approved') {
        console.log(`Payment ${data.id} status: ${payment.status}`);
        return res.status(200).json({ ok: true });
      }

      const [clinicaId, planKey] = (payment.external_reference || '').split(':');
      if (!clinicaId || !planKey) return res.status(200).json({ ok: true });

      // Activar plan en Firestore
      await db.collection('clinicas').doc(clinicaId).update({
        plan:            planKey,
        planActivoDesde: admin.firestore.FieldValue.serverTimestamp(),
        ultimoPagoId:    String(payment.id),
        ultimoPagoMonto: payment.transaction_amount,
        ultimoPagoFecha: admin.firestore.FieldValue.serverTimestamp(),
        pagoEnProceso:   null,
      });

      // Auditoría
      await db.collection('clinicas').doc(clinicaId)
        .collection('auditoria').add({
          accion:   'PLAN_PAGADO',
          datos:    { planKey, paymentId: payment.id, monto: payment.transaction_amount },
          uid:      'sistema_mp',
          userName: 'MercadoPago',
          ts:       admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(`Plan ${planKey} activated for clinic ${clinicaId}`);
      return res.status(200).json({ ok: true });

    } catch(e) {
      console.error('Webhook error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

// ── ANALYTICS PRECALCULADOS ─────────────────────────────────
// Se ejecuta cada vez que se crea/actualiza un abono o una cita
// Escribe en clinicas/{id}/analytics/monthly_{YYYY-MM}
// metricas.html lee ESE documento en vez de cargar 500+ docs

exports.calcularAnalytics = functions
  .region('us-central1')
  .firestore
  .document('clinicas/{clinicaId}/abonos/{abonoId}')
  .onWrite(async (change, context) => {
    const clinicaId = context.params.clinicaId;
    await actualizarAnalytics(clinicaId);
  });

exports.calcularAnalyticsCitas = functions
  .region('us-central1')
  .firestore
  .document('clinicas/{clinicaId}/citas/{citaId}')
  .onWrite(async (change, context) => {
    const clinicaId = context.params.clinicaId;
    await actualizarAnalytics(clinicaId);
  });

async function actualizarAnalytics(clinicaId) {
  const now    = new Date();
  const mesISO = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const desde  = mesISO + '-01';
  const hasta  = mesISO + '-31';

  try {
    // Leer solo el mes actual — no toda la colección
    const [abonosSnap, citasSnap, pacientesSnap] = await Promise.all([
      db.collection('clinicas').doc(clinicaId)
        .collection('abonos')
        .where('fecha','>=',desde).where('fecha','<=',hasta).get(),
      db.collection('clinicas').doc(clinicaId)
        .collection('citas')
        .where('fecha','>=',desde).where('fecha','<=',hasta).get(),
      db.collection('clinicas').doc(clinicaId)
        .collection('pacientes')
        .where('creadoEn','>=', admin.firestore.Timestamp.fromDate(new Date(desde)))
        .limit(500).get(),
    ]);

    const abonos = abonosSnap.docs.map(d => d.data());
    const citas  = citasSnap.docs.map(d => d.data());

    // Calcular KPIs
    const ingresos          = abonos.reduce((s,a) => s + Number(a.monto||0), 0);
    const citasCompletadas  = citas.filter(c => c.estado === 'Completado').length;
    const citasCanceladas   = citas.filter(c => c.estado === 'Cancelado').length;
    const pacientesNuevos   = pacientesSnap.docs.length;

    // Guardar doc precalculado (1 write)
    await db.collection('clinicas').doc(clinicaId)
      .collection('analytics').doc('monthly_' + mesISO)
      .set({
        mes:              mesISO,
        ingresos,
        pagos:            abonos.length,
        citasTotal:       citas.length,
        citasCompletadas,
        citasCanceladas,
        pacientesNuevos,
        updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
        // Listas compactas para gráficas (solo los campos necesarios)
        _abonos:  abonos.map(a => ({fecha:a.fecha, monto:a.monto, forma:a.forma})),
        _citas:   citas.map(c => ({fecha:c.fecha, hora:c.hora, estado:c.estado, doctor:c.doctor})),
      }, { merge: false });

    console.log('Analytics updated for', clinicaId, mesISO, '— ingresos:', ingresos);
  } catch(e) {
    console.error('calcularAnalytics error:', e.message);
  }
}
