/* =========================================================
   PanStock — Service Worker
   Maneja notificaciones push y cache básico.
   ========================================================= */

const CACHE_NAME = 'panstock-v1';
const NOTIF_ICON = '/logo_panstock.png';
const NOTIF_BADGE = '/logo_panstock.png';

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ── Push events (desde servidor o desde el cliente via postMessage) ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'PanStock', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'PanStock — Alerta de vencimiento';
  const options = {
    body:    data.body    || 'Hay productos próximos a vencer.',
    icon:    NOTIF_ICON,
    badge:   NOTIF_BADGE,
    tag:     data.tag     || 'panstock-expiration',
    renotify: true,
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

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta de la app, la enfocamos y navegamos
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Si no hay ventana abierta, abrimos una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── postMessage desde la app (para disparar notificación directamente) ──
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url } = event.data;
    self.registration.showNotification(title || 'PanStock', {
      body:    body    || '',
      icon:    NOTIF_ICON,
      badge:   NOTIF_BADGE,
      tag:     tag     || 'panstock-expiration',
      renotify: true,
      requireInteraction: false,
      data:    { url: url || '/expiration' },
      actions: [
        { action: 'view',    title: '👀 Ver vencimientos' },
        { action: 'dismiss', title: '✕ Cerrar'           },
      ],
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});