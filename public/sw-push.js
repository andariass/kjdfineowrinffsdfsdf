// CIMB Cash Plus - Push Notifications Service Worker Extension
// Handled by Workbox via importScripts('/sw-push.js')

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'CIMB Cash Plus';
  const options = {
    body: payload.body || 'Pemberitahuan baharu daripada CIMB Cash Plus.',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || ('cimb-push-' + Date.now()),
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/',
      wa_message_id: payload.wa_message_id || null,
      chat_id: payload.chat_id || null,
      loan_id: payload.loan_id || null,
      timestamp: Date.now(),
    },
    actions: payload.actions || [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client && client.url !== new URL(targetUrl, self.location.origin).href) {
          await client.navigate(targetUrl);
        }
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

// Listener for postMessage (e.g. instant local notifications or tests from client)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'CIMB Cash Plus', {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options,
    });
  }
});
