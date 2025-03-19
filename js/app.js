import { auth } from './firebase-config.js';
import { signOut } from 'firebase/auth';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Request notification permission
export const requestNotificationPermission = async () => {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
        }
    }
};

// Format currency to BRL
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Format date to Brazilian format
export function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(date);
}

// Calculate total value with interest and taxes
export function calculateTotal(valor, taxaJuros, taxaImpostos, dataInicial, dataFinal) {
    const dias = Math.ceil((dataFinal - dataInicial) / (1000 * 60 * 60 * 24));
    const juros = (valor * (taxaJuros / 100) * dias) / 30; // Monthly interest rate
    const impostos = valor * (taxaImpostos / 100);
    return valor + juros + impostos;
}

// Validate form data
export function validateFormData(data) {
    const errors = [];

    if (!data.empresaFomentoId) {
        errors.push('Selecione uma empresa de fomento');
    }

    if (!data.valor || data.valor <= 0) {
        errors.push('Informe um valor válido');
    }

    if (!data.taxaJuros || data.taxaJuros < 0) {
        errors.push('Informe uma taxa de juros válida');
    }

    if (!data.taxaImpostos || data.taxaImpostos < 0) {
        errors.push('Informe uma taxa de impostos válida');
    }

    if (!data.dataInicial) {
        errors.push('Informe a data inicial');
    }

    if (!data.dataFinal) {
        errors.push('Informe a data final');
    }

    if (data.dataInicial && data.dataFinal && new Date(data.dataInicial) >= new Date(data.dataFinal)) {
        errors.push('A data final deve ser posterior à data inicial');
    }

    return errors;
}

// Show error message
export function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
}

// Show success message
export function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
}

// Calculate days between dates
export const daysBetweenDates = (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
};

// Calculate interest
export const calculateInterest = (principal, rate, days) => {
    return principal * (rate / 100) * (days / 30);
};

// Show notification
export const showNotification = (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, options);
    }
};

// Share via WhatsApp
export const shareViaWhatsApp = (text) => {
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
};

// Export to PDF
export const exportToPDF = async (elementId, filename) => {
    const { jsPDF } = window.jspdf;
    const element = document.getElementById(elementId);
    
    if (!element) {
        console.error('Element not found');
        return;
    }

    const pdf = new jsPDF('p', 'pt', 'a4');
    await pdf.html(element, {
        callback: function(pdf) {
            pdf.save(filename);
        },
        margin: [10, 10, 10, 10],
        autoPaging: 'text',
        x: 0,
        y: 0,
        width: 190,
        windowWidth: 675
    });
};

// Handle offline/online status
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
    showNotification('Conexão Restaurada', {
        body: 'Você está online novamente.'
    });
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
    showNotification('Sem Conexão', {
        body: 'Você está offline. Os dados serão sincronizados quando a conexão for restaurada.'
    });
});

// Add to home screen prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or prompt
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to install prompt: ${outcome}`);
                deferredPrompt = null;
                installButton.style.display = 'none';
            }
        });
    }
});

// Initialize notification permission
requestNotificationPermission();

class AppManager {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.setupServiceWorkerUpdates();
    }

    initializeElements() {
        // Elementos do cabeçalho
        this.notificationsBtn = document.getElementById('notificationsBtn');
        this.notificationBadge = document.getElementById('notificationBadge');
        this.configBtn = document.getElementById('configBtn');
        this.settingsMenu = document.getElementById('settingsMenu');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
    }

    setupEventListeners() {
        // Listener para o botão de notificações
        if (this.notificationsBtn) {
            this.notificationsBtn.addEventListener('click', () => {
                window.location.href = 'notificacoes.html';
            });
        }

        // Listener para o botão de logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Listeners para mudanças na conexão
        window.addEventListener('online', () => this.updateConnectionStatus());
        window.addEventListener('offline', () => this.updateConnectionStatus());

        // Verificar estado inicial da conexão
        this.updateConnectionStatus();
    }

    setupServiceWorkerUpdates() {
        if ('serviceWorker' in navigator) {
            // Verificar atualizações ao carregar a página
            this.checkForUpdates();

            // Verificar atualizações periodicamente
            setInterval(() => this.checkForUpdates(), 6 * 60 * 60 * 1000); // A cada 6 horas
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }

    updateConnectionStatus() {
        if (this.connectionStatus) {
            const isOnline = navigator.onLine;
            this.connectionStatus.textContent = isOnline ? 'Online' : 'Offline';
            this.connectionStatus.className = isOnline ? 'connection-status online' : 'connection-status offline';
            
            // Adicionar ícone
            const icon = isOnline ? 'wifi' : 'wifi-slash';
            this.connectionStatus.innerHTML = `
                <i class="fas fa-${icon}"></i>
                <span>${isOnline ? 'Online' : 'Offline'}</span>
            `;

            // Tentar sincronizar dados se estiver online
            if (isOnline && 'serviceWorker' in navigator && 'SyncManager' in window) {
                this.syncData();
            }
        }
    }

    async syncData() {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-cheques');
            console.log('Sincronização de cheques registrada');
        } catch (error) {
            console.error('Erro ao registrar sincronização:', error);
        }
    }

    async checkForUpdates() {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.update();
            
            if (registration.waiting) {
                this.showUpdateNotification();
            }
        } catch (error) {
            console.error('Erro ao verificar atualizações:', error);
        }
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <p>Uma nova versão está disponível!</p>
            <button onclick="window.location.reload()">Atualizar Agora</button>
        `;

        document.body.appendChild(notification);

        // Remover a notificação após 10 segundos
        setTimeout(() => {
            notification.remove();
        }, 10000);
    }

    updateNotificationBadge(count) {
        if (this.notificationBadge) {
            if (count > 0) {
                this.notificationBadge.textContent = count;
                this.notificationBadge.classList.remove('hidden');
            } else {
                this.notificationBadge.classList.add('hidden');
            }
        }
    }
}

// Inicializar o gerenciador quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new AppManager();
}); 