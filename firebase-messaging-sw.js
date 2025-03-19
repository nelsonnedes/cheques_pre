importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "YOUR_API_KEY",
    authDomain: "your-app.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// Lidar com mensagens em background
messaging.onBackgroundMessage((payload) => {
    console.log('Recebida mensagem em background:', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/images/icon-192x192.png',
        badge: '/images/badge.png',
        vibrate: [100, 50, 100],
        data: payload.data,
        actions: getNotificationActions(payload.data.type)
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Lidar com clique na notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view') {
        // Abrir a página do cheque
        if (event.notification.data.chequeId) {
            clients.openWindow(`/cheques.html?id=${event.notification.data.chequeId}`);
        }
    } else if (event.action === 'snooze') {
        // Adiar notificação
        const newTime = new Date().getTime() + (24 * 60 * 60 * 1000); // +24 horas
        self.registration.showNotification(
            'Lembrete adiado',
            {
                body: 'Você será notificado novamente em 24 horas',
                icon: '/images/icon-192x192.png',
                timestamp: newTime
            }
        );
    } else if (event.action === 'backup') {
        clients.openWindow('/configuracoes.html#backup');
    }
});

function getNotificationActions(type) {
    const actions = {
        cheque_vencimento: [
            {
                action: 'view',
                title: 'Ver Cheque',
                icon: '/images/view-icon.png'
            },
            {
                action: 'snooze',
                title: 'Adiar',
                icon: '/images/snooze-icon.png'
            }
        ],
        cheque_status: [
            {
                action: 'view',
                title: 'Ver Detalhes',
                icon: '/images/view-icon.png'
            }
        ],
        backup_reminder: [
            {
                action: 'backup',
                title: 'Fazer Backup',
                icon: '/images/backup-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Ignorar',
                icon: '/images/dismiss-icon.png'
            }
        ]
    };

    return actions[type] || [];
} 