import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { formatCurrency, formatDate } from './utils.js';

class AgendaManager {
    constructor() {
        this.db = getFirestore();
        this.auth = getAuth();
        
        // Elementos da UI
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.currentMonthEl = document.getElementById('currentMonth');
        this.currentDayEl = document.getElementById('currentDay');
        this.calendarGrid = document.getElementById('calendarGrid');
        this.weekDays = document.getElementById('weekDays');
        this.weekGrid = document.getElementById('weekGrid');
        this.dayGrid = document.getElementById('dayGrid');
        this.eventModal = document.getElementById('eventModal');
        
        // Views
        this.monthView = document.getElementById('monthViewContainer');
        this.weekView = document.getElementById('weekViewContainer');
        this.dayView = document.getElementById('dayViewContainer');
        
        // Estado
        this.currentDate = new Date();
        this.selectedView = 'month';
        this.events = [];
        this.empresas = new Map();
        
        this.init();
    }

    async init() {
        this.showLoading();
        try {
            await this.checkAuth();
            await this.loadEmpresas();
            this.setupEventListeners();
            await this.loadEvents();
            this.renderCalendar();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            alert('Erro ao carregar os dados. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    checkAuth() {
        return new Promise((resolve, reject) => {
            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    document.getElementById('userName').textContent = user.email;
                    resolve(user);
                } else {
                    window.location.href = 'login.html';
                    reject('Usuário não autenticado');
                }
            });
        });
    }

    async loadEmpresas() {
        const empresasRef = collection(this.db, 'empresas');
        const snapshot = await getDocs(empresasRef);
        
        snapshot.forEach(doc => {
            this.empresas.set(doc.id, doc.data());
        });
    }

    setupEventListeners() {
        // Navegação do calendário
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Controles de visualização
        document.getElementById('monthView').addEventListener('click', () => this.changeView('month'));
        document.getElementById('weekView').addEventListener('click', () => this.changeView('week'));
        document.getElementById('dayView').addEventListener('click', () => this.changeView('day'));

        // Modal
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.eventModal.style.display = 'none');
        });

        window.addEventListener('click', (e) => {
            if (e.target === this.eventModal) {
                this.eventModal.style.display = 'none';
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }

    async loadEvents() {
        this.showLoading();
        try {
            const startDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const endDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
            
            const chequesRef = collection(this.db, 'cheques');
            const q = query(
                chequesRef,
                where('vencimento', '>=', startDate),
                where('vencimento', '<=', endDate)
            );
            
            const snapshot = await getDocs(q);
            this.events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
            alert('Erro ao carregar os cheques. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    renderCalendar() {
        this.updateHeader();
        
        switch (this.selectedView) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
        }
    }

    updateHeader() {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        this.currentMonthEl.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        this.currentDayEl.textContent = formatDate(this.currentDate);
    }

    renderMonthView() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        let html = '';
        let day = 1;
        let dayCount = 0;

        // Preencher dias vazios no início
        for (let i = 0; i < startingDay; i++) {
            html += '<div class="calendar-day empty"></div>';
            dayCount++;
        }

        // Preencher dias do mês
        while (day <= totalDays) {
            const currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const dayEvents = this.events.filter(event => {
                const eventDate = event.vencimento.toDate();
                return eventDate.getDate() === day &&
                       eventDate.getMonth() === this.currentDate.getMonth() &&
                       eventDate.getFullYear() === this.currentDate.getFullYear();
            });

            html += `
                <div class="calendar-day${dayEvents.length ? ' has-events' : ''}" data-date="${currentDate.toISOString()}">
                    <div class="day-header">
                        <span class="day-number">${day}</span>
                        ${dayEvents.length ? `<span class="event-count">${dayEvents.length}</span>` : ''}
                    </div>
                    <div class="day-events">
                        ${dayEvents.map(event => this.renderEventCard(event)).join('')}
                    </div>
                </div>
            `;

            day++;
            dayCount++;
        }

        // Preencher dias vazios no final
        while (dayCount % 7 !== 0) {
            html += '<div class="calendar-day empty"></div>';
            dayCount++;
        }

        this.calendarGrid.innerHTML = html;
        
        // Adicionar event listeners para os eventos
        this.calendarGrid.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEventDetails(card.dataset.id);
            });
        });
    }

    renderWeekView() {
        // Calcular início e fim da semana
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        // Renderizar cabeçalho dos dias
        let weekDaysHtml = '';
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            weekDaysHtml += `
                <div class="week-day">
                    <div class="day-name">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i]}</div>
                    <div class="day-date">${formatDate(day)}</div>
                </div>
            `;
        }
        this.weekDays.innerHTML = weekDaysHtml;

        // Filtrar eventos da semana
        const weekEvents = this.events.filter(event => {
            const eventDate = event.vencimento.toDate();
            return eventDate >= startOfWeek && eventDate <= endOfWeek;
        });

        // Renderizar eventos
        let weekGridHtml = '';
        for (let hour = 0; hour < 24; hour++) {
            weekGridHtml += `
                <div class="week-row">
                    <div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>
                    ${Array(7).fill(0).map((_, dayIndex) => {
                        const currentDate = new Date(startOfWeek);
                        currentDate.setDate(startOfWeek.getDate() + dayIndex);
                        currentDate.setHours(hour);
                        
                        const dayEvents = weekEvents.filter(event => {
                            const eventDate = event.vencimento.toDate();
                            return eventDate.getDate() === currentDate.getDate() &&
                                   eventDate.getMonth() === currentDate.getMonth() &&
                                   eventDate.getFullYear() === currentDate.getFullYear() &&
                                   eventDate.getHours() === hour;
                        });

                        return `
                            <div class="week-cell${dayEvents.length ? ' has-events' : ''}">
                                ${dayEvents.map(event => this.renderEventCard(event)).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        this.weekGrid.innerHTML = weekGridHtml;

        // Adicionar event listeners para os eventos
        this.weekGrid.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEventDetails(card.dataset.id);
            });
        });
    }

    renderDayView() {
        // Filtrar eventos do dia
        const dayEvents = this.events.filter(event => {
            const eventDate = event.vencimento.toDate();
            return eventDate.getDate() === this.currentDate.getDate() &&
                   eventDate.getMonth() === this.currentDate.getMonth() &&
                   eventDate.getFullYear() === this.currentDate.getFullYear();
        });

        // Renderizar slots de hora
        let dayGridHtml = '';
        for (let hour = 0; hour < 24; hour++) {
            const hourEvents = dayEvents.filter(event => {
                const eventDate = event.vencimento.toDate();
                return eventDate.getHours() === hour;
            });

            dayGridHtml += `
                <div class="day-row">
                    <div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>
                    <div class="day-cell${hourEvents.length ? ' has-events' : ''}">
                        ${hourEvents.map(event => this.renderEventCard(event)).join('')}
                    </div>
                </div>
            `;
        }
        this.dayGrid.innerHTML = dayGridHtml;

        // Adicionar event listeners para os eventos
        this.dayGrid.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEventDetails(card.dataset.id);
            });
        });
    }

    renderEventCard(event) {
        const empresa = this.empresas.get(event.empresaId) || { nome: 'N/A' };
        const statusClass = this.getStatusClass(event.status);
        
        return `
            <div class="event-card ${statusClass}" data-id="${event.id}">
                <div class="event-time">${formatDate(event.vencimento.toDate(), true)}</div>
                <div class="event-title">${event.numeroCheque}</div>
                <div class="event-details">
                    <span class="event-amount">${formatCurrency(event.valor)}</span>
                    <span class="event-company">${empresa.nome}</span>
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        switch (status) {
            case 'pendente': return 'status-pending';
            case 'compensado': return 'status-completed';
            case 'devolvido': return 'status-returned';
            case 'cancelado': return 'status-cancelled';
            default: return '';
        }
    }

    showEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const empresa = this.empresas.get(event.empresaId) || { nome: 'N/A' };
        
        document.getElementById('modalNumeroCheque').textContent = event.numeroCheque;
        document.getElementById('modalValor').textContent = formatCurrency(event.valor);
        document.getElementById('modalEmissor').textContent = event.emissor;
        document.getElementById('modalEmpresa').textContent = empresa.nome;
        document.getElementById('modalStatus').textContent = event.status;
        document.getElementById('modalVencimento').textContent = formatDate(event.vencimento.toDate());
        
        document.getElementById('verCheque').href = `editar-cheque.html?id=${eventId}`;
        
        this.eventModal.style.display = 'block';
    }

    changeView(view) {
        this.selectedView = view;
        
        // Atualizar botões
        document.querySelectorAll('.view-controls .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${view}View`).classList.add('active');
        
        // Atualizar containers
        this.monthView.classList.remove('active');
        this.weekView.classList.remove('active');
        this.dayView.classList.remove('active');
        
        switch (view) {
            case 'month':
                this.monthView.classList.add('active');
                break;
            case 'week':
                this.weekView.classList.add('active');
                break;
            case 'day':
                this.dayView.classList.add('active');
                break;
        }
        
        this.renderCalendar();
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Inicialização
window.agendaManager = new AgendaManager(); 