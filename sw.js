// ══════════════════════════════════════════════════════════════
// HERSANTYCH — SERVICE WORKER v2.1
// 
// ESTRATEGIA SIMPLIFICADA:
//   HTML pages  → NUNCA se cachean (siempre frescos de la red)
//   JS/CSS/SVG  → Cache First (cambian solo cuando cambia la versión)
//   Firebase    → NUNCA interceptado (datos en tiempo real)
//   Sin red     → offline.html para HTML, caché para JS/CSS
// ══════════════════════════════════════════════════════════════

const VERSION     = 'hersantych-v2.1';
const CACHE_SHELL = VERSION + '-shell';

// Solo cacheamos los archivos de código estático
// Los HTML NUNCA van al caché — así siempre están frescos
const SHELL_FILES = [
  '/dental-system/shared.js',
  '/dental-system/dataService.js',
  '/dental-system/shared.css',
  '/dental-system/favicon.svg',
  '/dental-system/favicon.ico',
  '/dental-system/manifest.json',
  '/dental-system/offline.html',
];

// URLs que NUNCA se interceptan (Firebase, CDNs)
const BYPASS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseapp.com',
  'googleapis.com',
  'gstatic.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing', VERSION);
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(SHELL_FILES).catch(e => {
        console.warn('[SW] Shell cache partial fail:', e.message);
      }))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — limpia cachés viejas ─────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating', VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('hersantych-') && k !== CACHE_SHELL)
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (event.request.method !== 'GET') return;
  if (!url.startsWith(self.location.origin)) return;
  if (BYPASS.some(d => url.includes(d))) return;

  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  const url = request.url;

  // ── HTML pages: SIEMPRE de la red, nunca del caché ─────────
  // Esto garantiza que la página esté siempre actualizada
  if (url.endsWith('.html') || url.endsWith('/')) {
    try {
      const response = await fetch(request);
      return response;
    } catch(e) {
      // Sin red: mostrar página offline
      const cached = await caches.match('/dental-system/offline.html');
      return cached || new Response('Sin conexión', { status: 503 });
    }
  }

  // ── JS/CSS/Imágenes: Cache First ────────────────────────────
  // Primero busca en caché, si no está lo descarga
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_SHELL);
      cache.put(request, response.clone());
    }
    return response;
  } catch(e) {
    return new Response('', { status: 503 });
  }
}

// ── PUSH NOTIFICATIONS (preparado para FCM) ─────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Hersantych', {
        body:    data.body || '',
        icon:    '/dental-system/favicon.svg',
        badge:   '/dental-system/favicon.svg',
        tag:     data.tag || 'hersantych',
        data:    data.url || '/dental-system/index.html',
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
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windows => {
        for (const w of windows) {
          if (w.url === url && 'focus' in w) return w.focus();
        }
        return clients.openWindow(url);
      })
  );
});

console.log('[SW] Service Worker loaded:', VERSION);
