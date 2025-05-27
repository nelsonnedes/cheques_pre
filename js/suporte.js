// Importações do Firebase
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot,
    doc,
    updateDoc,
    where,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Importações locais
import { auth, db } from './firebase-config.js';
import { checkAuth, getCurrentUser } from './auth.js';
import { showToast, showLoading, hideLoading, formatDate } from './utils.js';

// Elementos DOM
const supportTabs = document.querySelectorAll('.support-tab');
const supportPanels = document.querySelectorAll('.support-panel');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-message');
const quickActions = document.querySelectorAll('.quick-action');
const faqSearch = document.getElementById('faq-search');
const faqCategories = document.querySelectorAll('.category-btn');
const faqItems = document.querySelectorAll('.faq-item');
const ticketFilters = document.querySelectorAll('.ticket-filter');
const newTicketBtn = document.getElementById('new-ticket');

// Estado global
let currentUser = null;
let chatUnsubscribe = null;
let faqData = [];
let ticketsData = [];

// Dados FAQ
const faqDatabase = [
    {
        id: 1,
        category: 'geral',
        question: 'Como faço para cadastrar um novo cheque?',
        answer: `
            <p>Para cadastrar um novo cheque, siga estes passos:</p>
            <ol>
                <li>Acesse o menu "Incluir Cheque" na barra lateral</li>
                <li>Preencha todos os campos obrigatórios (número, emitente, banco, etc.)</li>
                <li>Adicione uma imagem do cheque (opcional)</li>
                <li>Clique em "Salvar Cheque"</li>
            </ol>
            <p>Certifique-se de que o número do cheque não esteja duplicado no sistema.</p>
        `
    },
    {
        id: 2,
        category: 'geral',
        question: 'Como alterar o status de um cheque?',
        answer: `
            <p>Para alterar o status de um cheque:</p>
            <ol>
                <li>Vá para "Listar Cheques"</li>
                <li>Encontre o cheque desejado</li>
                <li>Clique no botão de ações (três pontos)</li>
                <li>Selecione a ação desejada (Compensar, Devolver, etc.)</li>
                <li>Confirme a operação</li>
            </ol>
        `
    },
    {
        id: 3,
        category: 'financeiro',
        question: 'Como são calculados os juros de cheques em atraso?',
        answer: `
            <p>O cálculo de juros segue estas regras:</p>
            <ul>
                <li>Taxa padrão: 2% ao mês (configurável)</li>
                <li>Cálculo proporcional aos dias de atraso</li>
                <li>Fórmula: Valor × (Taxa/30) × Dias de atraso</li>
                <li>Atualização automática diária</li>
            </ul>
            <p>Você pode configurar diferentes taxas por empresa nas configurações.</p>
        `
    },
    {
        id: 4,
        category: 'financeiro',
        question: 'Como gerar relatórios financeiros?',
        answer: `
            <p>Para gerar relatórios:</p>
            <ol>
                <li>Acesse "Relatórios" no menu principal</li>
                <li>Selecione o tipo de relatório desejado</li>
                <li>Defina o período de análise</li>
                <li>Aplique filtros se necessário</li>
                <li>Clique em "Gerar Relatório"</li>
                <li>Exporte em PDF ou Excel conforme necessário</li>
            </ol>
        `
    },
    {
        id: 5,
        category: 'tecnico',
        question: 'O sistema não está carregando. O que fazer?',
        answer: `
            <p>Tente estas soluções:</p>
            <ol>
                <li>Verifique sua conexão com a internet</li>
                <li>Limpe o cache do navegador (Ctrl+Shift+Delete)</li>
                <li>Tente acessar em modo anônimo/privado</li>
                <li>Verifique se há atualizações do navegador</li>
                <li>Se o problema persistir, entre em contato conosco</li>
            </ol>
        `
    },
    {
        id: 6,
        category: 'tecnico',
        question: 'Como fazer backup dos meus dados?',
        answer: `
            <p>Para fazer backup:</p>
            <ol>
                <li>Vá para "Configurações" → "Gerenciamento de Dados"</li>
                <li>Clique em "Exportar Dados"</li>
                <li>Aguarde o processamento</li>
                <li>Baixe o arquivo JSON gerado</li>
                <li>Guarde o arquivo em local seguro</li>
            </ol>
            <p>Recomendamos fazer backup mensalmente.</p>
        `
    },
    {
        id: 7,
        category: 'conta',
        question: 'Como alterar minha senha?',
        answer: `
            <p>Para alterar sua senha:</p>
            <ol>
                <li>Acesse "Configurações" → "Segurança"</li>
                <li>Clique em "Alterar Senha"</li>
                <li>Digite sua senha atual</li>
                <li>Digite a nova senha (mínimo 6 caracteres)</li>
                <li>Confirme a nova senha</li>
                <li>Clique em "Salvar"</li>
            </ol>
        `
    },
    {
        id: 8,
        category: 'conta',
        question: 'Como ativar a autenticação de dois fatores?',
        answer: `
            <p>Para ativar 2FA:</p>
            <ol>
                <li>Vá para "Configurações" → "Segurança"</li>
                <li>Encontre "Autenticação de Dois Fatores"</li>
                <li>Ative o switch</li>
                <li>Siga as instruções para configurar</li>
                <li>Guarde os códigos de backup em local seguro</li>
            </ol>
            <p>Isso aumentará significativamente a segurança da sua conta.</p>
        `
    }
];

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
        await initializeSupport();
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao carregar suporte', 'error');
    } finally {
        hideLoading();
    }
});

// Inicializar sistema de suporte
async function initializeSupport() {
    faqData = faqDatabase;
    await loadTickets();
    renderFAQ();
    initializeChat();
}

// Configurar event listeners
function setupEventListeners() {
    // Navegação entre abas
    supportTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tab.dataset.tab);
        });
    });

    // Chat
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Ações rápidas do chat
    quickActions.forEach(action => {
        action.addEventListener('click', () => {
            chatInput.value = action.textContent;
            sendMessage();
        });
    });

    // FAQ
    faqSearch.addEventListener('input', filterFAQ);
    faqCategories.forEach(btn => {
        btn.addEventListener('click', () => filterFAQByCategory(btn.dataset.category));
    });

    // Tickets
    ticketFilters.forEach(filter => {
        filter.addEventListener('change', filterTickets);
    });

    newTicketBtn.addEventListener('click', openNewTicketModal);
}

// Alternar entre abas
function switchTab(tabName) {
    // Remover classe active de todas as abas
    supportTabs.forEach(tab => tab.classList.remove('active'));
    supportPanels.forEach(panel => panel.classList.remove('active'));

    // Adicionar classe active na aba selecionada
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`${tabName}-panel`);

    if (activeTab && activePanel) {
        activeTab.classList.add('active');
        activePanel.classList.add('active');
    }

    // Inicializar funcionalidades específicas da aba
    if (tabName === 'chat') {
        initializeChat();
    } else if (tabName === 'tickets') {
        loadTickets();
    }
}

// ============================================================================
// SISTEMA DE CHAT
// ============================================================================

// Inicializar chat
function initializeChat() {
    if (chatUnsubscribe) {
        chatUnsubscribe();
    }

    // Escutar mensagens em tempo real
    const messagesQuery = query(
        collection(db, 'support-messages'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'asc')
    );

    chatUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderChatMessages(messages);
    });

    // Adicionar mensagem de boas-vindas se for a primeira vez
    if (chatMessages.children.length === 0) {
        addWelcomeMessage();
    }
}

// Adicionar mensagem de boas-vindas
function addWelcomeMessage() {
    const welcomeMessage = {
        id: 'welcome',
        text: 'Olá! Sou o assistente virtual do Sistema de Gestão Financeira. Como posso ajudá-lo hoje?',
        sender: 'assistant',
        timestamp: new Date()
    };
    
    renderMessage(welcomeMessage);
}

// Enviar mensagem
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    try {
        // Adicionar mensagem do usuário
        const userMessage = {
            userId: currentUser.uid,
            text: message,
            sender: 'user',
            timestamp: new Date()
        };

        await addDoc(collection(db, 'support-messages'), userMessage);

        // Limpar input
        chatInput.value = '';

        // Simular resposta do assistente
        setTimeout(() => {
            generateAssistantResponse(message);
        }, 1000);

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showToast('Erro ao enviar mensagem', 'error');
    }
}

// Gerar resposta do assistente
async function generateAssistantResponse(userMessage) {
    let response = '';

    // Respostas baseadas em palavras-chave
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('cheque') && lowerMessage.includes('cadastrar')) {
        response = 'Para cadastrar um novo cheque, acesse "Incluir Cheque" no menu lateral e preencha todos os campos obrigatórios. Precisa de mais detalhes sobre algum campo específico?';
    } else if (lowerMessage.includes('senha') || lowerMessage.includes('login')) {
        response = 'Para alterar sua senha, vá em Configurações > Segurança > Alterar Senha. Se esqueceu sua senha, use a opção "Esqueci minha senha" na tela de login.';
    } else if (lowerMessage.includes('relatório') || lowerMessage.includes('relatorio')) {
        response = 'Você pode gerar relatórios acessando a seção "Relatórios" no menu principal. Lá você encontra relatórios de cheques, financeiros e de movimentação.';
    } else if (lowerMessage.includes('juros') || lowerMessage.includes('atraso')) {
        response = 'Os juros são calculados automaticamente para cheques em atraso. A taxa padrão é 2% ao mês, mas pode ser configurada por empresa. Quer saber como configurar?';
    } else if (lowerMessage.includes('backup') || lowerMessage.includes('exportar')) {
        response = 'Para fazer backup dos seus dados, vá em Configurações > Gerenciamento de Dados > Exportar Dados. Recomendamos fazer backup mensalmente.';
    } else if (lowerMessage.includes('problema') || lowerMessage.includes('erro') || lowerMessage.includes('bug')) {
        response = 'Sinto muito pelo problema! Pode me descrever o que está acontecendo? Enquanto isso, tente limpar o cache do navegador (Ctrl+Shift+Delete) e recarregar a página.';
    } else if (lowerMessage.includes('obrigado') || lowerMessage.includes('obrigada') || lowerMessage.includes('valeu')) {
        response = 'De nada! Fico feliz em ajudar. Se precisar de mais alguma coisa, estarei aqui! 😊';
    } else {
        response = 'Entendi sua pergunta. Para uma resposta mais específica, recomendo consultar nossa seção de FAQ ou criar um ticket de suporte. Posso ajudá-lo com mais alguma coisa?';
    }

    // Adicionar resposta do assistente
    const assistantMessage = {
        userId: currentUser.uid,
        text: response,
        sender: 'assistant',
        timestamp: new Date()
    };

    try {
        await addDoc(collection(db, 'support-messages'), assistantMessage);
    } catch (error) {
        console.error('Erro ao adicionar resposta do assistente:', error);
    }
}

// Renderizar mensagens do chat
function renderChatMessages(messages) {
    chatMessages.innerHTML = '';
    messages.forEach(message => renderMessage(message));
    scrollToBottom();
}

// Renderizar uma mensagem
function renderMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.sender === 'user' ? 'U' : 'A';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = message.text;
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatDate(message.timestamp);
    
    content.appendChild(text);
    content.appendChild(time);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
}

// Rolar para o final do chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============================================================================
// SISTEMA DE FAQ
// ============================================================================

// Renderizar FAQ
function renderFAQ(items = faqData) {
    const faqList = document.getElementById('faq-list');
    faqList.innerHTML = '';

    items.forEach(item => {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-item';
        faqItem.innerHTML = `
            <div class="faq-question" onclick="toggleFAQ(${item.id})">
                <h4>${item.question}</h4>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                ${item.answer}
            </div>
        `;
        faqList.appendChild(faqItem);
    });
}

// Filtrar FAQ por busca
function filterFAQ() {
    const searchTerm = faqSearch.value.toLowerCase();
    const filteredItems = faqData.filter(item => 
        item.question.toLowerCase().includes(searchTerm) ||
        item.answer.toLowerCase().includes(searchTerm)
    );
    renderFAQ(filteredItems);
}

// Filtrar FAQ por categoria
function filterFAQByCategory(category) {
    // Atualizar botões ativos
    faqCategories.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    // Filtrar itens
    if (category === 'todos') {
        renderFAQ(faqData);
    } else {
        const filteredItems = faqData.filter(item => item.category === category);
        renderFAQ(filteredItems);
    }
}

// Toggle FAQ item
window.toggleFAQ = function(id) {
    const faqItem = document.querySelector(`.faq-item:nth-child(${id})`);
    if (faqItem) {
        faqItem.classList.toggle('open');
    }
};

// ============================================================================
// SISTEMA DE TICKETS
// ============================================================================

// Carregar tickets
async function loadTickets() {
    try {
        const ticketsQuery = query(
            collection(db, 'support-tickets'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(ticketsQuery);
        ticketsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderTickets();

    } catch (error) {
        console.error('Erro ao carregar tickets:', error);
        showToast('Erro ao carregar tickets', 'error');
    }
}

// Renderizar tickets
function renderTickets(tickets = ticketsData) {
    const ticketsList = document.getElementById('tickets-list');
    
    if (tickets.length === 0) {
        ticketsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <h4>Nenhum ticket encontrado</h4>
                <p>Você ainda não criou nenhum ticket de suporte.</p>
                <button class="btn btn-primary" onclick="openNewTicketModal()">
                    <i class="fas fa-plus"></i>
                    Criar Novo Ticket
                </button>
            </div>
        `;
        return;
    }

    ticketsList.innerHTML = tickets.map(ticket => `
        <div class="ticket-item">
            <div class="ticket-header">
                <h4>${ticket.subject}</h4>
                <span class="status ${ticket.status}">${getStatusText(ticket.status)}</span>
            </div>
            <div class="ticket-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(ticket.createdAt)}</span>
                <span><i class="fas fa-tag"></i> ${ticket.priority}</span>
            </div>
            <p class="ticket-description">${ticket.description}</p>
            <div class="ticket-actions">
                <button class="btn btn-sm btn-outline" onclick="viewTicket('${ticket.id}')">
                    Ver Detalhes
                </button>
            </div>
        </div>
    `).join('');
}

// Filtrar tickets
function filterTickets() {
    const statusFilter = document.getElementById('status-filter').value;
    const priorityFilter = document.getElementById('priority-filter').value;

    let filteredTickets = ticketsData;

    if (statusFilter !== 'todos') {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === statusFilter);
    }

    if (priorityFilter !== 'todas') {
        filteredTickets = filteredTickets.filter(ticket => ticket.priority === priorityFilter);
    }

    renderTickets(filteredTickets);
}

// Abrir modal de novo ticket
function openNewTicketModal() {
    // Implementar modal de criação de ticket
    const subject = prompt('Assunto do ticket:');
    if (!subject) return;

    const description = prompt('Descrição do problema:');
    if (!description) return;

    const priority = prompt('Prioridade (baixa/media/alta):') || 'media';

    createTicket(subject, description, priority);
}

// Criar novo ticket
async function createTicket(subject, description, priority) {
    try {
        showLoading();

        const ticketData = {
            userId: currentUser.uid,
            subject,
            description,
            priority,
            status: 'aberto',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await addDoc(collection(db, 'support-tickets'), ticketData);
        showToast('Ticket criado com sucesso!', 'success');
        await loadTickets();

    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        showToast('Erro ao criar ticket', 'error');
    } finally {
        hideLoading();
    }
}

// Ver detalhes do ticket
window.viewTicket = function(ticketId) {
    const ticket = ticketsData.find(t => t.id === ticketId);
    if (ticket) {
        alert(`Ticket: ${ticket.subject}\n\nDescrição: ${ticket.description}\n\nStatus: ${getStatusText(ticket.status)}\n\nPrioridade: ${ticket.priority}`);
    }
};

// Obter texto do status
function getStatusText(status) {
    const statusMap = {
        'aberto': 'Aberto',
        'em-andamento': 'Em Andamento',
        'resolvido': 'Resolvido',
        'fechado': 'Fechado'
    };
    return statusMap[status] || status;
}

// ============================================================================
// WIDGET DE CHAT FLUTUANTE
// ============================================================================

// Inicializar widget de chat
function initializeChatWidget() {
    const chatWidget = document.createElement('div');
    chatWidget.className = 'chat-widget';
    chatWidget.innerHTML = `
        <button class="chat-toggle" onclick="toggleChatWidget()">
            <i class="fas fa-comments"></i>
            <span class="chat-badge" style="display: none;">1</span>
        </button>
    `;
    document.body.appendChild(chatWidget);
}

// Toggle do widget de chat
window.toggleChatWidget = function() {
    // Redirecionar para a página de suporte com aba de chat ativa
    window.location.href = 'suporte.html#chat';
};

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    if (chatUnsubscribe) {
        chatUnsubscribe();
    }
});

// Inicializar widget se não estiver na página de suporte
if (!window.location.pathname.includes('suporte.html')) {
    initializeChatWidget();
}

// Exportar funções para uso global
window.suporte = {
    switchTab,
    toggleFAQ,
    viewTicket,
    openNewTicketModal,
    toggleChatWidget
}; 