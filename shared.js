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
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','multisucursal','kpi-avanzado'],
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
        // Plan feature guard — admin siempre pasa, otros usuarios verifican plan
        if (requiredFeature && requiredFeature !== 'any') {
          const isAdmin = uData.rol === 'admin';
          if (!isAdmin) {
            const planKey = cSnap.data()?.plan || 'basico';
            const plan = PLANES[planKey] || PLANES.basico;
            if (!plan.features.includes(requiredFeature)) {
              window.location.href = `upgrade.html?feat=${requiredFeature}`;
              resolve(null); return;
            }
          }
        }
        // Render sidebar
        renderSidebar();
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
      <div class="logo-icon">🦷</div>
      <div>
        <div class="logo-text">Hersantych<span> Dental</span></div>
        <div class="logo-sub">Sistema integral</div>
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
    ${navItem('ofertas','🎁','Ofertas & Promos','ofertas')}
    ${navItem('metricas','📈','Métricas','metricas')}
    ${navItem('reportes','📊','Reportes','reportes')}
    <div class="nav-section">Sistema</div>
    ${navItem('usuarios','👥','Usuarios & Roles','usuarios')}
    ${navItem('busqueda','🔍','Búsqueda Global','any')}
  </nav>
  <div class="sidebar-footer">
    <div class="clinic-name">${clinica.nombre || 'Consultorio'}</div>
    <div class="clinic-info">${user.nombre || user.email} · ${ROLES[user.rol]?.label || 'Usuario'}</div>
    <span class="plan-badge" style="background:${plan.color}22;color:${plan.color};border:1px solid ${plan.color}44">${plan.nombre}</span>
    <br><button onclick="logout()" style="background:none;border:none;color:var(--text-dim);font-size:.7rem;cursor:pointer;margin-top:6px;padding:0">🚪 Cerrar sesión</button>
  </div>`;

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.innerHTML = html;

  // Mobile hamburger
  const ham = document.getElementById('hamburger');
  if (ham) {
    ham.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
  // Close sidebar on nav click (mobile)
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 900) sidebar.classList.remove('open');
    });
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
