// shared.js — Hersantych Dental · Shared UI + Firebase helpers (no-module version for inline use)
// This file is loaded as a regular script tag and exposes globals via window

// ── Firebase CDN (loaded from HTML) ──────────────────────────
// All pages must include these script tags before shared.js:
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>

const FIREBASE_CONFIG = {
  apiKey:"AIzaSyA4KnJ9y0bbdbwrnd62K5QhZdiMC5-_EV8",
  authDomain:"dental-add.firebaseapp.com",
  projectId:"dental-add",
  storageBucket:"dental-add.firebasestorage.app",
  messagingSenderId:"1350878692",
  appId:"1:1350878692:web:1b11da0a68054d9f2bf3f1"
};

// Initialize Firebase (compat mode — no import needed)
if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.firestore();
const auth = firebase.auth();

// ── PLAN DEFINITIONS ─────────────────────────────────────────
const PLANES = {
  basico: {
    nombre:'Básico', color:'#4A9EFF', maxPacientes:50, maxUsuarios:1,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda'],
  },
  profesional: {
    nombre:'Profesional', color:'#00C2A8', maxPacientes:Infinity, maxUsuarios:5,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios'],
  },
  premium: {
    nombre:'Premium', color:'#F4B942', maxPacientes:Infinity, maxUsuarios:Infinity,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','multisucursal','kpi-avanzado','expediente'],
  }
};

const ROLES = {
  admin:     { label:'Administrador', permisos:['all'] },
  doctor:    { label:'Doctor',        permisos:['agenda','pacientes','tratamientos','odontograma'] },
  recepcion: { label:'Recepción',     permisos:['agenda','pacientes','cotizacion','abonos'] },
  asistente: { label:'Asistente',     permisos:['agenda','pacientes'] },
};

// ── SESSION ───────────────────────────────────────────────────
let SESSION = null; // { user, clinica }

// Plan TRIAL — funciones permitidas en prueba
const TRIAL_FEATURES = ['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','recibo','estado-cuenta'];

// Aplicar tema guardado inmediatamente al cargar la página
(function applyStoredTheme() {
  const t = localStorage.getItem('dental_tema');
  const c = localStorage.getItem('dental_color');
  if (!t && !c) return;
  const root = document.documentElement;
  if (t === 'light') {
    root.style.setProperty('--bg',           '#f8fafc');
    root.style.setProperty('--surface',      '#ffffff');
    root.style.setProperty('--surface2',     '#f0f4f8');
    root.style.setProperty('--border',       'rgba(0,0,0,.08)');
    root.style.setProperty('--border2',      'rgba(0,0,0,.15)');
    root.style.setProperty('--text',         '#111827');
    root.style.setProperty('--text-muted',   'rgba(17,24,39,.55)');
    root.style.setProperty('--text-dim',     'rgba(17,24,39,.3)');
    // Sidebar y topbar en modo claro
    root.style.setProperty('--sidebar-bg',   '#ffffff');
    root.style.setProperty('--topbar-bg',    'rgba(255,255,255,.95)');
    document.body && (document.body.style.background = '#f8fafc');
  } else {
    // Restaurar modo oscuro
    root.style.setProperty('--bg',           '#060D14');
    root.style.setProperty('--surface',      '#0C1622');
    root.style.setProperty('--surface2',     '#111E2E');
    root.style.setProperty('--border',       'rgba(255,255,255,.07)');
    root.style.setProperty('--border2',      'rgba(255,255,255,.12)');
    root.style.setProperty('--text',         '#E8F0F8');
    root.style.setProperty('--text-muted',   'rgba(232,240,248,.50)');
    root.style.setProperty('--text-dim',     'rgba(232,240,248,.25)');
    root.style.setProperty('--sidebar-bg',   '#0A1628');
    root.style.setProperty('--topbar-bg',    'rgba(6,13,20,.92)');
    document.body && (document.body.style.background = '#060D14');
  }
  if (c) {
    const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);
    root.style.setProperty('--teal',      c);
    root.style.setProperty('--teal-dim',  `rgba(${r},${g},${b},.12)`);
    root.style.setProperty('--teal-glow', `rgba(${r},${g},${b},.25)`);
  }
})();

// Banner de trial en la parte inferior
function showTrialBannerIfNeeded() {
  if (!SESSION) return;
  const clinica = SESSION.clinica;
  if (clinica.plan !== 'trial') return;
  const trialEnd = clinica.trialEnd?.toDate ? clinica.trialEnd.toDate() : null;
  if (!trialEnd) return;
  const dias = Math.ceil((trialEnd - new Date()) / 86400000);
  let banner = document.getElementById('_trial_banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = '_trial_banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:300;background:linear-gradient(135deg,rgba(244,185,66,.97),rgba(255,154,60,.97));color:#060D14;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:\'DM Sans\',sans-serif;font-size:.82rem;font-weight:600;box-shadow:0 -4px 20px rgba(244,185,66,.3);';
    document.body.appendChild(banner);
    const main = document.querySelector('.main');
    if (main) main.style.paddingBottom = '52px';
  }
  const txt = dias > 0
    ? `⏳ Período de prueba · <strong>${dias} día${dias!==1?'s':''} restante${dias!==1?'s':''}</strong> · Activa un plan para continuar`
    : `⚠️ <strong>Tu período de prueba terminó.</strong> Activa un plan para seguir usando el sistema.`;
  banner.innerHTML = `<div>${txt}</div><a href="planes.html" style="background:#060D14;color:#F4B942;padding:6px 16px;border-radius:6px;font-size:.78rem;font-weight:700;text-decoration:none;flex-shrink:0;white-space:nowrap">💎 Ver planes →</a>`;
}

async function initSession(requiredFeature) {
  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) { window.location.href = 'login.html'; resolve(null); return; }
      try {
        const uSnap = await db.collection('usuarios').doc(user.uid).get();
        if (!uSnap.exists) { auth.signOut(); window.location.href = 'login.html'; resolve(null); return; }
        const uData = uSnap.data();
        if (uData.activo === false) { auth.signOut(); window.location.href = 'login.html'; resolve(null); return; }
        const cSnap = await db.collection('clinicas').doc(uData.clinicaId).get();
        SESSION = { user: { uid: user.uid, email: user.email, ...uData }, clinica: { id: uData.clinicaId, ...cSnap.data() } };
        // ── TRIAL: verificar expiración ────────────────────
        const cData = cSnap.data() || {};
        if (cData.plan === 'trial' && cData.trialEnd) {
          const trialEndDate = cData.trialEnd.toDate ? cData.trialEnd.toDate() : new Date(cData.trialEnd);
          const diasRestantes = Math.ceil((trialEndDate - new Date()) / 86400000);
          if (diasRestantes <= 0) {
            const allowed = ['planes','configuracion'];
            const curPage = window.CURRENT_PAGE || '';
            if (!allowed.includes(curPage)) {
              window.location.href = 'planes.html?expired=1';
              resolve(null); return;
            }
          }
        }
        // ── PLAN FEATURE GUARD ─────────────────────────────
        if (requiredFeature && requiredFeature !== 'any') {
          const isAdmin = uData.rol === 'admin';
          if (!isAdmin) {
            const planKey = cSnap.data()?.plan || 'basico';
            const feats = planKey === 'trial'
              ? TRIAL_FEATURES
              : (PLANES[planKey] || PLANES.basico).features;
            if (!feats.includes(requiredFeature)) {
              window.location.href = `upgrade.html?feat=${requiredFeature}`;
              resolve(null); return;
            }
          }
        }
        // Render sidebar
        renderSidebar();
        showTrialBannerIfNeeded();
        resolve(SESSION);
      } catch(e) { console.error('Session error:', e); resolve(null); }
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
      ${clinica.logoBase64
        ? `<img src="${clinica.logoBase64}" style="width:36px;height:36px;border-radius:8px;object-fit:contain;background:#fff;padding:3px;flex-shrink:0">`
        : '<div class="logo-icon">🦷</div>'}
      <div style="min-width:0">
        <div class="logo-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${clinica.nombre || 'DentalOS'}</div>
        <div class="logo-sub">${clinica.eslogan || 'Sistema integral'}</div>
      </div>
    </div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section">Principal</div>
    ${navItem('index','📊','Inicio','any')}
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
    ${navItem('configuracion','⚙️','Configuración','any')}
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
  await auth.signOut();
  window.location.href = 'login.html';
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
  return d.toISOString().slice(0,10);
}
function todayISO() { return new Date().toISOString().slice(0,10); }
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
