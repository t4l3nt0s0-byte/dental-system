// shared.js — Hersantych Dental · Shared UI + Firebase helpers (no-module version for inline use)
// This file is loaded as a regular script tag and exposes globals via window

// ── Firebase CDN (loaded from HTML) ──────────────────────────
// All pages must include these script tags before shared.js:
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

const FIREBASE_CONFIG = {
  apiKey:"AIzaSyA4KnJ9y0bbdbwrnd62K5QhZdiMC5-_EV8",
  authDomain:"dental-add.firebaseapp.com",
  projectId:"dental-add",
  storageBucket:"dental-add.firebasestorage.app",
  messagingSenderId:"1350878692",
  appId:"1:1350878692:web:1b11da0a68054d9f2bf3f1"
};

// ── Firebase init ─────────────────────────────────────────────
// Usa app nombrada 'dental' para no conflictuar con otras instancias
var _dentalApp;
try {
  _dentalApp = firebase.app('dental');
} catch(e) {
  _dentalApp = firebase.initializeApp(FIREBASE_CONFIG, 'dental');
}
const db   = _dentalApp.firestore();
const auth = _dentalApp.auth();

// ── PLAN DEFINITIONS ─────────────────────────────────────────
const PLANES = {
  trial: {
    nombre:'Trial', color:'#9CA3AF', maxPacientes:5, maxUsuarios:1,
    maxDoctores:0, maxRecepcion:0,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','recetas'],
    diasPrueba:7,
  },
  basico: {
    nombre:'Básico', color:'#4A9EFF', maxPacientes:50, maxUsuarios:3,
    maxDoctores:1, maxRecepcion:1,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','recetas'],
  },
  profesional: {
    nombre:'Profesional', color:'#00C2A8', maxPacientes:Infinity, maxUsuarios:4,
    maxDoctores:2, maxRecepcion:1,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','recetas'],
  },
  premium: {
    nombre:'Premium', color:'#F4B942', maxPacientes:Infinity, maxUsuarios:Infinity,
    maxDoctores:Infinity, maxRecepcion:Infinity,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','multisucursal','kpi-avanzado','expediente','recetas'],
  }
};

const ROLES = {
  admin:     { label:'Administrador', permisos:['all'] },
  doctor:    { label:'Doctor',        permisos:['agenda','pacientes','tratamientos','odontograma'] },
  recepcion: { label:'Recepción',     permisos:['agenda','pacientes','cotizacion','abonos'] },
  asistente: { label:'Asistente',     permisos:['agenda','pacientes'] },
};

// ── SESSION ───────────────────────────────────────────────────
let SESSION = null;
let _loggingOut = false; // Flag para evitar redirect loop durante logout // { user, clinica }

// Plan TRIAL — funciones permitidas en prueba
const TRIAL_FEATURES = ['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','recibo','estado-cuenta'];

// Aplicar tema guardado inmediatamente al cargar la página
(function applyStoredTheme() {
  const t = localStorage.getItem('dental_tema');
  const c = localStorage.getItem('dental_color');
  if (!t && !c) return;

  // Suprimir transiciones para cambio instantáneo sin pasme
  const noTrans = document.createElement('style');
  noTrans.id = '_no_transition_init';
  noTrans.textContent = '*, *::before, *::after { transition: none !important; animation-duration: 0s !important; }';
  document.head.appendChild(noTrans);

  const root = document.documentElement;
  if (t === 'light') {
    root.style.setProperty('--bg',         '#f8fafc');
    root.style.setProperty('--surface',    '#ffffff');
    root.style.setProperty('--surface2',   '#f0f4f8');
    root.style.setProperty('--border',     'rgba(0,0,0,.08)');
    root.style.setProperty('--border2',    'rgba(0,0,0,.15)');
    root.style.setProperty('--text',       '#111827');
    root.style.setProperty('--text-muted', 'rgba(17,24,39,.55)');
    root.style.setProperty('--text-dim',   'rgba(17,24,39,.3)');
    root.style.setProperty('--sidebar-bg', '#ffffff');
    root.style.setProperty('--topbar-bg',  'rgba(255,255,255,.97)');
    document.body && (document.body.style.background = '#f8fafc');
    document.body && (document.body.style.color = '#111827');
  } else if (t === 'dark') {
    root.style.setProperty('--bg',         '#060D14');
    root.style.setProperty('--surface',    '#0C1622');
    root.style.setProperty('--surface2',   '#111E2E');
    root.style.setProperty('--border',     'rgba(255,255,255,.07)');
    root.style.setProperty('--border2',    'rgba(255,255,255,.12)');
    root.style.setProperty('--text',       '#E8F0F8');
    root.style.setProperty('--text-muted', 'rgba(232,240,248,.50)');
    root.style.setProperty('--text-dim',   'rgba(232,240,248,.25)');
    root.style.setProperty('--sidebar-bg', '#0A1628');
    root.style.setProperty('--topbar-bg',  'rgba(6,13,20,.95)');
    document.body && (document.body.style.background = '#060D14');
  }
  if (c) {
    const r = parseInt(c.slice(1,3),16);
    const g = parseInt(c.slice(3,5),16);
    const b = parseInt(c.slice(5,7),16);
    root.style.setProperty('--teal',      c);
    root.style.setProperty('--teal-dim',  `rgba(${r},${g},${b},.12)`);
    root.style.setProperty('--teal-glow', `rgba(${r},${g},${b},.25)`);
  }

  // Restaurar transiciones en el siguiente frame
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const s = document.getElementById('_no_transition_init');
    if (s) s.remove();
  }));
})();

// Banner de trial en la parte inferior
function showTrialBannerIfNeeded() {
  if (!SESSION) return;
  const clinica = SESSION.clinica;
  if (clinica.plan !== 'trial') return;
  const trialEnd = clinica.trialEnd?.toDate ? clinica.trialEnd.toDate() : null;
  if (!trialEnd) return;
  const dias = Math.ceil((trialEnd - new Date()) / 86400000);

  // Eliminar banner previo si existe
  const prev = document.getElementById('_trial_banner');
  if (prev) prev.remove();

  const banner = document.createElement('div');
  banner.id = '_trial_banner';

  // SIEMPRE arriba — position fixed top:0
  // z-index 9999 para que esté sobre todo incluyendo sidebar y topbar
  Object.assign(banner.style, {
    position:   'fixed',
    top:        '0',
    left:       '0',
    right:      '0',
    bottom:     'auto',
    zIndex:     '9999',
    background: 'linear-gradient(90deg,#F59E0B,#F97316)',
    color:      '#1a0a00',
    padding:    '9px 20px',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap:        '12px',
    fontFamily: 'DM Sans,sans-serif',
    fontSize:   '.82rem',
    fontWeight: '700',
    boxShadow:  '0 2px 12px rgba(245,158,11,.4)',
    lineHeight: '1',
  });

  const msg = dias > 0
    ? `⏳ Período de prueba · <strong>${dias} día${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}</strong> · Activa un plan para continuar`
    : `⚠️ <strong>Período de prueba vencido</strong> · Activa un plan para seguir usando el sistema`;

  banner.innerHTML = `
    <span>${msg}</span>
    <a href="planes.html" style="
      background:#1a0a00;color:#F59E0B;
      padding:5px 14px;border-radius:8px;
      font-size:.78rem;font-weight:800;
      text-decoration:none;white-space:nowrap;
      flex-shrink:0;
    ">💎 Ver planes →</a>`;

  document.body.prepend(banner); // prepend = primer hijo del body

  // Empujar sidebar y topbar hacia abajo exactamente la altura del banner
  const bannerH = 38;
  document.body.classList.add('trial-banner-active');

  // Aplicar estilos directamente como fallback adicional
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.style.top = bannerH + 'px';
  const hamburger = document.getElementById('hamburger');
  if (hamburger) hamburger.style.top = (bannerH + 8) + 'px';

  // Asegurar que el main no empiece tapado (en caso de que sea margin)
  const main = document.querySelector('.main');
  if (main) {
    main.style.paddingTop   = '0';
    main.style.paddingBottom = '0';
  }

}

// ── applyTema ──────────────────────────────────────────────────
// Cambia tema con data-theme en <html> — el CSS hace el resto
// Instantáneo: un solo setAttribute, sin loops JS
function applyTema(tema, colorPrimario) {
  var t = tema || localStorage.getItem('dental_tema') || 'dark';
  var c = colorPrimario || localStorage.getItem('dental_color') || '';

  // Guardar preferencia
  localStorage.setItem('dental_tema', t);
  if (c) localStorage.setItem('dental_color', c);

  // ① Cambiar tema — INSTANTÁNEO (el CSS hace todo)
  document.documentElement.setAttribute('data-theme', t);

  // ② Color de acento personalizado
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) {
    var r = parseInt(c.slice(1,3),16);
    var g = parseInt(c.slice(3,5),16);
    var b = parseInt(c.slice(5,7),16);
    document.documentElement.style.setProperty('--teal',      c);
    document.documentElement.style.setProperty('--teal-dim',  'rgba('+r+','+g+','+b+',.12)');
    document.documentElement.style.setProperty('--teal-glow', 'rgba('+r+','+g+','+b+',.25)');
  }
}
window.applyTema = applyTema;

// Aplicar tema ANTES de que el navegador pinte nada (evita FOUC)
(function(){
  var t = localStorage.getItem('dental_tema') || 'dark';
  var c = localStorage.getItem('dental_color') || '';
  document.documentElement.setAttribute('data-theme', t);
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) {
    var r = parseInt(c.slice(1,3),16);
    var g = parseInt(c.slice(3,5),16);
    var b = parseInt(c.slice(5,7),16);
    document.documentElement.style.setProperty('--teal',      c);
    document.documentElement.style.setProperty('--teal-dim',  'rgba('+r+','+g+','+b+',.12)');
    document.documentElement.style.setProperty('--teal-glow', 'rgba('+r+','+g+','+b+',.25)');
  }
})();



// ── initSession ─────────────────────────────────────────────────
async function initSession(requiredPage) {
  var href = window.location.href;
  var isPublic = ['login','registro','landing'].some(function(p){
    return href.indexOf(p) !== -1;
  });

  return new Promise(function(resolve) {
    var done = false;
    var unsubscribe = auth.onAuthStateChanged(function(user) {
      if (done) return;
      done = true;
      unsubscribe();

      // Sin sesión activa
      if (!user) {
        if (!isPublic && !_loggingOut) {
          window.location.replace('login.html');
        }
        resolve(null);
        return;
      }

      // Con sesión — cargar datos
      db.collection('usuarios').doc(user.uid).get()
        .then(function(userSnap) {
          // Sin datos de usuario: sesión de Auth sin registro Firestore
          if (!userSnap.exists) { resolve(null); return; }

          var userData = userSnap.data();
          if (userData.activo === false) {
            auth.signOut().catch(function(){});
            resolve(null); return;
          }

          var clinicaId = userData.clinicaId;
          if (!clinicaId) { resolve(null); return; }

          db.collection('clinicas').doc(clinicaId).get()
            .then(function(clinicaSnap) {
              if (!clinicaSnap.exists) { resolve(null); return; }

              var clinicaData = Object.assign({ id: clinicaId }, clinicaSnap.data());

              // Verificar permiso de página según rol
              var ROLES_PERM = {
                admin:    'any',
                doctor:   ['agenda','pacientes','tratamientos','odontograma','recetas'],
                recepcion:['agenda','pacientes','tratamientos','abonos','cotizacion',
                           'catalogo','corte-caja','busqueda'],
              };
              var rol = userData.rol || 'recepcion';
              var perms = ROLES_PERM[rol];
              if (requiredPage && requiredPage !== 'any' && perms !== 'any') {
                if (perms.indexOf(requiredPage) === -1) {
                  window.location.replace('index.html');
                  resolve(null); return;
                }
              }

              // ✅ Todo OK — establecer sesión
              SESSION = Object.assign({ user: Object.assign({}, userData, { uid: user.uid }) }, { clinica: clinicaData });
              window.SESSION = SESSION;

              if (typeof applyTema === 'function') applyTema(clinicaData.tema, clinicaData.colorPrimario);
              if (typeof renderSidebar === 'function') renderSidebar();
              if (typeof showTrialBannerIfNeeded === 'function') showTrialBannerIfNeeded();

              resolve(SESSION);
            })
            .catch(function(e) {
              console.warn('initSession clinica:', e.message);
              resolve(null);
            });
        })
        .catch(function(e) {
          console.warn('initSession usuario:', e.message);
          resolve(null);
        });
    });
  });
}




function renderSidebar() {
  if (!SESSION) return;
  const { clinica, user } = SESSION;
  // Siempre leer el plan fresco de SESSION.clinica.plan
  const planKey = clinica.plan || 'basico';
  const plan = PLANES[planKey] || PLANES.basico;
  const feats = plan.features;
  const isAdmin = user.rol === 'admin';

  function navItem(page, icon, label, feat) {
    // Admin siempre tiene acceso a todo sin importar el plan
    // Para otros roles: verificar que la feature esté en el plan
    const locked = feat && feat !== 'any' && !feats.includes(feat) && !isAdmin;
    const active = window.CURRENT_PAGE === page ? 'active' : '';
    const cls = locked ? 'nav-item locked' : `nav-item ${active}`;
    const href = locked ? '#' : `${page}.html`;
    const planNecesario = ['metricas','odontograma','inventario','reportes','usuarios','ofertas'].includes(feat) ? 'Profesional' : 'Premium';
    const onclick = locked ? `event.preventDefault();showToast('Requiere plan ${planNecesario}','info')` : '';
    return `<a href="${href}" class="${cls}" data-page="${page}" ${onclick ? `onclick="${onclick}"` : ''}>${icon} ${label}</a>`;
  }

  const html = `
  <div class="sidebar-logo">
    <div class="logo-mark">
      ${clinica.logoBase64 && clinica.logoOpcion !== 'default'
        ? `<img src="${clinica.logoBase64}" style="width:36px;height:36px;border-radius:8px;object-fit:contain;background:#fff;padding:3px;flex-shrink:0">`
        : '<div class="logo-icon">🦷</div>'}
      <div style="min-width:0">
        <div class="logo-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${clinica.nombre || 'Hersantych Dental'}</div>
        <div class="logo-sub">${clinica.eslogan || 'Sistema integral'}</div>
      </div>
    </div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section">Principal</div>
    ${navItem('index','📊','Dashboard','any')}
    ${navItem('agenda','📅','Agenda de Citas','any')}
    ${navItem('pacientes','👤','Expedientes','any')}
    <div class="nav-section">Clínica</div>
    ${navItem('tratamientos','🦷','Tratamientos','any')}
    ${navItem('abonos','💰','Abonos & Pagos','any')}
    ${navItem('catalogo','📚','Catálogo & Precios','any')}
    ${navItem('cotizacion','📝','Cotizaciones','any')}
    ${navItem('corte-caja','🧾','Corte de Caja','any')}
    <div class="nav-section">Avanzado</div>
    ${navItem('odontograma','🦷','Odontograma','odontograma')}
    ${navItem('inventario','💊','Inventario','inventario')}
    ${navItem('recetas','📋','Recetas Médicas','any')}
    ${navItem('ofertas','🎁','Ofertas & Promos','ofertas')}
    ${navItem('metricas','📈','Métricas','metricas')}
    ${navItem('reportes','📊','Reportes','reportes')}
    <div class="nav-section">Sistema</div>
    ${navItem('usuarios','👥','Usuarios & Roles','usuarios')}
    ${navItem('expediente','📋','Expediente Completo','expediente')}
    ${navItem('recibo','🧾','Recibo de Pago','any')}
    ${navItem('estado-cuenta','📄','Estado de Cuenta','any')}
    ${navItem('recordatorios','💬','Recordatorios WA','any')}
    ${navItem('importar-datos','📥','Importar desde Excel','any')}
    ${navItem('busqueda','🔍','Búsqueda Global','any')}
    ${navItem('planes','💎','Planes & Precios','any')}
    ${navItem('configuracion','⚙️','Descubre','any')}
  </nav>
  <div class="sidebar-footer">
    <div class="clinic-name">${clinica.nombre || 'Consultorio'}</div>
    <div class="clinic-info">${user.nombre || user.email} · ${ROLES[user.rol]?.label || 'Usuario'}</div>
    ${clinica.plan === 'trial' ? '<span class="plan-badge" style="background:rgba(244,185,66,.15);color:#F4B942;border:1px solid rgba(244,185,66,.3)">⏳ Trial</span>' : '<span class="plan-badge" style="background:'+plan.color+'22;color:'+plan.color+';border:1px solid '+plan.color+'44">'+plan.nombre+'</span>'}
    <br><button onclick="logout()" style="background:none;border:none;color:var(--text-dim);font-size:.7rem;cursor:pointer;margin-top:6px;padding:0">🚪 Cerrar sesión</button>
  </div>`;

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.innerHTML = html;

  // ── MÓVIL: Hamburger + Overlay ──────────────────────────
  // Crear overlay si no existe
  let overlay = document.getElementById('_sidebar_overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '_sidebar_overlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  const openSidebar  = () => { sidebar?.classList.add('open');    overlay.classList.add('open');    document.body.style.overflow='hidden'; };
  const closeSidebar = () => { sidebar?.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow=''; };

  const ham = document.getElementById('hamburger');
  if (ham) {
    ham.addEventListener('click', () => {
      if (sidebar?.classList.contains('open')) closeSidebar();
      else openSidebar();
    });
  }

  // Cerrar con clic en overlay
  overlay.addEventListener('click', closeSidebar);

  // Cerrar al navegar (móvil)
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // Cerrar con tecla Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeSidebar();
  });

  // Ajustar al rotar pantalla
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeSidebar();
  });
}

async function logout() {
  _loggingOut = true; // Marcar antes de signOut para evitar redirect loop
  try {
    await auth.signOut();
  } catch(e) {
    console.warn('signOut:', e.message);
  }
  window.location.replace('login.html');
}

// ── FIRESTORE HELPERS ────────────────────────────────────────
function clinicaCol(col) {
  return db.collection('clinicas').doc(SESSION.clinica.id).collection(col);
}
function clinicaDoc(col, id) {
  return db.collection('clinicas').doc(SESSION.clinica.id).collection(col).doc(id);
}

async function fsGetAll(col, constraints) {
  let ref = clinicaCol(col);
  if (constraints) ref = constraints(ref);
  else ref = ref.orderBy('creadoEn','desc');
  const snap = await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fsGet(col, id) {
  const snap = await clinicaDoc(col, id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function fsCreate(col, data) {
  const ref = await clinicaCol(col).add({ ...data, creadoEn: firebase.firestore.FieldValue.serverTimestamp(), actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() });
  return ref.id;
}

async function fsUpdate(col, id, data) {
  await clinicaDoc(col, id).update({ ...data, actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() });
}

async function fsDelete(col, id) {
  await clinicaDoc(col, id).delete();
}

async function fsSet(col, id, data) {
  await clinicaDoc(col, id).set({ ...data, actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

// ── FORMAT HELPERS ────────────────────────────────────────────
function fmtMXN(n) {
  return '$' + Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function fmtDateLong(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function fmtDateInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
// Usa la zona horaria local del navegador (no UTC)
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function IVA(n)    { return Number(n||0)*0.16; }
function conIVA(n) { return Number(n||0)*1.16; }

// ── TOAST ────────────────────────────────────────────────────
function showToast(msg, type='success') {
  let el = document.getElementById('_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  const icons = {success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 3500);
}

// ── WHATSAPP ─────────────────────────────────────────────────
function whatsapp(tel, msg) {
  const num = (tel||'').replace(/\D/g,'');
  const full = num.startsWith('52') ? num : '52'+num;
  window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── MODAL HELPERS ────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open');  }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open')); }
// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeAllModals();
});
// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});

// ── CONFIRM DIALOG ────────────────────────────────────────────
function confirmDialog(msg) {
  return new Promise(resolve => {
    // Use native confirm for now (can be replaced with custom)
    resolve(window.confirm(msg));
  });
}

// ── PLAN GUARD ────────────────────────────────────────────────
function hasFeature(feat) {
  if (!SESSION) return false;
  // Admin siempre tiene acceso a todo
  if (SESSION.user.rol === 'admin') return true;
  // Para otros roles verificar plan actual
  const planKey = SESSION.clinica.plan || 'basico';
  const plan = PLANES[planKey] || PLANES.basico;
  return plan.features.includes(feat);
}

function showUpgradeBanner(feat) {
  const map = {
    metricas:'Profesional', odontograma:'Profesional', inventario:'Profesional',
    reportes:'Profesional', usuarios:'Profesional', 'kpi-avanzado':'Premium', multisucursal:'Premium'
  };
  const needed = map[feat] || 'Profesional';
  showToast(`Esta función requiere el plan ${needed}`, 'warning');
}

// ── LOADING HELPERS ───────────────────────────────────────────
function showLoader(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="loader"><div class="spinner"></div>Cargando...</div>`;
}
function showEmpty(containerId, icon, title, sub) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}

// ── EXPORT: make everything global ───────────────────────────
window.SESSION = SESSION;
window.PLANES  = PLANES;
window.ROLES   = ROLES;
window.db      = db;
window.auth    = auth;
window.initSession = initSession;
window.logout  = logout;
window.clinicaCol = clinicaCol;
window.clinicaDoc = clinicaDoc;
window.fsGetAll   = fsGetAll;
window.fsGet      = fsGet;
window.fsCreate   = fsCreate;
window.fsUpdate   = fsUpdate;
window.fsDelete   = fsDelete;
window.fsSet      = fsSet;
window.fmtMXN     = fmtMXN;
window.fmtDate    = fmtDate;
window.fmtDateLong= fmtDateLong;
window.fmtDateInput = fmtDateInput;
window.todayISO   = todayISO;
window.IVA        = IVA;
window.conIVA     = conIVA;
window.showToast  = showToast;
window.whatsapp   = whatsapp;
window.openModal  = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.confirmDialog  = confirmDialog;
window.hasFeature = hasFeature;
window.showUpgradeBanner = showUpgradeBanner;
window.showLoader = showLoader;
window.showEmpty  = showEmpty;
