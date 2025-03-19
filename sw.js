const CACHE_NAME = 'cheques-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Arquivos para cache estático
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/incluir_cheque.html',
    '/listar_cheques.html',
    '/empresas.html',
    '/agenda.html',
    '/relatorio.html',
    '/perfil.html',
    '/ajuda.html',
    '/suporte.html',
    '/backup.html',
    '/css/style.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/firebase-config.js',
    '/js/settings-menu.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
];

// Instalar o Service Worker
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing Service Worker...', event);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[Service Worker] Precaching App Shell');
                return cache.addAll(STATIC_ASSETS);
            })
    );
});

// Ativar o Service Worker
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating Service Worker...', event);
    event.waitUntil(
        caches.keys()
            .then(keyList => {
                return Promise.all(keyList.map(key => {
                    if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
                        console.log('[Service Worker] Removing old cache.', key);
                        return caches.delete(key);
                    }
                }));
            })
    );
    return self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    // Ignorar requisições para o Firebase
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('www.googleapis.com') ||
        event.request.url.includes('firebase-settings.crashlytics.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(res => {
                        return caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                // Armazenar em cache apenas requisições GET
                                if (event.request.method === 'GET') {
                                    cache.put(event.request.url, res.clone());
                                }
                                return res;
                            })
                    })
                    .catch(err => {
                        // Retornar página offline para navegação
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Sincronização em background
self.addEventListener('sync', event => {
    console.log('[Service Worker] Background Syncing', event);
    if (event.tag === 'sync-cheques') {
        event.waitUntil(
            // Implementar sincronização de dados
            console.log('[Service Worker] Syncing cheques...')
        );
    }
});

// Notificações push
self.addEventListener('push', event => {
    console.log('[Service Worker] Push Notification received', event);

    let data = { title: 'Novo', content: 'Algo novo aconteceu!' };
    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    const options = {
        body: data.content,
        icon: 'icons/icon-96x96.png',
        badge: 'icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/listar_cheques.html')
        );
    } else {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
}); 