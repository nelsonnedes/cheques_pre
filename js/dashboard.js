import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from 'firebase/auth';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { formatCurrency, formatDate, showNotification } from './app.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const dashboard = document.getElementById('dashboard');
const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');

// Dashboard Elements
const totalChequesEl = document.getElementById('totalCheques');
const valorTotalEl = document.getElementById('valorTotal');
const chequesPendentesEl = document.getElementById('chequesPendentes');
const proximosVencimentosEl = document.getElementById('proximosVencimentos');
const ultimosChequesEl = document.getElementById('ultimosCheques');
const totalEmpresas = document.getElementById('totalEmpresas');
const chequesList = document.getElementById('chequesList');
const settingsMenu = document.getElementById('settingsMenu');
const configBtn = document.getElementById('configBtn');

class DashboardManager {
    constructor() {
        this.userId = null;
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Summary elements
        this.totalCheques = document.getElementById('totalCheques');
        this.chequesAVencer = document.getElementById('chequesAVencer');
        this.chequesVencidos = document.getElementById('chequesVencidos');
        this.valorTotal = document.getElementById('valorTotal');
        
        // Table and grid elements
        this.recentChecksTable = document.getElementById('recentChecksTable');
        this.upcomingGrid = document.getElementById('upcomingGrid');
        
        // Charts
        this.statusChart = null;
        this.vencimentosChart = null;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.checkAuth();
            await this.loadSummary();
            await this.loadRecentChecks();
            await this.loadUpcomingDueDates();
            this.initCharts();
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            alert('Erro ao carregar dashboard');
        } finally {
            this.hideLoading();
        }
    }

    async checkAuth() {
        return new Promise((resolve, reject) => {
            auth.onAuthStateChanged(user => {
                if (user) {
                    this.userId = user.uid;
                    document.getElementById('userName').textContent = user.email;
                    resolve(user);
                } else {
                    window.location.href = 'login.html';
                    reject('Usuário não autenticado');
                }
            });
        });
    }

    async loadSummary() {
        try {
            const hoje = new Date();
            const trintaDias = new Date();
            trintaDias.setDate(hoje.getDate() + 30);

            const chequesRef = collection(db, 'usuarios', this.userId, 'cheques');
            
            // Total de cheques
            const totalSnapshot = await getDocs(chequesRef);
            const total = totalSnapshot.size;
            this.totalCheques.textContent = total;

            // Cheques a vencer nos próximos 30 dias
            const aVencerQuery = query(
                chequesRef,
                where('vencimento', '>=', Timestamp.fromDate(hoje)),
                where('vencimento', '<=', Timestamp.fromDate(trintaDias))
            );
            const aVencerSnapshot = await getDocs(aVencerQuery);
            this.chequesAVencer.textContent = aVencerSnapshot.size;

            // Cheques vencidos
            const vencidosQuery = query(
                chequesRef,
                where('vencimento', '<', Timestamp.fromDate(hoje)),
                where('status', '!=', 'compensado')
            );
            const vencidosSnapshot = await getDocs(vencidosQuery);
            this.chequesVencidos.textContent = vencidosSnapshot.size;

            // Valor total
            let valorTotal = 0;
            totalSnapshot.forEach(doc => {
                const cheque = doc.data();
                valorTotal += cheque.valor || 0;
            });
            this.valorTotal.textContent = this.formatCurrency(valorTotal);

        } catch (error) {
            console.error('Erro ao carregar resumo:', error);
            throw error;
        }
    }

    async loadRecentChecks() {
        try {
            const chequesRef = collection(db, 'usuarios', this.userId, 'cheques');
            const recentQuery = query(
                chequesRef,
                orderBy('dataCadastro', 'desc'),
                limit(5)
            );
            
            const snapshot = await getDocs(recentQuery);
            
            if (snapshot.empty) {
                this.recentChecksTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-message">Nenhum cheque cadastrado</td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            snapshot.forEach(doc => {
                const cheque = doc.data();
                html += `
                    <tr>
                        <td>${cheque.numero}</td>
                        <td>${cheque.emissor}</td>
                        <td>${this.formatCurrency(cheque.valor)}</td>
                        <td>${this.formatDate(cheque.vencimento.toDate())}</td>
                        <td><span class="status-badge ${cheque.status}">${this.formatStatus(cheque.status)}</span></td>
                        <td>
                            <button class="btn-icon" onclick="window.location.href='editar-cheque.html?id=${doc.id}'">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="window.dashboardManager.showChequeDetails('${doc.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            this.recentChecksTable.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar cheques recentes:', error);
            throw error;
        }
    }

    async loadUpcomingDueDates() {
        try {
            const hoje = new Date();
            const trintaDias = new Date();
            trintaDias.setDate(hoje.getDate() + 30);

            const chequesRef = collection(db, 'usuarios', this.userId, 'cheques');
            const upcomingQuery = query(
                chequesRef,
                where('vencimento', '>=', Timestamp.fromDate(hoje)),
                where('vencimento', '<=', Timestamp.fromDate(trintaDias)),
                orderBy('vencimento', 'asc'),
                limit(6)
            );
            
            const snapshot = await getDocs(upcomingQuery);
            
            if (snapshot.empty) {
                this.upcomingGrid.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-calendar-times"></i>
                        <p>Nenhum vencimento próximo</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            snapshot.forEach(doc => {
                const cheque = doc.data();
                const diasRestantes = this.calcularDiasRestantes(cheque.vencimento.toDate());
                
                html += `
                    <div class="upcoming-card">
                        <div class="due-date">
                            <span class="day">${cheque.vencimento.toDate().getDate()}</span>
                            <span class="month">${this.formatMonth(cheque.vencimento.toDate())}</span>
                        </div>
                        <div class="check-info">
                            <h3>${cheque.emissor}</h3>
                            <p class="number">Cheque: ${cheque.numero}</p>
                            <p class="value">${this.formatCurrency(cheque.valor)}</p>
                        </div>
                        <div class="days-left ${diasRestantes <= 5 ? 'urgent' : ''}">
                            ${diasRestantes} dias restantes
                        </div>
                    </div>
                `;
            });
            
            this.upcomingGrid.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar próximos vencimentos:', error);
            throw error;
        }
    }

    initCharts() {
        this.initStatusChart();
        this.initVencimentosChart();
    }

    async initStatusChart() {
        try {
            const chequesRef = collection(db, 'usuarios', this.userId, 'cheques');
            const snapshot = await getDocs(chequesRef);
            
            const statusCount = {
                pendente: 0,
                compensado: 0,
                devolvido: 0,
                cancelado: 0
            };
            
            snapshot.forEach(doc => {
                const cheque = doc.data();
                statusCount[cheque.status]++;
            });
            
            const ctx = document.getElementById('statusChart').getContext('2d');
            this.statusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Pendente', 'Compensado', 'Devolvido', 'Cancelado'],
                    datasets: [{
                        data: [
                            statusCount.pendente,
                            statusCount.compensado,
                            statusCount.devolvido,
                            statusCount.cancelado
                        ],
                        backgroundColor: [
                            '#ffd700',  // Pendente - Dourado
                            '#4caf50',  // Compensado - Verde
                            '#f44336',  // Devolvido - Vermelho
                            '#9e9e9e'   // Cancelado - Cinza
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao inicializar gráfico de status:', error);
        }
    }

    async initVencimentosChart() {
        try {
            const hoje = new Date();
            const seisProximosMeses = new Date();
            seisProximosMeses.setMonth(hoje.getMonth() + 6);

            const chequesRef = collection(db, 'usuarios', this.userId, 'cheques');
            const vencimentosQuery = query(
                chequesRef,
                where('vencimento', '>=', Timestamp.fromDate(hoje)),
                where('vencimento', '<=', Timestamp.fromDate(seisProximosMeses))
            );
            
            const snapshot = await getDocs(vencimentosQuery);
            
            const vencimentosPorMes = {};
            const valoresPorMes = {};
            
            snapshot.forEach(doc => {
                const cheque = doc.data();
                const mes = this.formatMonth(cheque.vencimento.toDate());
                
                vencimentosPorMes[mes] = (vencimentosPorMes[mes] || 0) + 1;
                valoresPorMes[mes] = (valoresPorMes[mes] || 0) + cheque.valor;
            });
            
            const ctx = document.getElementById('vencimentosChart').getContext('2d');
            this.vencimentosChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(vencimentosPorMes),
                    datasets: [
                        {
                            label: 'Quantidade de Cheques',
                            data: Object.values(vencimentosPorMes),
                            backgroundColor: '#2196f3',
                            order: 2
                        },
                        {
                            label: 'Valor Total (R$)',
                            data: Object.values(valoresPorMes),
                            type: 'line',
                            borderColor: '#f44336',
                            borderWidth: 2,
                            fill: false,
                            yAxisID: 'y1',
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Quantidade'
                            }
                        },
                        y1: {
                            beginAtZero: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Valor (R$)'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao inicializar gráfico de vencimentos:', error);
        }
    }

    showChequeDetails(chequeId) {
        window.location.href = `visualizar-cheque.html?id=${chequeId}`;
    }

    calcularDiasRestantes(data) {
        const hoje = new Date();
        const diffTime = Math.abs(data - hoje);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('pt-BR').format(date);
    }

    formatMonth(date) {
        return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date);
    }

    formatStatus(status) {
        const statusMap = {
            pendente: 'Pendente',
            compensado: 'Compensado',
            devolvido: 'Devolvido',
            cancelado: 'Cancelado'
        };
        return statusMap[status] || status;
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Initialize the dashboard manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Event Listeners
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message);
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Erro ao criar conta: ' + error.message);
    }
});

showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Setup notification badge
function setupNotificationBadge() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const seteDias = new Date(hoje);
    seteDias.setDate(hoje.getDate() + 7);

    const chequesRef = collection(db, 'cheques');
    const q = query(
        chequesRef,
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'Pendente'),
        where('dataVencimento', '>=', Timestamp.fromDate(hoje)),
        where('dataVencimento', '<=', Timestamp.fromDate(seteDias))
    );

    onSnapshot(q, (snapshot) => {
        const badge = document.querySelector('.notification-badge');
        if (snapshot.size > 0) {
            badge.textContent = snapshot.size;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Settings menu toggle
    configBtn.addEventListener('click', () => {
        settingsMenu.classList.toggle('visible');
    });

    // Close settings menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && !configBtn.contains(e.target)) {
            settingsMenu.classList.remove('visible');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        if (confirm('Deseja realmente sair?')) {
            try {
                await auth.signOut();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao fazer logout');
            }
        }
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupNotificationBadge();
}); 