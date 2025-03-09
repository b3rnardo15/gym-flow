// Instalando o Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  // Precache assets ou outras tarefas durante a instalação
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/index.html',
        '/styles.css',
        '/app.js',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
      ]);
    })
  );
});

// Ativando o Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

// Interceptando as requisições e usando cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// Background Sync - Sincronizando quando a rede estiver disponível
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Coloque sua lógica de sincronização aqui (ex: enviar dados ao servidor)
      fetch('/sync-data', {
        method: 'POST',
        body: JSON.stringify({ data: 'some data' }),
      }).then(response => {
        console.log('Dados sincronizados', response);
      }).catch(err => {
        console.log('Erro na sincronização', err);
      })
    );
  }
});

// Push Notifications - Recebendo uma notificação push
self.addEventListener('push', event => {
  let notificationOptions = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
  };

  // Exibe a notificação
  event.waitUntil(
    self.registration.showNotification('Nova Mensagem', notificationOptions)
  );
});

// Abrindo a notificação - Interação com o usuário
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/').then(() => {
      console.log('Janela do app aberta');
    })
  );
});
