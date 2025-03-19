// Cache name
const CACHE_NAME = 'sistema-cheques-v1';

// Arquivos para cache
const urlsToCache = [
    '/',
    '/index.html',
    '/empresas.html',
    '/relatorios.html',
    '/configuracoes.html',
    '/ajuda.html',
    '/css/style.css',
    '/js/utils.js',
    '/js/firebase-config.js',
    '/js/notification-manager.js',
    '/img/logo.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Gerenciamento de notificações
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/img/logo.png',
        badge: '/img/badge.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('Sistema de Cheques', options)
    );
});

// Clique na notificação
self.addEventListener('notificationclick', event => {
    event.notification.close();

    // Dados da notificação
    const notificationData = event.notification.data;
    
    // URL para abrir baseada no tipo de notificação
    let url = '/';
    if (notificationData && notificationData.chequeId) {
        url = `/cheque.html?id=${notificationData.chequeId}`;
    }

    // Abrir ou focar na janela existente
    event.waitUntil(
        clients.matchAll({
            type: 'window'
        })
        .then(windowClients => {
            // Verificar se já há uma janela aberta
            for (let client of windowClients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Se não houver janela aberta, abrir uma nova
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Fechamento da notificação
self.addEventListener('notificationclose', event => {
    const notification = event.notification;
    const primaryKey = notification.data.primaryKey;

    console.log('Notificação fechada', primaryKey);
}); 