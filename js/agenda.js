// Importações do Firebase
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    where,
    getDocs,
    getDoc
} from 'firebase/firestore';

// Importações locais
import { auth, db } from './config.js';
import { checkAuth, getCurrentUser } from './auth.js';
import { showToast, showLoading, hideLoading, formatDate, formatCurrency } from './utils.js';

// Elementos DOM
const calendarView = document.getElementById('calendar-view');
const listView = document.getElementById('list-view');
const viewToggle = document.querySelectorAll('.view-toggle');
const calendarGrid = document.getElementById('calendar-grid');
const eventsList = document.getElementById('events-list');
const currentMonthElement = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const todayBtn = document.getElementById('today-btn');
const newEventBtn = document.getElementById('new-event');
const eventModal = document.getElementById('event-modal');
const eventForm = document.getElementById('event-form');
const closeModalBtn = document.querySelector('.close-modal');
const filterButtons = document.querySelectorAll('.filter-btn');

// Estado global
let currentUser = null;
let currentDate = new Date();
let currentView = 'calendar';
let events = [];
let filteredEvents = [];
let activeFilters = ['todos'];

// Tipos de eventos
const eventTypes = {
    'vencimento': { color: '#ef4444', icon: 'fas fa-calendar-times', label: 'Vencimento' },
    'compensacao': { color: '#10b981', icon: 'fas fa-check-circle', label: 'Compensação' },
    'reuniao': { color: '#3b82f6', icon: 'fas fa-users', label: 'Reunião' },
    'lembrete': { color: '#f59e0b', icon: 'fas fa-bell', label: 'Lembrete' },
    'tarefa': { color: '#8b5cf6', icon: 'fas fa-tasks', label: 'Tarefa' }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        
        // Verificar autenticação
        const user = await checkAuth();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        await initializeAgenda();
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao carregar agenda', 'error');
    } finally {
        hideLoading();
    }
});

// Inicializar agenda
async function initializeAgenda() {
    await loadEvents();
    await loadCheckEvents();
    renderCalendar();
    renderEventsList();
    updateSummary();
}

// Configurar event listeners
function setupEventListeners() {
    // Navegação do calendário
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // Toggle de visualização
    viewToggle.forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });

    // Filtros
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleFilter(btn.dataset.filter);
        });
    });

    // Modal de evento
    newEventBtn.addEventListener('click', openEventModal);
    closeModalBtn.addEventListener('click', closeEventModal);
    eventForm.addEventListener('submit', handleEventSubmit);

    // Fechar modal clicando fora
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) {
            closeEventModal();
        }
    });

    // Tecla ESC para fechar modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !eventModal.classList.contains('hidden')) {
            closeEventModal();
        }
    });
}

// Carregar eventos
async function loadEvents() {
    try {
        const eventsQuery = query(
            collection(db, 'events'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'asc')
        );

        const snapshot = await getDocs(eventsQuery);
        events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate()
        }));

        applyFilters();

    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        showToast('Erro ao carregar eventos', 'error');
    }
}

// Carregar eventos de cheques
async function loadCheckEvents() {
    try {
        const chequesQuery = query(
            collection(db, 'cheques'),
            where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(chequesQuery);
        const checkEvents = [];

        snapshot.docs.forEach(doc => {
            const cheque = doc.data();
            const vencimento = cheque.vencimento.toDate();
            
            // Adicionar evento de vencimento
            checkEvents.push({
                id: `cheque-${doc.id}`,
                title: `Vencimento - Cheque ${cheque.numero}`,
                description: `Emitente: ${cheque.emitente}\nValor: ${formatCurrency(cheque.valor)}`,
                date: vencimento,
                time: '09:00',
                type: 'vencimento',
                priority: 'alta',
                chequeId: doc.id,
                isCheckEvent: true
            });

            // Se o cheque está em atraso, adicionar evento de cobrança
            if (vencimento < new Date() && cheque.status === 'pendente') {
                const diasAtraso = Math.floor((new Date() - vencimento) / (1000 * 60 * 60 * 24));
                checkEvents.push({
                    id: `cobranca-${doc.id}`,
                    title: `Cobrança - Cheque ${cheque.numero} (${diasAtraso} dias)`,
                    description: `Emitente: ${cheque.emitente}\nValor: ${formatCurrency(cheque.valor)}\nEm atraso há ${diasAtraso} dias`,
                    date: new Date(),
                    time: '14:00',
                    type: 'lembrete',
                    priority: 'alta',
                    chequeId: doc.id,
                    isCheckEvent: true
                });
            }
        });

        // Adicionar eventos de cheques aos eventos gerais
        events = [...events, ...checkEvents];
        applyFilters();

    } catch (error) {
        console.error('Erro ao carregar eventos de cheques:', error);
    }
}

// Aplicar filtros
function applyFilters() {
    if (activeFilters.includes('todos')) {
        filteredEvents = events;
    } else {
        filteredEvents = events.filter(event => 
            activeFilters.includes(event.type) || 
            activeFilters.includes(event.priority)
        );
    }

    if (currentView === 'calendar') {
        renderCalendar();
    } else {
        renderEventsList();
    }
    
    updateSummary();
}

// Toggle filtro
function toggleFilter(filter) {
    const btn = document.querySelector(`[data-filter="${filter}"]`);
    
    if (filter === 'todos') {
        // Se clicar em "todos", desmarcar outros filtros
        activeFilters = ['todos'];
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    } else {
        // Remover "todos" se selecionar filtro específico
        if (activeFilters.includes('todos')) {
            activeFilters = [];
            document.querySelector('[data-filter="todos"]').classList.remove('active');
        }
        
        // Toggle do filtro atual
        if (activeFilters.includes(filter)) {
            activeFilters = activeFilters.filter(f => f !== filter);
            btn.classList.remove('active');
        } else {
            activeFilters.push(filter);
            btn.classList.add('active');
        }
        
        // Se nenhum filtro ativo, voltar para "todos"
        if (activeFilters.length === 0) {
            activeFilters = ['todos'];
            document.querySelector('[data-filter="todos"]').classList.add('active');
        }
    }
    
    applyFilters();
}

// Alternar visualização
function switchView(view) {
    currentView = view;
    
    // Atualizar botões
    viewToggle.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    // Mostrar/ocultar visualizações
    if (view === 'calendar') {
        calendarView.classList.remove('hidden');
        listView.classList.add('hidden');
        renderCalendar();
    } else {
        calendarView.classList.add('hidden');
        listView.classList.remove('hidden');
        renderEventsList();
    }
}

// Renderizar calendário
function renderCalendar() {
    // Atualizar título do mês
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    currentMonthElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    // Limpar grid
    calendarGrid.innerHTML = '';
    
    // Adicionar cabeçalhos dos dias
    const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Calcular primeiro dia do mês e número de dias
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Renderizar 42 dias (6 semanas)
    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);
        
        const dayCell = createDayCell(cellDate);
        calendarGrid.appendChild(dayCell);
    }
}

// Criar célula do dia
function createDayCell(date) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
    const isToday = date.toDateString() === new Date().toDateString();
    
    if (!isCurrentMonth) {
        dayCell.classList.add('other-month');
    }
    
    if (isToday) {
        dayCell.classList.add('today');
    }
    
    // Número do dia
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    dayCell.appendChild(dayNumber);
    
    // Eventos do dia
    const dayEvents = filteredEvents.filter(event => 
        event.date.toDateString() === date.toDateString()
    );
    
    if (dayEvents.length > 0) {
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';
        
        dayEvents.slice(0, 3).forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'day-event';
            eventElement.style.backgroundColor = eventTypes[event.type]?.color || '#6b7280';
            eventElement.textContent = event.title;
            eventElement.title = `${event.title}\n${event.time}\n${event.description}`;
            eventElement.addEventListener('click', (e) => {
                e.stopPropagation();
                openEventModal(event);
            });
            eventsContainer.appendChild(eventElement);
        });
        
        if (dayEvents.length > 3) {
            const moreEvents = document.createElement('div');
            moreEvents.className = 'more-events';
            moreEvents.textContent = `+${dayEvents.length - 3} mais`;
            eventsContainer.appendChild(moreEvents);
        }
        
        dayCell.appendChild(eventsContainer);
    }
    
    // Click para criar evento
    dayCell.addEventListener('click', () => {
        openEventModal(null, date);
    });
    
    return dayCell;
}

// Renderizar lista de eventos
function renderEventsList() {
    eventsList.innerHTML = '';
    
    if (filteredEvents.length === 0) {
        eventsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <h4>Nenhum evento encontrado</h4>
                <p>Não há eventos para os filtros selecionados.</p>
            </div>
        `;
        return;
    }
    
    // Agrupar eventos por data
    const eventsByDate = {};
    filteredEvents.forEach(event => {
        const dateKey = event.date.toDateString();
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
    });
    
    // Renderizar grupos
    Object.keys(eventsByDate).sort().forEach(dateKey => {
        const date = new Date(dateKey);
        const dayEvents = eventsByDate[dateKey];
        
        // Cabeçalho do dia
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `
            <h3>${formatDate(date)}</h3>
            <span class="event-count">${dayEvents.length} evento(s)</span>
        `;
        eventsList.appendChild(dayHeader);
        
        // Eventos do dia
        const dayEventsContainer = document.createElement('div');
        dayEventsContainer.className = 'day-events-list';
        
        dayEvents.forEach(event => {
            const eventElement = createEventListItem(event);
            dayEventsContainer.appendChild(eventElement);
        });
        
        eventsList.appendChild(dayEventsContainer);
    });
}

// Criar item da lista de eventos
function createEventListItem(event) {
    const eventElement = document.createElement('div');
    eventElement.className = 'event-item';
    
    const eventType = eventTypes[event.type] || eventTypes['lembrete'];
    
    eventElement.innerHTML = `
        <div class="event-icon" style="background-color: ${eventType.color}">
            <i class="${eventType.icon}"></i>
        </div>
        <div class="event-content">
            <div class="event-header">
                <h4>${event.title}</h4>
                <span class="event-time">${event.time}</span>
            </div>
            <p class="event-description">${event.description}</p>
            <div class="event-meta">
                <span class="event-type">${eventType.label}</span>
                <span class="event-priority priority-${event.priority}">${event.priority}</span>
            </div>
        </div>
        <div class="event-actions">
            ${!event.isCheckEvent ? `
                <button class="btn-icon" onclick="editEvent('${event.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteEvent('${event.id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            ` : `
                <button class="btn-icon" onclick="viewCheck('${event.chequeId}')" title="Ver Cheque">
                    <i class="fas fa-eye"></i>
                </button>
            `}
        </div>
    `;
    
    return eventElement;
}

// Atualizar resumo
function updateSummary() {
    const today = new Date();
    const todayEvents = filteredEvents.filter(event => 
        event.date.toDateString() === today.toDateString()
    );
    
    const upcomingEvents = filteredEvents.filter(event => 
        event.date > today && event.date <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    );
    
    const overdueEvents = filteredEvents.filter(event => 
        event.date < today && event.type === 'vencimento'
    );
    
    document.getElementById('today-count').textContent = todayEvents.length;
    document.getElementById('upcoming-count').textContent = upcomingEvents.length;
    document.getElementById('overdue-count').textContent = overdueEvents.length;
}

// Abrir modal de evento
function openEventModal(event = null, selectedDate = null) {
    const isEdit = event !== null;
    
    // Configurar título do modal
    document.getElementById('modal-title').textContent = isEdit ? 'Editar Evento' : 'Novo Evento';
    
    // Preencher formulário
    if (isEdit) {
        document.getElementById('event-id').value = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.description;
        document.getElementById('event-date').value = event.date.toISOString().split('T')[0];
        document.getElementById('event-time').value = event.time;
        document.getElementById('event-type').value = event.type;
        document.getElementById('event-priority').value = event.priority;
    } else {
        eventForm.reset();
        document.getElementById('event-id').value = '';
        if (selectedDate) {
            document.getElementById('event-date').value = selectedDate.toISOString().split('T')[0];
        }
    }
    
    // Mostrar modal
    eventModal.classList.remove('hidden');
    document.getElementById('event-title').focus();
}

// Fechar modal de evento
function closeEventModal() {
    eventModal.classList.add('hidden');
    eventForm.reset();
}

// Submeter evento
async function handleEventSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading();
        
        const formData = new FormData(eventForm);
        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            date: new Date(formData.get('date')),
            time: formData.get('time'),
            type: formData.get('type'),
            priority: formData.get('priority'),
            userId: currentUser.uid,
            updatedAt: new Date()
        };
        
        const eventId = formData.get('id');
        
        if (eventId) {
            // Atualizar evento existente
            await updateDoc(doc(db, 'events', eventId), eventData);
            showToast('Evento atualizado com sucesso!', 'success');
        } else {
            // Criar novo evento
            eventData.createdAt = new Date();
            await addDoc(collection(db, 'events'), eventData);
            showToast('Evento criado com sucesso!', 'success');
        }
        
        closeEventModal();
        await loadEvents();
        
    } catch (error) {
        console.error('Erro ao salvar evento:', error);
        showToast('Erro ao salvar evento', 'error');
    } finally {
        hideLoading();
    }
}

// Editar evento
window.editEvent = function(eventId) {
    const event = events.find(e => e.id === eventId);
    if (event) {
        openEventModal(event);
    }
};

// Excluir evento
window.deleteEvent = async function(eventId) {
    if (!confirm('Tem certeza que deseja excluir este evento?')) {
        return;
    }
    
    try {
        showLoading();
        await deleteDoc(doc(db, 'events', eventId));
        showToast('Evento excluído com sucesso!', 'success');
        await loadEvents();
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        showToast('Erro ao excluir evento', 'error');
    } finally {
        hideLoading();
    }
};

// Ver cheque
window.viewCheck = function(chequeId) {
    window.location.href = `incluirCheque.html?id=${chequeId}`;
};

// Exportar funções para uso global
window.agenda = {
    switchView,
    toggleFilter,
    openEventModal,
    closeEventModal,
    editEvent,
    deleteEvent,
    viewCheck
}; 