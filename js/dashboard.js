import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { formatCurrency, formatDate, showNotification } from './app.js';

// Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // References to DOM elements
    const totalChequesElement = document.getElementById('totalCheques');
    const valorTotalElement = document.getElementById('valorTotal');
    const vencendoHojeElement = document.getElementById('vencendoHoje');
    const proximosVencimentosElement = document.getElementById('proximosVencimentos');
    const notificationBadge = document.getElementById('notificationBadge');

    // Load dashboard data
    const loadDashboardData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const chequesRef = collection(db, 'cheques');
            const q = query(chequesRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            // Calculate totals
            let total = 0;
            let vencendoHoje = 0;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const proximosVencimentos = [];

            querySnapshot.forEach(doc => {
                const cheque = doc.data();
                total += cheque.valor;

                const dataVencimento = cheque.dataVencimento.toDate();
                dataVencimento.setHours(0, 0, 0, 0);

                if (dataVencimento.getTime() === hoje.getTime()) {
                    vencendoHoje++;
                }

                if (dataVencimento >= hoje) {
                    proximosVencimentos.push({
                        id: doc.id,
                        ...cheque
                    });
                }
            });

            // Update UI
            totalChequesElement.textContent = querySnapshot.size;
            valorTotalElement.textContent = formatCurrency(total);
            vencendoHojeElement.textContent = vencendoHoje;

            // Sort proximos vencimentos by date
            proximosVencimentos.sort((a, b) => 
                a.dataVencimento.toDate() - b.dataVencimento.toDate()
            );

            // Display proximos vencimentos
            proximosVencimentosElement.innerHTML = proximosVencimentos
                .slice(0, 5)
                .map(cheque => `
                    <div class="cheque-item">
                        <div class="cheque-info">
                            <strong>${cheque.empresaFomento}</strong>
                            <span>${formatCurrency(cheque.valor)}</span>
                        </div>
                        <div class="cheque-date">
                            <span class="material-icons">event</span>
                            <span>${formatDate(cheque.dataVencimento.toDate())}</span>
                        </div>
                    </div>
                `).join('');

            // Update notification badge
            if (vencendoHoje > 0) {
                notificationBadge.textContent = vencendoHoje;
                notificationBadge.classList.remove('hidden');
            } else {
                notificationBadge.classList.add('hidden');
            }

            // Show notification for cheques vencendo hoje
            if (vencendoHoje > 0) {
                showNotification('Cheques Vencendo Hoje', {
                    body: `Você tem ${vencendoHoje} cheque(s) vencendo hoje.`,
                    icon: '/icons/icon-192x192.png'
                });
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    };

    // Load data initially
    loadDashboardData();

    // Set up real-time updates using onSnapshot
    const user = auth.currentUser;
    if (user) {
        const chequesRef = collection(db, 'cheques');
        const q = query(chequesRef, where('userId', '==', user.uid));
        
        const unsubscribe = onSnapshot(q, () => {
            loadDashboardData();
        });

        // Clean up listener when component unmounts
        window.addEventListener('unload', () => unsubscribe());
    }

    // Refresh data periodically (every 5 minutes)
    const refreshInterval = setInterval(loadDashboardData, 5 * 60 * 1000);

    // Clean up interval when component unmounts
    window.addEventListener('unload', () => clearInterval(refreshInterval));
}); 