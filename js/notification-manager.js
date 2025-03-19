import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { auth } from './firebase-config.js';
import { formatCurrency, formatDate } from './utils.js';

export class NotificationManager {
    constructor() {
        this.db = getFirestore();
        this.messaging = getMessaging();
        this.vapidKey = 'YOUR_VAPID_KEY'; // Será substituído pela chave real
        this.notificationPermission = false;
        this.userToken = null;
        this.hasPermission = false;
        this.serviceWorkerRegistration = null;
        this.notificationsCollection = collection(this.db, 'notifications');
        
        // Inicializar
        this.init();
    }

    async init() {
        try {
            // Verificar suporte a notificações
            if (!('Notification' in window)) {
                console.warn('Este navegador não suporta notificações push');
                return;
            }

            // Registrar Service Worker
            if ('serviceWorker' in navigator) {
                this.serviceWorkerRegistration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registrado com sucesso');
            }

            // Verificar permissão
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                this.notificationPermission = permission === 'granted';
                
                if (this.notificationPermission) {
                    await this.setupPushNotifications();
                }
            }

            // Configurar listener para mensagens em primeiro plano
            onMessage(this.messaging, (payload) => {
                this.showNotification(payload);
            });

            // Iniciar verificação de cheques próximos do vencimento
            this.startCheckingDueDates();
        } catch (error) {
            console.error('Erro ao inicializar NotificationManager:', error);
        }
    }

    async setupPushNotifications() {
        try {
            // Obter token do dispositivo
            const token = await getToken(this.messaging, {
                vapidKey: this.vapidKey
            });
            
            if (token) {
                this.userToken = token;
                await this.saveUserToken(token);
                console.log('Token de notificação registrado');
            } else {
                console.log('Sem permissão para notificações');
            }
        } catch (error) {
            console.error('Erro ao configurar notificações push:', error);
        }
    }

    async saveUserToken(token) {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            // Verificar se o token já existe
            const tokensRef = collection(this.db, 'user_tokens');
            const q = query(tokensRef, 
                where('userId', '==', userId),
                where('token', '==', token)
            );
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                // Adicionar novo token
                await addDoc(tokensRef, {
                    userId,
                    token,
                    createdAt: new Date(),
                    platform: this.getPlatformInfo()
                });
            }
        } catch (error) {
            console.error('Erro ao salvar token:', error);
        }
    }

    getPlatformInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenSize: `${window.screen.width}x${window.screen.height}`
        };
    }

    showNotification(payload) {
        if (!this.notificationPermission) return;

        const options = {
            body: payload.notification.body,
            icon: '/images/icon-192x192.png',
            badge: '/images/badge.png',
            vibrate: [100, 50, 100],
            data: payload.data,
            actions: this.getNotificationActions(payload.data.type)
        };

        const notification = new Notification(payload.notification.title, options);
        
        notification.onclick = () => {
            window.focus();
            this.handleNotificationClick(payload.data);
        };
    }

    getNotificationActions(type) {
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

    handleNotificationClick(data) {
        switch (data.type) {
            case 'cheque_vencimento':
            case 'cheque_status':
                window.location.href = `/cheques.html?id=${data.chequeId}`;
                break;
            case 'backup_reminder':
                window.location.href = '/configuracoes.html#backup';
                break;
            default:
                window.location.href = '/';
        }
    }

    async checkChequesVencimento() {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const hoje = new Date();
            const limiteDias = 5; // Alertar 5 dias antes do vencimento
            const dataLimite = new Date();
            dataLimite.setDate(hoje.getDate() + limiteDias);

            const chequesRef = collection(this.db, 'cheques');
            const q = query(chequesRef,
                where('userId', '==', userId),
                where('status', '==', 'pendente'),
                where('dataVencimento', '<=', dataLimite),
                where('dataVencimento', '>', hoje)
            );

            const snapshot = await getDocs(q);
            
            snapshot.forEach(doc => {
                const cheque = doc.data();
                const diasRestantes = Math.ceil((cheque.dataVencimento.toDate() - hoje) / (1000 * 60 * 60 * 24));
                
                this.showNotification({
                    notification: {
                        title: 'Cheque Próximo ao Vencimento',
                        body: `O cheque ${cheque.numero} vence em ${diasRestantes} dias. Valor: R$ ${cheque.valor.toLocaleString('pt-BR')}`
                    },
                    data: {
                        type: 'cheque_vencimento',
                        chequeId: doc.id
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao verificar cheques:', error);
        }
    }

    async updateUserPreferences(preferences) {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const userRef = doc(this.db, 'users', userId);
            await updateDoc(userRef, {
                notificationPreferences: preferences
            });

            return true;
        } catch (error) {
            console.error('Erro ao atualizar preferências:', error);
            return false;
        }
    }

    scheduleNotificationCheck() {
        // Verificar cheques a cada 12 horas
        setInterval(() => this.checkChequesVencimento(), 12 * 60 * 60 * 1000);
        
        // Verificar imediatamente na inicialização
        this.checkChequesVencimento();
    }

    async startCheckingDueDates() {
        // Verificar cheques a cada hora
        setInterval(() => this.checkDueDates(), 3600000);
        // Verificar imediatamente na primeira vez
        await this.checkDueDates();
    }

    async checkDueDates() {
        if (!this.hasPermission || !auth.currentUser) return;

        try {
            const userId = auth.currentUser.uid;
            const today = new Date();
            const alertDays = await this.getAlertDays(userId);
            
            // Calcular data limite baseada nos dias de alerta
            const limitDate = new Date();
            limitDate.setDate(today.getDate() + alertDays);

            // Buscar cheques próximos do vencimento
            const chequesQuery = query(
                collection(this.db, 'cheques'),
                where('userId', '==', userId),
                where('status', '==', 'Pendente'),
                where('dataVencimento', '<=', limitDate),
                where('dataVencimento', '>=', today)
            );

            const snapshot = await getDocs(chequesQuery);
            const cheques = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Notificar sobre cada cheque
            for (const cheque of cheques) {
                const diasRestantes = Math.ceil((cheque.dataVencimento.toDate() - today) / (1000 * 60 * 60 * 24));
                
                if (diasRestantes <= alertDays) {
                    await this.sendNotification({
                        title: 'Cheque Próximo do Vencimento',
                        body: `O cheque nº ${cheque.numero} no valor de ${formatCurrency(cheque.valor)} vence em ${diasRestantes} dias (${formatDate(cheque.dataVencimento.toDate())})`,
                        icon: '/img/logo.png',
                        data: {
                            chequeId: cheque.id,
                            type: 'due_date'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao verificar vencimentos:', error);
        }
    }

    async getAlertDays(userId) {
        try {
            const userSettingsRef = doc(this.db, 'userSettings', userId);
            const userSettings = await getDoc(userSettingsRef);
            return userSettings.data()?.alertDays || 5; // Padrão: 5 dias
        } catch (error) {
            console.error('Erro ao buscar dias de alerta:', error);
            return 5;
        }
    }

    async sendNotification({ title, body, icon, data }) {
        if (!this.hasPermission) return;

        try {
            // Salvar notificação no Firestore
            const notification = {
                userId: auth.currentUser.uid,
                title,
                body,
                data,
                timestamp: new Date(),
                read: false
            };

            await addDoc(this.notificationsCollection, notification);

            // Enviar notificação do navegador
            if (this.serviceWorkerRegistration) {
                await this.serviceWorkerRegistration.showNotification(title, {
                    body,
                    icon,
                    data,
                    requireInteraction: true,
                    vibrate: [200, 100, 200]
                });
            } else {
                // Fallback para Notification API
                new Notification(title, { body, icon });
            }
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
        }
    }

    async markAsRead(notificationId) {
        try {
            const notificationRef = doc(this.notificationsCollection, notificationId);
            await updateDoc(notificationRef, {
                read: true,
                readAt: new Date()
            });
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
        }
    }

    async getUnreadCount() {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return 0;

            const unreadQuery = query(
                this.notificationsCollection,
                where('userId', '==', userId),
                where('read', '==', false)
            );

            const snapshot = await getDocs(unreadQuery);
            return snapshot.size;
        } catch (error) {
            console.error('Erro ao buscar contagem de notificações:', error);
            return 0;
        }
    }

    async getNotifications(limit = 20) {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return [];

            const notificationsQuery = query(
                this.notificationsCollection,
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(limit)
            );

            const snapshot = await getDocs(notificationsQuery);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
            return [];
        }
    }
}

export const notificationManager = new NotificationManager(); 