/* =========================================================
   PanStock — Service Worker v2 FIXED
   
   Correcciones vs v1:
   - Se agrega handler 'fetch' mínimo (requerido en algunos browsers para
     que showNotification funcione correctamente desde el SW)
   - Se mejora el manejo de errores en el handler 'push'
   - El handler 'notificationclick' navega correctamente sin importar
     si hay ventana abierta o no
   ========================================================= */

const CACHE_NAME  = 'panstock-v2';
const NOTIF_ICON  = '/logo_panstock.png';
const NOTIF_BADGE = '/logo_panstock.png';

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      // Limpiar caches de versiones anteriores
      return caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      );
    })
  );
});

// ── Fetch (mínimo requerido) ─────────────────────────────
// Sin este handler, algunos navegadores no permiten usar
// showNotification() desde el SW correctamente.
self.addEventListener('fetch', (event) => {
  // Pass-through: no interceptamos ninguna request, solo registramos el handler
  // para que el SW sea considerado "activo" por el navegador.
  event.respondWith(fetch(event.request));
});

// ── Push events ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'PanStock', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'PanStock — Alerta de vencimiento';
  const options = {
    body:               data.body    || 'Hay productos próximos a vencer.',
    icon:               NOTIF_ICON,
    badge:              NOTIF_BADGE,
    tag:                data.tag     || 'panstock-expiration',
    renotify:           true,
    requireInteraction: false,
    data: {
      url: data.url || '/expiration',
      ...data,
    },
    actions: [
      { action: 'view',    title: '👀 Ver vencimientos' },
      { action: 'dismiss', title: '✕ Cerrar'           },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/expiration';

  // Construir la URL completa con el origin del SW
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si hay una ventana de la app abierta, enfocarla y navegar
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              client.navigate(fullUrl);
            } else {
              // postMessage como fallback si navigate no está disponible
              client.postMessage({ type: 'NAVIGATE', url: targetUrl });
            }
            return;
          }
        }
        // No hay ventana abierta → abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// ── postMessage desde la app ──────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url } = event.data;
    self.registration
      .showNotification(title || 'PanStock', {
        body:               body    || '',
        icon:               NOTIF_ICON,
        badge:              NOTIF_BADGE,
        tag:                tag     || 'panstock-expiration',
        renotify:           true,
        requireInteraction: false,
        data:               { url: url || '/expiration' },
        actions: [
          { action: 'view',    title: '👀 Ver vencimientos' },
          { action: 'dismiss', title: '✕ Cerrar'           },
        ],
      })
      .catch((err) => console.warn('[PanStock SW] showNotification error:', err));
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});