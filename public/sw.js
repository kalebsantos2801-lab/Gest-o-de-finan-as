// Finanças Familiar - Service Worker para Push Notifications Nativas no Celular/Desktop

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Receber notificação Push do servidor
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Finanças Familiar',
    body: 'Você tem um novo aviso financeiro!',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    url: '/notificacoes',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const title = data.title || '🔔 Finanças Familiar';
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'financas-familiar-push-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/notificacoes',
      notification_id: data.id || null,
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: 'open', title: 'Toque para visualizar' }
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Ao clicar na notificação nativa do celular
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/notificacoes';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o app já estiver aberto em alguma aba, focar e navegar
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Se o app estiver fechado, abrir nova janela/aba na rota correspondente
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
