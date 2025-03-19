// Registrar o Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado com sucesso:', registration);

                // Verificar atualizações do Service Worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('Novo Service Worker sendo instalado:', newWorker);

                    newWorker.addEventListener('statechange', () => {
                        console.log('Novo Service Worker mudou de estado:', newWorker.state);
                        if (newWorker.state === 'activated') {
                            // Notificar o usuário sobre a atualização
                            if (!localStorage.getItem('swUpdateNotified')) {
                                showUpdateNotification();
                                localStorage.setItem('swUpdateNotified', 'true');
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Erro ao registrar Service Worker:', error);
            });

        // Verificar conexão com a internet
        window.addEventListener('online', handleConnectionChange);
        window.addEventListener('offline', handleConnectionChange);
    });
}

// Função para mostrar notificação de atualização
function showUpdateNotification() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Sistema de Cheques Atualizado', {
                    body: 'Uma nova versão está disponível. Recarregue a página para usar a versão mais recente.',
                    icon: '/icons/icon-192x192.png'
                });
            }
        });
    }
}

// Função para lidar com mudanças na conexão
function handleConnectionChange() {
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
        if (navigator.onLine) {
            connectionStatus.textContent = 'Online';
            connectionStatus.classList.remove('offline');
            connectionStatus.classList.add('online');
            
            // Tentar sincronizar dados pendentes
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.sync.register('sync-cheques')
                        .then(() => {
                            console.log('Sincronização de cheques registrada');
                        })
                        .catch(error => {
                            console.error('Erro ao registrar sincronização:', error);
                        });
                });
            }
        } else {
            connectionStatus.textContent = 'Offline';
            connectionStatus.classList.remove('online');
            connectionStatus.classList.add('offline');
        }
    }
}

// Verificar se há atualizações pendentes do Service Worker
function checkForUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.update();
        });
    }
}

// Verificar atualizações periodicamente (a cada 6 horas)
setInterval(checkForUpdates, 6 * 60 * 60 * 1000);

// Verificar estado inicial da conexão
handleConnectionChange(); 