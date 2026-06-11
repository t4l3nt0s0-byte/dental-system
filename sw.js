// ══════════════════════════════════════════════════════════════
// HERSANTYCH — SERVICE WORKER
// Estrategia: App Shell + Cache First para recursos estáticos
//             Network First para datos de Firebase
//             Offline fallback cuando no hay red
// ══════════════════════════════════════════════════════════════

const VERSION     = 'hersantych-v2.0'; // migration to organizations/
const CACHE_SHELL = VERSION + '-shell';
const CACHE_PAGES = VERSION + '-pages';

// ── App Shell — siempre en caché ─────────────────────────────
// Estos archivos se cachean al instalar el SW
const SHELL_FILES = [
  '/dental-system/',
  '/dental-system/index.html',
  '/dental-system/shared.js',
  '/dental-system/dataService.js',
  '/dental-system/shared.css',
  '/dental-system/favicon.svg',
  '/dental-system/manifest.json',
  '/dental-system/offline.html',
];

// ── Páginas principales — cache after visit ──────────────────
const MAIN_PAGES = [
  '/dental-system/agenda.html',
  '/dental-system/pacientes.html',
  '/dental-system/expediente.html',
  '/dental-system/tratamientos.html',
  '/dental-system/abonos.html',
  '/dental-system/metricas.html',
  '/dental-system/configuracion.html',
];

// ── URLs que NUNCA van a caché (Firebase, APIs) ──────────────
const NETWORK_ONLY = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseapp.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ─────────────────────────────────────────────────────────────
// INSTALL — cachear el App Shell
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing', VERSION);
  event.waitUntil(
    caches.open(CACHE_SHELL).then(cache => {
      console.log('[SW] Caching App Shell');
      return cache.addAll(SHELL_FILES).catch(err => {
        console.warn('[SW] Shell cache partial fail:', err.message);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────────────────────
// ACTIVATE — limpiar cachés viejas
// ─────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating', VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('hersantych-') && !key.startsWith(VERSION))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────
// FETCH — estrategia por tipo de recurso
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Network Only: Firebase y CDNs externos
  if (NETWORK_ONLY.some(domain => url.includes(domain))) {
    return; // dejar pasar al navegador sin interceptar
  }

  // 2. Solo interceptar GET
  if (event.request.method !== 'GET') return;

  // 3. Solo interceptar nuestro origin
  if (!url.startsWith(self.location.origin)) return;

  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  const url = request.url;

  // ── Cache First: App Shell (shared.js, shared.css, etc.) ──
  if (isShellFile(url)) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fetchAndCache(request, CACHE_SHELL);
  }

  // ── Network First: páginas HTML ───────────────────────────
  if (url.endsWith('.html') || url.endsWith('/')) {
    try {
      const response = await fetchAndCache(request, CACHE_PAGES);
      return response;
    } catch(e) {
      // Sin red → devolver caché o página offline
      const cached = await caches.match(request);
      if (cached) return cached;
      return caches.match('/dental-system/offline.html');
    }
  }

  // ── Stale While Revalidate: otros recursos ────────────────
  const cached = await caches.match(request);
  if (cached) {
    // Devolver caché inmediatamente Y actualizar en background
    fetchAndCache(request, CACHE_PAGES).catch(() => {});
    return cached;
  }

  try {
    return await fetchAndCache(request, CACHE_PAGES);
  } catch(e) {
    return caches.match('/dental-system/offline.html');
  }
}

function isShellFile(url) {
  return SHELL_FILES.some(f => url.includes(f.replace('/dental-system','')));
}

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response && response.status === 200 && response.type !== 'opaque') {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// ─────────────────────────────────────────────────────────────
// PUSH — notificaciones push (preparado para FCM)
// ─────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Hersantych', {
        body:    data.body    || '',
        icon:    data.icon    || '/dental-system/favicon.svg',
        badge:   data.badge   || '/dental-system/favicon.svg',
        tag:     data.tag     || 'hersantych-notif',
        data:    data.url     || '/dental-system/index.html',
        actions: data.actions || [],
        vibrate: [200, 100, 200],
      })
    );
  } catch(e) {
    self.registration.showNotification('Hersantych', { body: event.data.text() });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data || '/dental-system/index.html';
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(windows => {
      for (const w of windows) {
        if (w.url === url && 'focus' in w) return w.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ─────────────────────────────────────────────────────────────
// BACKGROUND SYNC — sincronizar datos cuando vuelva la red
// ─────────────────────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending') {
    console.log('[SW] Background sync triggered');
    // En el futuro: reenviar requests que fallaron sin red
  }
});

console.log('[SW] Service Worker loaded:', VERSION);
