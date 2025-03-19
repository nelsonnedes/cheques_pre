import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    addDoc,
    serverTimestamp,
    limit 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth } from './firebase-config.js';

class SupportAdmin {
    constructor() {
        this.db = getFirestore();
        this.currentUser = null;
        this.selectedChat = null;
        this.activeChats = new Map();
        this.unsubscribeChats = null;
        this.unsubscribeMessages = null;
        this.supportSettings = null;
        
        this.init();
    }
    
    async init() {
        // Check if user is support agent
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const isAgent = await this.checkIfAgent(user);
                if (!isAgent) {
                    window.location.href = 'index.html';
                    return;
                }
                
                this.currentUser = user;
                this.initializeInterface();
                this.subscribeToChats();
                this.setupEventListeners();
            } else {
                window.location.href = 'login.html';
            }
        });
    }
    
    async checkIfAgent(user) {
        try {
            const userDoc = await getDoc(doc(this.db, 'users', user.uid));
            return userDoc.exists() && userDoc.data().role === 'admin';
        } catch (error) {
            console.error('Error checking user role:', error);
            return false;
        }
    }
    
    initializeInterface() {
        // Initialize metrics
        this.updateMetrics();
        
        // Initialize support availability toggle
        const supportAvailable = document.getElementById('supportAvailable');
        supportAvailable.addEventListener('change', () => this.toggleSupportAvailability());
        
        // Load current availability status
        this.loadSupportSettings();
    }
    
    async loadSupportSettings() {
        try {
            const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
            if (userDoc.exists()) {
                this.supportSettings = userDoc.data().supportSettings || {};
                document.getElementById('supportAvailable').checked = this.supportSettings.enabled || false;
                
                // Load quick responses
                this.updateQuickResponses();
            }
        } catch (error) {
            console.error('Error loading support settings:', error);
        }
    }
    
    async toggleSupportAvailability() {
        const isAvailable = document.getElementById('supportAvailable').checked;
        
        try {
            await updateDoc(doc(this.db, 'users', this.currentUser.uid), {
                'supportSettings.enabled': isAvailable
            });
        } catch (error) {
            console.error('Error updating support availability:', error);
            document.getElementById('supportAvailable').checked = !isAvailable;
        }
    }
    
    setupEventListeners() {
        // Chat filters
        document.querySelectorAll('.filter-buttons button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelector('.filter-buttons button.active').classList.remove('active');
                button.classList.add('active');
                this.filterChats(button.dataset.filter);
            });
        });
        
        // Quick responses
        const quickResponsesBtn = document.querySelector('.btn-quick');
        const quickResponsesMenu = document.getElementById('quickResponsesMenu');
        
        quickResponsesBtn.addEventListener('click', () => {
            quickResponsesMenu.classList.toggle('hidden');
        });
        
        document.addEventListener('click', (e) => {
            if (!quickResponsesBtn.contains(e.target) && !quickResponsesMenu.contains(e.target)) {
                quickResponsesMenu.classList.add('hidden');
            }
        });
        
        // Send message
        const sendButton = document.querySelector('.send-button');
        const textarea = document.querySelector('.chat-input textarea');
        
        sendButton.addEventListener('click', () => this.sendMessage());
        textarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Transfer chat
        document.getElementById('transferChat').addEventListener('click', () => this.showTransferModal());
        document.getElementById('cancelTransfer').addEventListener('click', () => this.hideTransferModal());
        document.getElementById('confirmTransfer').addEventListener('click', () => this.transferChat());
        
        // Close chat
        document.getElementById('closeChat').addEventListener('click', () => this.closeChat());
    }
    
    subscribeToChats() {
        if (this.unsubscribeChats) {
            this.unsubscribeChats();
        }
        
        const chatsQuery = query(
            collection(this.db, 'chats'),
            where('status', 'in', ['waiting', 'active']),
            orderBy('lastMessageAt', 'desc')
        );
        
        this.unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const chat = { id: change.doc.id, ...change.doc.data() };
                
                if (change.type === 'added' || change.type === 'modified') {
                    this.activeChats.set(chat.id, chat);
                    this.updateChatList(chat);
                } else if (change.type === 'removed') {
                    this.activeChats.delete(chat.id);
                    this.removeChatFromList(chat.id);
                }
            });
            
            this.updateMetrics();
        });
    }
    
    updateChatList(chat) {
        const chatsList = document.getElementById('chatsList');
        let chatItem = document.getElementById(`chat-${chat.id}`);
        
        if (!chatItem) {
            chatItem = document.createElement('div');
            chatItem.id = `chat-${chat.id}`;
            chatItem.className = 'chat-item';
            chatItem.addEventListener('click', () => this.selectChat(chat));
        }
        
        const lastMessageTime = chat.lastMessageAt ? new Date(chat.lastMessageAt.toDate()).toLocaleTimeString() : '';
        
        chatItem.innerHTML = `
            <div class="chat-item-header">
                <span class="user-name">${chat.userName}</span>
                <span class="chat-time">${lastMessageTime}</span>
            </div>
            <div class="chat-item-preview">
                <span class="last-message">${chat.lastMessage || ''}</span>
                ${chat.unreadCount ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
            </div>
            <div class="chat-item-footer">
                <span class="chat-status ${chat.status}">${chat.status === 'waiting' ? 'Em Espera' : 'Ativo'}</span>
            </div>
        `;
        
        if (!document.getElementById(`chat-${chat.id}`)) {
            chatsList.appendChild(chatItem);
        }
        
        if (this.selectedChat && chat.id === this.selectedChat.id) {
            chatItem.classList.add('active');
        }
    }
    
    removeChatFromList(chatId) {
        const chatItem = document.getElementById(`chat-${chatId}`);
        if (chatItem) {
            chatItem.remove();
        }
        
        if (this.selectedChat && chatId === this.selectedChat.id) {
            this.selectedChat = null;
            this.updateChatHeader();
            this.clearMessages();
        }
    }
    
    selectChat(chat) {
        // Remove active class from previous selection
        const previousActive = document.querySelector('.chat-item.active');
        if (previousActive) {
            previousActive.classList.remove('active');
        }
        
        // Add active class to new selection
        const chatItem = document.getElementById(`chat-${chat.id}`);
        if (chatItem) {
            chatItem.classList.add('active');
        }
        
        this.selectedChat = chat;
        this.updateChatHeader();
        this.subscribeToMessages();
        this.loadUserDetails();
        this.loadChatHistory();
    }
    
    updateChatHeader() {
        const header = document.querySelector('.chat-header');
        
        if (this.selectedChat) {
            header.querySelector('.user-info h3').textContent = this.selectedChat.userName;
            header.querySelector('.user-status').textContent = 
                this.selectedChat.status === 'waiting' ? 'Em Espera' : 'Em Atendimento';
        } else {
            header.querySelector('.user-info h3').textContent = 'Selecione um chat';
            header.querySelector('.user-status').textContent = '';
        }
    }
    
    subscribeToMessages() {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
        }
        
        if (!this.selectedChat) return;
        
        const messagesQuery = query(
            collection(this.db, 'messages'),
            where('chatId', '==', this.selectedChat.id),
            orderBy('createdAt', 'asc')
        );
        
        this.unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.displayMessage(change.doc.data());
                }
            });
        });
    }
    
    displayMessage(message) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.type}`;
        
        const time = message.createdAt ? new Date(message.createdAt.toDate()).toLocaleTimeString() : '';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.type === 'user' ? this.selectedChat.userName : 'Suporte'}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">
                <p>${message.content}</p>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    async sendMessage() {
        if (!this.selectedChat) return;
        
        const textarea = document.querySelector('.chat-input textarea');
        const content = textarea.value.trim();
        
        if (!content) return;
        
        try {
            // Add message
            await addDoc(collection(this.db, 'messages'), {
                chatId: this.selectedChat.id,
                type: 'support',
                content,
                createdAt: serverTimestamp()
            });
            
            // Update chat
            await updateDoc(doc(this.db, 'chats', this.selectedChat.id), {
                lastMessage: content,
                lastMessageAt: serverTimestamp(),
                status: 'active'
            });
            
            // Clear input
            textarea.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
    
    async loadUserDetails() {
        if (!this.selectedChat) return;
        
        try {
            const userDoc = await getDoc(doc(this.db, 'users', this.selectedChat.userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                document.getElementById('userName').textContent = userData.name || this.selectedChat.userName;
                document.getElementById('userEmail').textContent = userData.email || '-';
                document.getElementById('lastAccess').textContent = 
                    userData.lastLogin ? new Date(userData.lastLogin.toDate()).toLocaleString() : '-';
            }
        } catch (error) {
            console.error('Error loading user details:', error);
        }
    }
    
    async loadChatHistory() {
        if (!this.selectedChat) return;
        
        try {
            const historyQuery = query(
                collection(this.db, 'chats'),
                where('userId', '==', this.selectedChat.userId),
                where('status', '==', 'closed'),
                orderBy('createdAt', 'desc'),
                limit(5)
            );
            
            const historySnap = await getDocs(historyQuery);
            const historyContainer = document.getElementById('chatHistory');
            historyContainer.innerHTML = '';
            
            historySnap.forEach((doc) => {
                const chat = doc.data();
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                const date = chat.createdAt ? new Date(chat.createdAt.toDate()).toLocaleDateString() : '-';
                
                historyItem.innerHTML = `
                    <div class="history-date">${date}</div>
                    <div class="history-summary">
                        <span>${chat.messageCount || 0} mensagens</span>
                        <span>${chat.duration || '-'}</span>
                    </div>
                `;
                
                historyContainer.appendChild(historyItem);
            });
            
            if (historySnap.empty) {
                historyContainer.innerHTML = '<p>Nenhum histórico encontrado</p>';
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }
    
    updateQuickResponses() {
        const menu = document.getElementById('quickResponsesMenu');
        menu.innerHTML = '';
        
        if (this.supportSettings?.quickResponses) {
            this.supportSettings.quickResponses.forEach((response) => {
                const item = document.createElement('div');
                item.className = 'quick-response';
                item.textContent = response;
                item.addEventListener('click', () => {
                    document.querySelector('.chat-input textarea').value = response;
                    menu.classList.add('hidden');
                });
                menu.appendChild(item);
            });
        }
    }
    
    showTransferModal() {
        if (!this.selectedChat) return;
        
        const modal = document.getElementById('transferModal');
        modal.classList.add('show');
        
        // Load available agents
        this.loadAvailableAgents();
    }
    
    async loadAvailableAgents() {
        try {
            const agentsQuery = query(
                collection(this.db, 'users'),
                where('role', '==', 'admin')
            );
            
            const agentsSnap = await getDocs(agentsQuery);
            const select = document.getElementById('transferAgent');
            select.innerHTML = '';
            
            agentsSnap.forEach((doc) => {
                if (doc.id !== this.currentUser.uid) {
                    const agent = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = agent.name || agent.email;
                    select.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Error loading agents:', error);
        }
    }
    
    hideTransferModal() {
        document.getElementById('transferModal').classList.remove('show');
    }
    
    async transferChat() {
        if (!this.selectedChat) return;
        
        const agentId = document.getElementById('transferAgent').value;
        const reason = document.getElementById('transferReason').value.trim();
        
        if (!agentId) {
            alert('Selecione um agente para transferir o chat.');
            return;
        }
        
        try {
            await updateDoc(doc(this.db, 'chats', this.selectedChat.id), {
                agentId,
                transferReason: reason,
                transferredAt: serverTimestamp(),
                transferredBy: this.currentUser.uid
            });
            
            // Add system message about transfer
            await addDoc(collection(this.db, 'messages'), {
                chatId: this.selectedChat.id,
                type: 'system',
                content: 'Chat transferido para outro agente.',
                createdAt: serverTimestamp()
            });
            
            this.hideTransferModal();
        } catch (error) {
            console.error('Error transferring chat:', error);
            alert('Erro ao transferir chat. Tente novamente.');
        }
    }
    
    async closeChat() {
        if (!this.selectedChat) return;
        
        if (!confirm('Tem certeza que deseja encerrar este chat?')) return;
        
        try {
            await updateDoc(doc(this.db, 'chats', this.selectedChat.id), {
                status: 'closed',
                closedAt: serverTimestamp(),
                closedBy: this.currentUser.uid
            });
            
            // Add system message about closing
            await addDoc(collection(this.db, 'messages'), {
                chatId: this.selectedChat.id,
                type: 'system',
                content: 'Chat encerrado pelo suporte.',
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error closing chat:', error);
            alert('Erro ao encerrar chat. Tente novamente.');
        }
    }
    
    filterChats(filter) {
        const chatItems = document.querySelectorAll('.chat-item');
        
        chatItems.forEach((item) => {
            const chatId = item.id.replace('chat-', '');
            const chat = this.activeChats.get(chatId);
            
            if (!chat) return;
            
            if (filter === 'all' || 
                (filter === 'waiting' && chat.status === 'waiting') ||
                (filter === 'active' && chat.status === 'active')) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    updateMetrics() {
        let activeCount = 0;
        let waitingCount = 0;
        let totalResponseTime = 0;
        let responseCount = 0;
        
        this.activeChats.forEach((chat) => {
            if (chat.status === 'active') {
                activeCount++;
            } else if (chat.status === 'waiting') {
                waitingCount++;
            }
            
            if (chat.firstResponseTime) {
                totalResponseTime += chat.firstResponseTime;
                responseCount++;
            }
        });
        
        document.getElementById('activeChats').textContent = activeCount;
        document.getElementById('waitingChats').textContent = waitingCount;
        
        const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
        document.getElementById('avgResponseTime').textContent = `${avgResponseTime}min`;
        
        // Count resolved chats today
        this.countResolvedToday();
    }
    
    async countResolvedToday() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const resolvedQuery = query(
                collection(this.db, 'chats'),
                where('status', '==', 'closed'),
                where('closedAt', '>=', today)
            );
            
            const resolvedSnap = await getDocs(resolvedQuery);
            document.getElementById('resolvedToday').textContent = resolvedSnap.size;
        } catch (error) {
            console.error('Error counting resolved chats:', error);
        }
    }
    
    clearMessages() {
        document.getElementById('chatMessages').innerHTML = '';
    }
}

// Initialize support admin
const supportAdmin = new SupportAdmin(); 