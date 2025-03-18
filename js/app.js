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

// Format currency
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Format date
export const formatDate = (date) => {
    return new Intl.DateTimeFormat('pt-BR').format(date);
};

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