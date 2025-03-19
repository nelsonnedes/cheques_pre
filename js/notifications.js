import { auth, db } from './firebase-config.js';
import {
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    onSnapshot,
    doc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM Elements
const notificationToggle = document.getElementById('notificationToggle');
const soundToggle = document.getElementById('soundToggle');
const notificationDays = document.getElementById('notificationDays');
const browserNotifications = document.getElementById('browserNotifications');
const emailNotifications = document.getElementById('emailNotifications');
const notificationTime = document.getElementById('notificationTime');
const previewSoundBtn = document.getElementById('previewSoundBtn');
const testNotificationBtn = document.getElementById('testNotificationBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Notification sound
let notificationSound = new Audio('assets/notification.mp3');

// Initialize notifications when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    requestNotificationPermission();
});

// Load saved settings
async function loadSettings() {
    try {
        const userDoc = await getDocs(doc(db, 'users', auth.currentUser.uid));
        const settings = userDoc.data()?.notificationSettings || getDefaultSettings();

        notificationToggle.checked = settings.enabled;
        soundToggle.checked = settings.sound;
        notificationDays.value = settings.days;
        browserNotifications.checked = settings.browser;
        emailNotifications.checked = settings.email;
        notificationTime.value = settings.time;

        // Store settings in localStorage for quick access
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        // Load from localStorage as fallback
        const settings = JSON.parse(localStorage.getItem('notificationSettings')) || getDefaultSettings();
        applySettings(settings);
    }
}

// Get default settings
function getDefaultSettings() {
    return {
        enabled: true,
        sound: true,
        days: 3,
        browser: true,
        email: false,
        time: '09:00',
        timezone: 'America/Sao_Paulo'
    };
}

// Apply settings to form
function applySettings(settings) {
    notificationToggle.checked = settings.enabled;
    soundToggle.checked = settings.sound;
    notificationDays.value = settings.days;
    browserNotifications.checked = settings.browser;
    emailNotifications.checked = settings.email;
    notificationTime.value = settings.time;
}

// Setup event listeners
function setupEventListeners() {
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    if (previewSoundBtn) {
        previewSoundBtn.addEventListener('click', playNotificationSound);
    }
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', sendTestNotification);
    }
}

// Save settings
async function saveSettings() {
    const settings = {
        enabled: notificationToggle.checked,
        sound: soundToggle.checked,
        days: parseInt(notificationDays.value),
        browser: browserNotifications.checked,
        email: emailNotifications.checked,
        time: notificationTime.value,
        timezone: 'America/Sao_Paulo'
    };

    try {
        // Save to Firestore
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            notificationSettings: settings
        });

        // Save to localStorage
        localStorage.setItem('notificationSettings', JSON.stringify(settings));

        showMessage('Configurações salvas com sucesso!', 'success');

        // Request permission if notifications are enabled
        if (settings.enabled && settings.browser) {
            requestNotificationPermission();
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showMessage('Erro ao salvar configurações', 'error');
    }
}

// Request notification permission
async function requestNotificationPermission() {
    try {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setupNotificationWatchers();
            } else {
                browserNotifications.checked = false;
                showMessage('Permissão para notificações negada', 'warning');
            }
        }
    } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error);
    }
}

// Setup notification watchers
function setupNotificationWatchers() {
    if (!auth.currentUser) return;

    const settings = JSON.parse(localStorage.getItem('notificationSettings')) || getDefaultSettings();
    if (!settings.enabled) return;

    // Watch for upcoming checks
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + settings.days);

    const chequesRef = collection(db, 'cheques');
    const q = query(
        chequesRef,
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'Pendente'),
        where('dataVencimento', '>=', Timestamp.fromDate(today)),
        where('dataVencimento', '<=', Timestamp.fromDate(futureDate))
    );

    // Listen for real-time updates
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const cheque = change.doc.data();
                const daysUntilDue = Math.ceil(
                    (cheque.dataVencimento.toDate() - today) / (1000 * 60 * 60 * 24)
                );

                if (daysUntilDue <= settings.days) {
                    showNotification(cheque, daysUntilDue);
                }
            }
        });
    });
}

// Show notification
function showNotification(cheque, daysUntilDue) {
    const settings = JSON.parse(localStorage.getItem('notificationSettings')) || getDefaultSettings();
    if (!settings.enabled) return;

    const title = 'Cheque Próximo do Vencimento';
    const options = {
        body: `O cheque de ${formatCurrency(cheque.valor)} da empresa ${cheque.empresaNome} vence em ${daysUntilDue} dias.`,
        icon: 'icons/icon-192x192.png',
        badge: 'icons/badge-96x96.png',
        tag: `cheque-${cheque.id}`,
        renotify: true
    };

    // Show browser notification
    if (settings.browser && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, options);
    }

    // Play sound if enabled
    if (settings.sound) {
        playNotificationSound();
    }

    // Send email notification if enabled
    if (settings.email) {
        sendEmailNotification(cheque, daysUntilDue);
    }
}

// Play notification sound
function playNotificationSound() {
    try {
        notificationSound.play();
    } catch (error) {
        console.error('Erro ao reproduzir som:', error);
    }
}

// Send test notification
function sendTestNotification() {
    const testCheque = {
        id: 'test',
        valor: 1000,
        empresaNome: 'Empresa Teste',
        dataVencimento: Timestamp.fromDate(new Date())
    };
    showNotification(testCheque, 3);
}

// Send email notification
async function sendEmailNotification(cheque, daysUntilDue) {
    // Implement email notification logic here
    // This would typically involve calling a server endpoint or cloud function
    console.log('Email notification would be sent here');
}

// Show message
function showMessage(message, type = 'info') {
    // You can implement your own message display logic here
    alert(message);
}

// Utility function to format currency
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
} 