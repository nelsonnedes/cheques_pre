const CACHE_NAME = 'sistema-financeiro-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Arquivos para cache estático
const STATIC_FILES = [
    '/',
    '/index.html',
    '/login.html',
    '/listarCheques.html',
    '/incluirCheque.html',
    '/agenda.html',
    '/configuracoes.html',
    '/suporte.html',
    '/css/global.css',
    '/js/auth.js',
    '/js/config.js',
    '/js/utils.js',
    '/js/masks.js',
    '/js/listarCheques.js',
    '/js/incluirCheque.js',
    '/js/agenda.js',
    '/js/configuracoes.js',
    '/js/suporte.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// URLs que devem sempre buscar da rede
const NETWORK_FIRST = [
    '/api/',
    'https://firestore.googleapis.com/',
    'https://firebase.googleapis.com/',
    'https://identitytoolkit.googleapis.com/'
];

// Instalar Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Cache estático criado');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Arquivos estáticos em cache');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Erro ao criar cache estático:', error);
            })
    );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Ativado');
                return self.clients.claim();
            })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições não HTTP
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Estratégia Network First para APIs
    if (NETWORK_FIRST.some(pattern => request.url.includes(pattern))) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Estratégia Cache First para recursos estáticos
    if (request.destination === 'style' || 
        request.destination === 'script' || 
        request.destination === 'image' ||
        request.destination === 'font') {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Estratégia Stale While Revalidate para páginas HTML
    if (request.destination === 'document') {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }
    
    // Estratégia padrão
    event.respondWith(cacheFirst(request));
});

// Estratégia Cache First
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Cache apenas respostas válidas
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('Cache First falhou:', error);
        
        // Retornar página offline para documentos
        if (request.destination === 'document') {
            return caches.match('/offline.html');
        }
        
        // Retornar imagem placeholder para imagens
        if (request.destination === 'image') {
            return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Imagem não disponível</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        
        throw error;
    }
}

// Estratégia Network First
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache apenas respostas válidas
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('Network First falhou:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.error('Stale While Revalidate falhou:', error);
        return cachedResponse;
    });
    
    return cachedResponse || fetchPromise;
}

// Sincronização em background
self.addEventListener('sync', event => {
    console.log('Service Worker: Sincronização em background:', event.tag);
    
    if (event.tag === 'sync-cheques') {
        event.waitUntil(syncCheques());
    }
    
    if (event.tag === 'sync-events') {
        event.waitUntil(syncEvents());
    }
});

// Sincronizar cheques
async function syncCheques() {
    try {
        console.log('Service Worker: Sincronizando cheques...');
        
        // Buscar dados pendentes do IndexedDB
        const pendingData = await getPendingData('cheques');
        
        for (const data of pendingData) {
            try {
                // Tentar enviar para o servidor
                const response = await fetch('/api/cheques', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    // Remover do IndexedDB se enviado com sucesso
                    await removePendingData('cheques', data.id);
                    console.log('Service Worker: Cheque sincronizado:', data.id);
                }
                
            } catch (error) {
                console.error('Service Worker: Erro ao sincronizar cheque:', error);
            }
        }
        
    } catch (error) {
        console.error('Service Worker: Erro na sincronização de cheques:', error);
    }
}

// Sincronizar eventos
async function syncEvents() {
    try {
        console.log('Service Worker: Sincronizando eventos...');
        
        const pendingData = await getPendingData('events');
        
        for (const data of pendingData) {
            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    await removePendingData('events', data.id);
                    console.log('Service Worker: Evento sincronizado:', data.id);
                }
                
            } catch (error) {
                console.error('Service Worker: Erro ao sincronizar evento:', error);
            }
        }
        
    } catch (error) {
        console.error('Service Worker: Erro na sincronização de eventos:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    console.log('Service Worker: Push recebido');
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (error) {
            data = { title: 'Sistema Financeiro', body: event.data.text() };
        }
    }
    
    const options = {
        title: data.title || 'Sistema Financeiro',
        body: data.body || 'Nova notificação',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: data.tag || 'default',
        data: data.data || {},
        actions: [
            {
                action: 'view',
                title: 'Ver',
                icon: '/icons/view-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Dispensar',
                icon: '/icons/dismiss-icon.png'
            }
        ],
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        vibrate: data.vibrate || [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification(options.title, options)
    );
});

// Clique em notificação
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Clique em notificação:', event.notification.tag);
    
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data;
    
    if (action === 'dismiss') {
        return;
    }
    
    let url = '/';
    
    if (data.url) {
        url = data.url;
    } else if (data.type === 'cheque') {
        url = `/incluirCheque.html?id=${data.id}`;
    } else if (data.type === 'event') {
        url = `/agenda.html`;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Verificar se já existe uma janela aberta
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Abrir nova janela se necessário
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Fechar notificação
self.addEventListener('notificationclose', event => {
    console.log('Service Worker: Notificação fechada:', event.notification.tag);
    
    // Analytics ou limpeza se necessário
    const data = event.notification.data;
    if (data.trackClose) {
        // Enviar evento de analytics
        fetch('/api/analytics/notification-close', {
            method: 'POST',
            body: JSON.stringify({
                tag: event.notification.tag,
                timestamp: Date.now()
            })
        }).catch(error => {
            console.error('Erro ao enviar analytics:', error);
        });
    }
});

// Funções auxiliares para IndexedDB
async function getPendingData(storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SistemaFinanceiroDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        };
    });
}

async function removePendingData(storeName, id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SistemaFinanceiroDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
    });
}

// Limpeza periódica do cache
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAN_CACHE') {
        event.waitUntil(cleanOldCache());
    }
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

async function cleanOldCache() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
        
        for (const request of requests) {
            const response = await cache.match(request);
            const dateHeader = response.headers.get('date');
            
            if (dateHeader) {
                const responseDate = new Date(dateHeader).getTime();
                if (now - responseDate > maxAge) {
                    await cache.delete(request);
                    console.log('Service Worker: Cache antigo removido:', request.url);
                }
            }
        }
        
    } catch (error) {
        console.error('Service Worker: Erro na limpeza do cache:', error);
    }
}

// Log de erros
self.addEventListener('error', event => {
    console.error('Service Worker: Erro:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker: Promise rejeitada:', event.reason);
});

console.log('Service Worker: Carregado'); 