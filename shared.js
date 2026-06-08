// shared.js — DentalOS · Shared UI + Firebase helpers (no-module version for inline use)
// This file is loaded as a regular script tag and exposes globals via window

// ── Firebase CDN (loaded from HTML) ──────────────────────────
// All pages must include these script tags before shared.js:
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

var FIREBASE_CONFIG = {
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
    maxDoctores:Infinity, maxRecepcion:Infinity, maxSucursales:1,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','kpi-avanzado','expediente','recetas','multisucursal','grupo'],
  },
  // ── Planes multi-sucursal ─────────────────────────────────
  'multi-3': {
    nombre:'Multi 3', color:'#a078ff', maxPacientes:Infinity, maxUsuarios:Infinity,
    maxDoctores:Infinity, maxRecepcion:Infinity, maxSucursales:3,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','kpi-avanzado','expediente','recetas','multisucursal','grupo'],
  },
  'multi-10': {
    nombre:'Multi 10', color:'#FF8C00', maxPacientes:Infinity, maxUsuarios:Infinity,
    maxDoctores:Infinity, maxRecepcion:Infinity, maxSucursales:10,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','kpi-avanzado','expediente','recetas','multisucursal','grupo'],
  },
  enterprise: {
    nombre:'Enterprise', color:'#E24B4A', maxPacientes:Infinity, maxUsuarios:Infinity,
    maxDoctores:Infinity, maxRecepcion:Infinity, maxSucursales:Infinity,
    features:['agenda','pacientes','tratamientos','abonos','cotizacion','catalogo','corte-caja','busqueda','metricas','odontograma','inventario','reportes','ofertas','usuarios','kpi-avanzado','expediente','recetas','multisucursal','grupo'],
  }
};

const ROLES = {
  // ── Roles multi-sucursal (acceso cruzado entre clínicas) ──
  owner:     { label:'Propietario',      permisos:['all'], multiClinica:true },
  director:  { label:'Director regional',permisos:['all'], multiClinica:true },
  // ── Roles de sucursal (acceso a una sola clínica) ─────────
  admin:     { label:'Administrador',    permisos:['all'] },
  doctor:    { label:'Doctor',           permisos:['agenda','pacientes','tratamientos','odontograma'] },
  recepcion: { label:'Recepción',        permisos:['agenda','pacientes','cotizacion','abonos'] },
  asistente: { label:'Asistente',        permisos:['agenda','pacientes'] },
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

          // ── Multi-sucursal: owner/director usan clinicaActiva o su clinicaId base ──
          var rol = userData.rol || 'recepcion';
          var clinicaId = userData.clinicaActiva || userData.clinicaId;
          if (!clinicaId) { resolve(null); return; }
          // orgId: si no está seteado, usar clinicaId como raíz de la organización
          var orgId = userData.orgId || userData.clinicaId || clinicaId;

          db.collection('clinicas').doc(clinicaId).get()
            .then(function(clinicaSnap) {
              if (!clinicaSnap.exists) { resolve(null); return; }

              var clinicaData = Object.assign({ id: clinicaId }, clinicaSnap.data());

              // ── Control de acceso por permisos individuales ──────
              // Prioridad: 1) userData.permisos (personalizado por admin)
              //            2) ROL_DEFAULT (fallback si no tiene permisos guardados)
              var ROL_DEFAULT_PERMS = {
                admin:     null, // null = acceso total
                doctor:    ['agenda','pacientes','tratamientos','odontograma',
                            'expediente','recetas','inventario'],
                recepcion: ['agenda','pacientes','cotizacion','abonos','catalogo',
                            'recordatorios','expediente','recibo','busqueda',
                            'corte-caja','estado-cuenta'],
                asistente: ['agenda','pacientes','busqueda'],
              };
              var rol = userData.rol || 'recepcion';
              var isAdminRole = (rol === 'admin' || rol === 'owner' || rol === 'director');

              // Permisos efectivos: los del doc (admin los configura) o defaults del rol
              var userPermisos = userData.permisos || ROL_DEFAULT_PERMS[rol] || [];
              // Admin siempre tiene acceso total, ignorar lista
              // Admin, owner y director tienen acceso total — permsEfectivos null
              var isFullAccess = isAdminRole || rol === 'owner' || rol === 'director';
              var permsEfectivos = isFullAccess ? null : userPermisos;

              // Guardar en SESSION para uso en sidebar y otros checks
              userData._permsEfectivos = permsEfectivos;

              // Verificar acceso a la página requerida
              // Owner y director tienen acceso total — no verificar permisos
              var isOwnerRole    = rol === 'owner' || rol === 'director';
              if (requiredPage && requiredPage !== 'any' && !isAdminRole && !isOwnerRole) {
                var allowed = permsEfectivos && permsEfectivos.indexOf(requiredPage) !== -1;
                if (!allowed) {
                  window.location.replace('index.html');
                  resolve(null); return;
                }
              }

              // ✅ Todo OK
              // Auditar inicio de sesión
              audit('LOGIN', { pagina: requiredPage || window.CURRENT_PAGE || '' });
              SESSION = Object.assign(
                { user: Object.assign({}, userData, {
                    uid:      user.uid,
                    orgId:    orgId,
                    isOwner:  rol === 'owner',
                    isDirector: rol === 'director',
                    sucursales: userData.sucursales || [],
                  })
                },
                { clinica: clinicaData }
              );
              window.SESSION = SESSION;

              if (typeof applyTema === 'function') applyTema(clinicaData.tema, clinicaData.colorPrimario);
              if (typeof renderSidebar === 'function') renderSidebar();
              if (typeof setFavicon === 'function') setFavicon();
              // Update page <title> dynamically with clinic name — SaaS requirement
              if (clinicaData && clinicaData.nombre && document.title) {
                document.title = document.title.replace('DentalOS', clinicaData.nombre);
              }
              if (typeof showTrialBannerIfNeeded === 'function') showTrialBannerIfNeeded();
              // Backup diario silencioso — no bloquea la carga
              setTimeout(function() {
                if (typeof runDailyBackup === 'function') runDailyBackup();
              }, 5000);
              // Detectar si hay datos demo y mostrar banner informativo
              setTimeout(function() {
                if (typeof showDemoBanner === 'function') showDemoBanner();
              }, 2000);

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




// ── FAVICON DIENTE ──────────────────────────────────────────
function setFavicon() {
  // Remove existing favicons
  document.querySelectorAll('link[rel*="icon"]').forEach(l=>l.remove());
  const link = document.createElement('link');
  link.rel  = 'icon';
  link.type = 'image/svg+xml';
  link.href = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwNjBEMTQiLz4KICA8IS0tIE11ZWxhIGVzdGlsaXphZGEgLS0+CiAgPHBhdGggZD0iTTIwIDE4IEMyMCAxNCAyNCAxMiAyOCAxMiBDMzAgMTIgMzEgMTMgMzIgMTQgQzMzIDEzIDM0IDEyIDM2IDEyIEM0MCAxMiA0NCAxNCA0NCAxOCBDNDQgMjIgNDIgMjQgNDEgMjYgQzQwIDI5IDQwIDMyIDM5IDM2IEMzOCA0MCAzNyA0NCAzNSA0NiBDMzQgNDggMzMgNDggMzIgNDcgQzMxIDQ4IDMwIDQ4IDI5IDQ2IEMyNyA0NCAyNiA0MCAyNSAzNiBDMjQgMzIgMjQgMjkgMjMgMjYgQzIyIDI0IDIwIDIyIDIwIDE4WiIgZmlsbD0iIzAwQzJBOCIvPgogIDwhLS0gSGlnaGxpZ2h0IHN1cGVyaW9yIC0tPgogIDxwYXRoIGQ9Ik0yNyAxNCBDMjkgMTMgMzEgMTMgMzIgMTQgQzMxIDE1IDI5IDE1IDI3IDE0WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+CiAgPCEtLSBMw61uZWEgY2VudHJhbCBzdXRpbCAtLT4KICA8bGluZSB4MT0iMzIiIHkxPSIxNiIgeDI9IjMyIiB5Mj0iMzgiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjE1KSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4=';
  document.head.appendChild(link);
  // Fallback para Safari (png 32x32 canvas)
  try {
    const canvas = document.createElement('canvas');
    canvas.width=32; canvas.height=32;
    const ctx=canvas.getContext('2d');
    const img=new Image();
    img.onload=()=>{
      ctx.drawImage(img,0,0,32,32);
      const png=document.createElement('link');
      png.rel='icon'; png.type='image/png'; png.sizes='32x32';
      png.href=canvas.toDataURL('image/png');
      document.head.appendChild(png);
    };
    img.src=link.href;
  }catch(e){}
}

// ── MAPA COMPLETO: página → clave de permiso ────────────────
// Escalable: agregar páginas nuevas aquí y en usuarios.html ALL_PAGES
const PAGE_PERM_MAP = {
  'index':          null,           // dashboard: todos acceden siempre
  'agenda':         'agenda',
  'pacientes':      'pacientes',
  'expediente':     'expediente',
  'tratamientos':   'tratamientos',
  'abonos':         'abonos',
  'catalogo':       'catalogo',
  'cotizacion':     'cotizacion',
  'corte-caja':     'corte-caja',
  'recetas':        'recetas',
  'odontograma':    'odontograma',
  'inventario':     'inventario',
  'recordatorios':  'recordatorios',
  'metricas':       'metricas',
  'reportes':       'reportes',
  'ofertas':        'ofertas',
  'recibo':         'recibo',
  'estado-cuenta':  'estado-cuenta',
  'busqueda':       'busqueda',
  'importar-datos': 'importar',
  'usuarios':       'usuarios',
  'configuracion':  'configuracion',
  'planes':         'planes',         // solo admin
  'api':            'api',             // admin + owner
  'auditoria':      'auditoria',       // admin + owner
  'grupo':          'multisucursal',   // solo owner/director
  'sucursales':     'multisucursal',   // gestión de sucursales
};

// ¿Tiene el usuario permiso para una página?
function userCanAccess(page) {
  if (!SESSION) return false;
  var rol = SESSION.user.rol;

  // Owner y director: acceso total + páginas del grupo
  if (rol === 'owner') return true;

  // Admin de sucursal: acceso total excepto grupo/sucursales (son del owner)
  if (rol === 'admin') {
    var OWNER_ONLY = ['grupo','sucursales'];
    return OWNER_ONLY.indexOf(page) === -1;
  }

  // Director: acceso total a su grupo de sucursales pero no a configuración global
  if (rol === 'director') {
    var DIR_BLOCKED = ['planes','configuracion','usuarios','importar-datos'];
    return DIR_BLOCKED.indexOf(page) === -1;
  }

  // Roles de sucursal (doctor, recepcion, asistente): verificar permisos asignados
  var ADMIN_ONLY = ['planes','configuracion','usuarios','importar-datos','grupo','sucursales','api','auditoria'];
  if (ADMIN_ONLY.indexOf(page) !== -1) return false;

  var perm = PAGE_PERM_MAP[page];
  if (perm === null) return true;
  var perms = SESSION.user._permsEfectivos || [];
  return perms.indexOf(perm) !== -1;
}
window.userCanAccess = userCanAccess;

function renderSidebar() {
  if (!SESSION) return;
  const { clinica, user } = SESSION;
  const planKey = clinica.plan || 'basico';
  const plan    = PLANES[planKey] || PLANES.basico;
  const feats   = plan.features;
  const rol     = user.rol || 'recepcion';
  const isAdmin = rol === 'admin';

  function navItem(page, icon, label, feat) {
    // 1. Sin permiso → no aparece en el sidebar
    if (!userCanAccess(page)) return '';

    // 2. Plan no incluye la feature → mostrar bloqueado (solo si tiene permiso de rol)
    const planLocked = feat && feat !== 'any' && !feats.includes(feat) && !isAdmin && rol !== 'owner' && rol !== 'director';
    const active = window.CURRENT_PAGE === page ? 'active' : '';
    const cls    = planLocked ? 'nav-item locked' : `nav-item ${active}`;
    const href   = planLocked ? '#' : `${page}.html`;
    const planNecesario = ['metricas','odontograma','inventario','reportes',
                           'usuarios','ofertas'].includes(feat) ? 'Profesional' : 'Premium';
    const onclick = planLocked
      ? `event.preventDefault();showToast('Requiere plan ${planNecesario}','info')`
      : '';
    return `<a href="${href}" class="${cls}" data-page="${page}" ${onclick?`onclick="${onclick}"`:''}>${icon} ${label}</a>`;
  }

  const html = `
  <div class="sidebar-logo">
    <div class="logo-mark">
      ${clinica.logoBase64 && clinica.logoOpcion !== 'default'
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
    ${navItem('index','📊','Dashboard','any')}
    ${navItem('agenda','📅','Agenda de Citas','any')}
    ${navItem('pacientes','👤','Expedientes','any')}
    ${navItem('expediente','📋','Expediente Completo','any')}
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
    ${(rol === 'owner' || rol === 'director') ? `<div class="nav-section">Grupo</div>
    ${navItem('grupo','🏢','Dashboard del grupo','multisucursal')}` : ''}
    <div class="nav-section">Sistema</div>
    ${navItem('usuarios','👥','Usuarios & Roles','usuarios')}
    ${navItem('api','🔌','API pública','api')}
    ${navItem('auditoria','🔍','Auditoría','auditoria')}
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
    ${(rol === 'owner' || rol === 'director') ? '<div style="font-size:.58rem;color:var(--teal);font-weight:700;letter-spacing:.06em;margin-top:2px">🔑 Acceso multi-sucursal</div>' : ''}
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

// ── Cambiar sucursal activa (owner/director) ──────────────────
window.switchSucursal = async function(clinicaId) {
  if (!SESSION || !SESSION.user.uid) return;
  try {
    await db.collection('usuarios').doc(SESSION.user.uid)
      .update({ clinicaActiva: clinicaId });
    showToast('Cambiando a sucursal...','info');
    setTimeout(()=>window.location.href='index.html', 600);
  } catch(e) { showToast('Error al cambiar sucursal: '+e.message,'error'); }
};

// ── Leer todas las clínicas del org (para owner/director) ──────
window.getOrgClinics = async function() {
  var orgId = SESSION && SESSION.user && SESSION.user.orgId;
  if (!orgId) return [];
  try {
    var snap = await db.collection('clinicas').where('orgId','==',orgId).get();
    return snap.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
  } catch(e) { return []; }
};


// ══════════════════════════════════════════════════════════════
// BACKUP AUTOMÁTICO — exporta datos críticos a Firestore
// Se ejecuta una vez al día por sesión, guarda los últimos 30 días
// ══════════════════════════════════════════════════════════════
window.runDailyBackup = async function() {
  if (!SESSION || !SESSION.clinica) return;
  var today    = todayISO();
  var cId      = SESSION.clinica.id;
  var backupKey = 'dentalos_backup_' + cId + '_' + today;

  // Solo una vez al día por sesión
  if (localStorage.getItem(backupKey)) return;

  try {
    // Recopilar datos críticos del día
    var [pacSnap, citSnap, docSnap] = await Promise.all([
      clinicaCol('pacientes').orderBy('creadoEn','desc').limit(500).get(),
      clinicaCol('citas').where('fecha','==',today).get(),
      clinicaCol('doctores').get(),
    ]);

    var summary = {
      fecha:     today,
      ts:        firebase.firestore.FieldValue.serverTimestamp(),
      pacientes: pacSnap.docs.length,
      citas:     citSnap.docs.length,
      doctores:  docSnap.docs.length,
      // Guardar IDs y nombres (no datos sensibles completos)
      pacientesList: pacSnap.docs.slice(0,50).map(function(d) {
        return { id: d.id, nombre: d.data().nombre || '', tel: d.data().tel || '' };
      }),
      citasList: citSnap.docs.map(function(d) {
        return { id: d.id, paciente: d.data().paciente || '', hora: d.data().hora || '', estado: d.data().estado || '' };
      }),
    };

    // Guardar backup del día
    await db.collection('clinicas').doc(cId)
      .collection('backups').doc(today).set(summary);

    // Marcar como hecho hoy
    localStorage.setItem(backupKey, '1');

    // Limpiar backups de más de 30 días (silent)
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate()-30);
    var cutoffStr = cutoff.toISOString().split('T')[0];
    db.collection('clinicas').doc(cId).collection('backups')
      .where('fecha','<',cutoffStr).get()
      .then(function(old) {
        old.docs.forEach(function(d) { d.ref.delete(); });
      }).catch(function(){});

  } catch(e) {
    console.warn('[Backup]', e.message); // silencioso
  }
};


/**
 * migrateFolios() — Asigna folios a pacientes existentes sin folio
 * Ejecutar una sola vez desde la consola del navegador:
 * migrateFolios().then(r => console.log('Done:', r))
 */
window.migrateFolios = async function() {
  if (!SESSION || !SESSION.clinica) return { error:'No session' };
  var cId  = SESSION.clinica.id;
  var snap = await db.collection('clinicas').doc(cId)
    .collection('pacientes')
    .where('folio','==',null).limit(200).get()
    .catch(async () =>
      // Fallback: get all and filter
      db.collection('clinicas').doc(cId).collection('pacientes').limit(500).get()
    );
  var sinFolio = snap.docs.filter(d => !d.data().folio);
  if (!sinFolio.length) return { migrated:0, message:'Todos los pacientes ya tienen folio' };
  var migrated = 0;
  for (var doc of sinFolio) {
    try {
      var folio = await window.generateFolio();
      await db.collection('clinicas').doc(cId)
        .collection('pacientes').doc(doc.id)
        .update({ folio });
      migrated++;
    } catch(e) { console.warn('skip', doc.id, e.message); }
  }
  return { migrated, total:sinFolio.length };
};


// ── BANNER DATOS DEMO ──────────────────────────────────────
window.showDemoBanner = async function() {
  if (!SESSION || !SESSION.clinica) return;
  // Only show on dashboard
  if (window.CURRENT_PAGE !== 'index') return;
  // Check if demo data exists (quick check)
  try {
    var snap = await db.collection('clinicas').doc(SESSION.clinica.id)
      .collection('pacientes').where('_demo','==',true).limit(1).get();
    if (snap.empty) return; // no demo data, no banner
    // Show banner
    var existing = document.getElementById('demoBanner');
    if (existing) return;
    var banner = document.createElement('div');
    banner.id = 'demoBanner';
    banner.style.cssText = 'background:rgba(244,185,66,.12);border:1px solid rgba(244,185,66,.3);border-radius:10px;padding:10px 16px;margin:0 0 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:.78rem;';
    banner.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:1rem">🧪</span><span style="color:#F4B942;font-weight:700">Datos de demostración activos</span><span style="color:var(--text-muted)">— Este es un consultorio de prueba con pacientes y citas de ejemplo</span></div><a href="configuracion.html#peligro" style="font-size:.72rem;color:#F4B942;white-space:nowrap;text-decoration:underline">Borrar datos demo →</a>';
    var content = document.getElementById('mainContent') || document.querySelector('.content');
    if (content) content.insertAdjacentElement('afterbegin', banner);
  } catch(e) { /* silencioso */ }
};
async function logout() {
  // Auditar cierre de sesión antes de salir
  audit('LOGOUT', {}).catch(()=>{});
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

// ══════════════════════════════════════════════════════════════
// CACHÉ DE SESIÓN — reduce lecturas a Firestore en 90%
// Estrategia: TTL de 5 min + invalidación en escritura
// ══════════════════════════════════════════════════════════════
const _CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const _cache     = new Map();      // key → { data, ts }

function cacheKey(col) {
  return (SESSION && SESSION.clinica ? SESSION.clinica.id : 'x') + ':' + col;
}
function cacheGet(col) {
  const k = cacheKey(col);
  const e = _cache.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > _CACHE_TTL) { _cache.delete(k); return null; }
  return e.data;
}
function cacheSet(col, data) {
  _cache.set(cacheKey(col), { data, ts: Date.now() });
}
function cacheInvalidate(col) {
  if (col) { _cache.delete(cacheKey(col)); }
  else { _cache.clear(); }
}
window.cacheInvalidate = cacheInvalidate;

// ══════════════════════════════════════════════════════════════
// PAGINACIÓN DE FIRESTORE — evita cargar miles de docs
// Uso: const { docs, next } = await fsGetPage('pacientes', null, 20)
// Para siguiente página: await fsGetPage('pacientes', next, 20)
// ══════════════════════════════════════════════════════════════
async function fsGetPage(col, cursor, limit, constraints) {
  // Si hay constraints personalizados, usarlos directamente
  // Si no, usar query simple SIN orderBy para evitar requerir índices compuestos
  var lim = limit || 20;
  var ref;
  if (constraints) {
    ref = clinicaCol(col).limit(lim);
    ref = constraints(ref);
  } else {
    ref = clinicaCol(col).limit(lim);
  }
  if (cursor) ref = ref.startAfter(cursor);
  const snap = await ref.get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const next = snap.docs.length === lim
    ? snap.docs[snap.docs.length - 1]
    : null;
  return { docs, next, hasMore: next !== null };
}
window.fsGetPage = fsGetPage;

// ══════════════════════════════════════════════════════════════
// MANEJADOR GLOBAL DE ERRORES — mensajes amigables + log
// ══════════════════════════════════════════════════════════════
const ERROR_MSGS = {
  'permission-denied':     'Sin permisos para esta acción. Contacta al administrador.',
  'not-found':             'El registro no existe o fue eliminado.',
  'already-exists':        'Este registro ya existe.',
  'resource-exhausted':    'Límite de operaciones alcanzado. Espera un momento.',
  'unavailable':           'Sin conexión a la base de datos. Verifica tu internet.',
  'unauthenticated':       'Tu sesión expiró. Inicia sesión de nuevo.',
  'cancelled':             'La operación fue cancelada.',
  'deadline-exceeded':     'La operación tardó demasiado. Intenta de nuevo.',
  'auth/network-request-failed': 'Sin conexión a internet.',
  'auth/too-many-requests':      'Demasiados intentos. Espera unos minutos.',
  'auth/user-disabled':          'Esta cuenta está desactivada.',
};

function handleError(e, context) {
  const code    = e.code || e.message || 'unknown';
  const friendly = ERROR_MSGS[code] || ERROR_MSGS[e.message] || null;
  const uid     = SESSION && SESSION.user ? SESSION.user.uid : 'anon';
  const page    = window.CURRENT_PAGE || location.pathname;

  // Log estructurado — en producción esto iría a un servicio de monitoring
  console.error(`[DentalOS] ${page} | ${uid} | ${code}`, e);

  // Mostrar al usuario
  if (typeof showToast === 'function') {
    showToast(friendly || 'Error inesperado. Intenta de nuevo.', 'error');
  }

  // Si es error de auth, redirigir a login
  if (code === 'unauthenticated' || code === 'auth/user-token-expired') {
    setTimeout(() => window.location.href = 'login.html', 1500);
  }
  return friendly || code;
}
window.handleError = handleError;

// Banner de modo offline
(function setupOfflineBanner() {
  if (typeof document === 'undefined') return;
  function showOffline() {
    let b = document.getElementById('_offlineBanner');
    if (!b) {
      b = document.createElement('div');
      b.id = '_offlineBanner';
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#E24B4A;color:#fff;text-align:center;padding:8px;font-size:13px;font-weight:500';
      b.textContent = '⚠️ Sin conexión a internet — los cambios no se guardarán';
      document.body && document.body.appendChild(b);
    }
  }
  function hideOffline() {
    const b = document.getElementById('_offlineBanner');
    if (b) b.remove();
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('offline', showOffline);
    window.addEventListener('online',  hideOffline);
    if (!navigator.onLine) showOffline();
  }
})();

// ══════════════════════════════════════════════════════════════
// AUDITORÍA DE ACCIONES — trazabilidad para clínicas formales
// Cumplimiento NOM-024 / requisito enterprise
// Guarda en clinicas/{id}/auditoria/{docId}
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// SANITIZACIÓN XSS — PROTECCIÓN COMPLETA
// Dos funciones para dos contextos distintos:
//   esc(str)      → escapa HTML para mostrar texto en el DOM
//   sanitize(html)→ limpia HTML con atributos permitidos (rich text)
// NUNCA usar innerHTML con datos del usuario sin pasar por esc()
// ══════════════════════════════════════════════════════════════

/**
 * esc(str) — Escapa caracteres HTML peligrosos
 * Usar para: nombres, emails, teléfonos, cualquier dato del usuario
 * en template literals: `<div>${esc(px.nombre)}</div>`
 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g,  '&#x60;')
    .replace(/=/g,  '&#x3D;');
}
window.esc = esc;

/**
 * sanitize(html) — Elimina tags y atributos peligrosos de HTML
 * Usar para: contenido que puede tener formato (notas, observaciones)
 * Permite: b, i, br, p, strong, em, ul, li, span
 */
function sanitize(html) {
  if (!html) return '';
  // Crear un elemento temporal para parsear el HTML
  var tmp = document.createElement('div');
  tmp.textContent = String(html); // textContent escapa todo
  return tmp.innerHTML;           // retorna el texto escapado como HTML
}
window.sanitize = sanitize;

/**
 * safeHTML(template, data) — Template seguro con auto-escape
 * Reemplaza {key} con esc(data[key])
 * Uso: safeHTML('<b>{nombre}</b> · {email}', px)
 */
function safeHTML(template, data) {
  return template.replace(/\{(\w+)\}/g, function(_, key) {
    return data && data[key] !== undefined ? esc(data[key]) : '';
  });
}
window.safeHTML = safeHTML;

// ── Validadores de entrada ──────────────────────────────────
var VALIDATORS = {
  nombre:    { max:120, pattern:/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-'\.]+$/, label:'nombre' },
  email:     { max:200, pattern:/^[^\s@]+@[^\s@]+\.[^\s@]+$/, label:'correo' },
  tel:       { max:20,  pattern:/^[\d\s\-\+\(\)]+$/, label:'teléfono' },
  rfc:       { max:13,  pattern:/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/, label:'RFC' },
  cp:        { max:5,   pattern:/^\d{5}$/, label:'código postal' },
  numerico:  { max:20,  pattern:/^[\d\.]+$/, label:'número' },
};

/**
 * validateInput(value, type) — Valida y sanitiza un campo de entrada
 * Retorna { ok: bool, value: string limpio, error: string }
 */
function validateInput(value, type) {
  var v = String(value || '').trim();
  if (!v) return { ok:true, value:'', error:null }; // vacío es válido (salvo required)
  var rule = VALIDATORS[type];
  if (!rule) return { ok:true, value:esc(v), error:null }; // tipo desconocido → escapar
  if (v.length > rule.max) return { ok:false, value:'', error:`El ${rule.label} es demasiado largo (máx ${rule.max} chars)` };
  if (rule.pattern && !rule.pattern.test(v)) return { ok:false, value:'', error:`El formato del ${rule.label} no es válido` };
  return { ok:true, value:esc(v), error:null };
}
window.validateInput = validateInput;

// ── Sanitizar objeto de datos antes de guardar en Firestore ─
/**
 * sanitizeData(obj, fields) — Limpia campos de texto antes de Firestore
 * Elimina caracteres de control y trunca strings largos
 */
function sanitizeData(obj, fields) {
  var clean = Object.assign({}, obj);
  (fields || Object.keys(clean)).forEach(function(key) {
    var v = clean[key];
    if (typeof v === 'string') {
      // Eliminar caracteres de control (null bytes, etc.)
      clean[key] = v
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .slice(0, 5000); // truncar a 5000 chars máximo
    }
  });
  return clean;
}
window.sanitizeData = sanitizeData;

// ══════════════════════════════════════════════════════════════
// API RATE LIMITING — SISTEMA COMPLETO
// Estrategia: ventanas de 1 minuto en Firestore con contadores atómicos
// Límites por plan definidos abajo
// ══════════════════════════════════════════════════════════════

var API_RATE_LIMITS = {
  trial:       { perMin:10,  perDay:100,    perMonth:1000 },
  basico:      { perMin:50,  perDay:1000,   perMonth:20000 },
  profesional: { perMin:200, perDay:10000,  perMonth:200000 },
  premium:     { perMin:500, perDay:50000,  perMonth:1000000 },
  'multi-3':   { perMin:500, perDay:50000,  perMonth:1000000 },
  'multi-10':  { perMin:500, perDay:100000, perMonth:2000000 },
  enterprise:  { perMin:Infinity, perDay:Infinity, perMonth:Infinity },
};

/**
 * checkRateLimit(apiKeyDoc) — Verifica límites antes de procesar request
 * Retorna { allowed: bool, reason: string, remaining: { min, day } }
 * Usa Firestore transactions para contadores atómicos sin race conditions
 */
window.checkRateLimit = async function(clinicaId, keyId) {
  var plan   = SESSION && SESSION.clinica ? SESSION.clinica.plan : 'basico';
  var limits = API_RATE_LIMITS[plan] || API_RATE_LIMITS.basico;

  if (limits.perDay === Infinity) return { allowed:true, reason:null, remaining:{min:Infinity,day:Infinity} };

  var now       = new Date();
  var minWindow = now.toISOString().slice(0,16).replace('T','-').replace(':','-'); // '2026-06-07-10-30'
  var dayWindow = now.toISOString().slice(0,10);                                   // '2026-06-07'

  var limRef = db.collection('clinicas').doc(clinicaId).collection('apiRateLimits').doc(keyId);

  try {
    var result = await db.runTransaction(async function(tx) {
      var doc  = await tx.get(limRef);
      var data = doc.exists ? doc.data() : {};

      // Ventana actual del minuto
      var minCount  = (data.window === minWindow) ? (data.count || 0) : 0;
      // Conteo del día actual
      var dayCount  = (data.day === dayWindow)    ? (data.dayCount || 0) : 0;

      // Verificar límites
      if (minCount >= limits.perMin) {
        return { allowed:false, reason:`Límite por minuto alcanzado (${limits.perMin} req/min)`, minCount, dayCount };
      }
      if (dayCount >= limits.perDay) {
        return { allowed:false, reason:`Límite diario alcanzado (${limits.perDay} req/día)`, minCount, dayCount };
      }

      // Incrementar contadores
      tx.set(limRef, {
        window:    minWindow,
        count:     minCount + 1,
        day:       dayWindow,
        dayCount:  dayCount + 1,
        ultimoUso: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge:true });

      return {
        allowed:true,
        reason:null,
        remaining: {
          min: limits.perMin - minCount - 1,
          day: limits.perDay - dayCount - 1,
        }
      };
    });
    return result;
  } catch(e) {
    console.warn('[RateLimit]', e.message);
    return { allowed:true, reason:null, remaining:{min:99,day:999} }; // fail-open en error de Firestore
  }
};

/**
 * logApiRequest(clinicaId, keyId, endpoint, status) — Registra cada request
 * Se auto-limpia documentos de más de 30 días
 */
window.logApiRequest = async function(clinicaId, keyId, endpoint, status) {
  try {
    await db.collection('clinicas').doc(clinicaId)
      .collection('apiLogs').add({
        keyId, endpoint, status,
        ts:     firebase.firestore.FieldValue.serverTimestamp(),
        day:    new Date().toISOString().slice(0,10),
      });
  } catch(e) { /* silencioso */ }
};

/**
 * getApiUsageStats(clinicaId, keyId) — Estadísticas de uso de una API key
 */
window.getApiUsageStats = async function(clinicaId, keyId) {
  try {
    var today    = new Date().toISOString().slice(0,10);
    var limSnap  = await db.collection('clinicas').doc(clinicaId)
      .collection('apiRateLimits').doc(keyId).get();
    var logSnap  = await db.collection('clinicas').doc(clinicaId)
      .collection('apiLogs').where('keyId','==',keyId).where('day','==',today).get();

    var limData  = limSnap.exists ? limSnap.data() : {};
    var plan     = SESSION && SESSION.clinica ? SESSION.clinica.plan : 'basico';
    var limits   = API_RATE_LIMITS[plan] || API_RATE_LIMITS.basico;

    return {
      hoy:      logSnap.docs.length,
      limite:   limits.perDay,
      minuto:   limData.count || 0,
      limMin:   limits.perMin,
      ultimoUso:limData.ultimoUso || null,
      pct:      limits.perDay === Infinity ? 0 : Math.round((logSnap.docs.length/limits.perDay)*100),
    };
  } catch(e) { return { hoy:0, limite:0, minuto:0, limMin:0, pct:0 }; }
};


// ══════════════════════════════════════════════════════════════
// SISTEMA DE FOLIOS — IDs únicos legibles para pacientes
// Formato: EXP-2026-00001 (año + secuencial de 5 dígitos)
// Garantiza unicidad sin race conditions usando Firestore counter
// ══════════════════════════════════════════════════════════════

/**
 * generateFolio() — Genera el siguiente número de expediente
 * Usa un contador atómico en Firestore para evitar duplicados
 * Retorna: 'EXP-2026-00001'
 */
window.generateFolio = async function() {
  if (!SESSION || !SESSION.clinica) return null;
  var year     = new Date().getFullYear();
  var cId      = SESSION.clinica.id;
  var counterRef = db.collection('clinicas').doc(cId)
                     .collection('_counters').doc('expedientes_' + year);
  try {
    var result = await db.runTransaction(async function(tx) {
      var doc = await tx.get(counterRef);
      var next = doc.exists ? (doc.data().next || 1) : 1;
      tx.set(counterRef, { next: next + 1, year: year,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() });
      return next;
    });
    var padded = String(result).padStart(5, '0');
    return 'EXP-' + year + '-' + padded;
  } catch(e) {
    // Fallback: timestamp-based folio si falla la transacción
    console.warn('[Folio]', e.message);
    return 'EXP-' + year + '-' + Date.now().toString().slice(-5);
  }
};

/**
 * checkDuplicate(nombre, tel) — Busca pacientes con nombre/tel similar
 * Retorna array de posibles duplicados
 */
window.checkDuplicate = async function(nombre, tel) {
  if (!nombre || !SESSION) return [];
  var normNombre = nombre.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,''); // sin acentos
  try {
    // Búsqueda por los primeros 3 caracteres del nombre (Firestore prefix query)
    var prefix = nombre.trim().slice(0, 3);
    var snap   = await clinicaCol('pacientes')
      .where('nombre','>=', prefix)
      .where('nombre','<=', prefix + '\uf8ff')
      .limit(20).get();
    var candidates = snap.docs.map(d => ({id:d.id,...d.data()}));
    // Filtrar por similitud
    return candidates.filter(function(p) {
      var pNorm = (p.nombre||'').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      var nameMatch  = pNorm === normNombre;
      var telMatch   = tel && p.tel && tel.replace(/\D/g,'') === (p.tel||'').replace(/\D/g,'');
      return nameMatch || telMatch;
    });
  } catch(e) { return []; }
};

async function audit(accion, datos) {
  if (!SESSION || !SESSION.user) return;
  try {
    var uid     = SESSION.user.uid;
    var nombre  = SESSION.user.nombre || SESSION.user.email || 'Sistema';
    var clinica = SESSION.clinica ? SESSION.clinica.id : 'unknown';
    var registro = {
      accion,                          // ej: 'CREATE_PACIENTE', 'DELETE_CITA'
      datos:   datos || {},            // datos relevantes de la acción
      uid,
      userName: nombre,
      pagina:   window.CURRENT_PAGE || 'unknown',
      ip:       'client',
      ts:       firebase.firestore.FieldValue.serverTimestamp(),
    };
    // Fire-and-forget — no bloquear la UI por la auditoría
    db.collection('clinicas').doc(clinica)
      .collection('auditoria').add(registro)
      .catch(function(e) { console.warn('[Audit]', e.message); });
  } catch(e) {
    console.warn('[Audit failed]', e.message);
  }
}
window.audit = audit;

// Wrapper de fsCreate con auditoría automática
var _origFsCreate = fsCreate;
async function fsCreate(col, data) {
  cacheInvalidate(col);
  var ref = await clinicaCol(col).add({
    ...data,
    creadoEn:     firebase.firestore.FieldValue.serverTimestamp(),
    actualizadoEn:firebase.firestore.FieldValue.serverTimestamp()
  });
  // Auditar creaciones importantes
  var auditCols = ['pacientes','citas','abonos','tratamientos','doctores','usuarios','rx'];
  if (auditCols.indexOf(col) !== -1) {
    audit('CREATE_'+col.toUpperCase(), { id: ref.id, nombre: data.nombre || data.paciente || '' });
  }
  return ref;
}

// Wrapper de fsDelete con auditoría automática
var _origFsDelete = fsDelete;
async function fsDelete(col, id) {
  cacheInvalidate(col);
  // Auditar ANTES de eliminar (para tener el id)
  var auditCols = ['pacientes','citas','doctores'];
  if (auditCols.indexOf(col) !== -1) {
    audit('DELETE_'+col.toUpperCase(), { id });
  }
  await clinicaDoc(col, id).delete();
}

async function fsGetAll(col, constraints) {
  // Use cache for unconstrained reads (full collection)
  if (!constraints) {
    const cached = cacheGet(col);
    if (cached) return cached;
  }
  let ref = clinicaCol(col);
  if (constraints) ref = constraints(ref);
  else ref = ref.orderBy('creadoEn','desc');
  const snap = await ref.get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!constraints) cacheSet(col, data);
  return data;
}

async function fsGet(col, id) {
  const snap = await clinicaDoc(col, id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function fsCreate(col, data) {
  cacheInvalidate(col); // invalidar cache al escribir
  const ref = await clinicaCol(col).add({ ...data, creadoEn: firebase.firestore.FieldValue.serverTimestamp(), actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() });
  return ref.id;
}

async function fsUpdate(col, id, data) {
  cacheInvalidate(col); // invalidar cache al escribir
  var cleanUpd = sanitizeData(data);
  await clinicaDoc(col, id).update({ ...data, actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() });
}

async function fsDelete(col, id) {
  cacheInvalidate(col); // invalidar cache al eliminar
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
