/* Go Mama service worker — web push only (no offline caching yet).
   Registered lazily by src/lib/push.js, and only when a VAPID public key is
   configured. Until the push-sending work ships, this just stands ready. */

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'Go Mama';
  const options = {
    body: data.body || '',
    icon: data.icon || '/gomama-logo.png',
    badge: data.badge || '/favicon.svg',
    data: { url: data.url || '/' },
    tag: data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) { client.navigate(url); return client.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});
