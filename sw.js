const CACHE_NAME = 'cheques-app-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/firebase-config.js',
    '/js/dashboard.js',
    '/manifest.json',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore-compat.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event Strategy (Cache First, then Network)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request because it's a one-time use stream
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response because it's a one-time use stream
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // Don't cache if it's an API request
                                if (!event.request.url.includes('/api/')) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return response;
                    });
            })
    );
});

// Handle Push Notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver Detalhes'
            },
            {
                action: 'close',
                title: 'Fechar'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Gestão de Cheques', options)
    );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        // Open the app and navigate to specific page
        event.waitUntil(
            clients.openWindow('/')
        );
    }
}); 