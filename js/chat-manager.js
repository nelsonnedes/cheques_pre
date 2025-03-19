import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { auth } from './firebase-config.js';

class ChatManager {
    constructor() {
        this.db = getFirestore();
        this.chatsCollection = collection(this.db, 'chats');
        this.messagesCollection = collection(this.db, 'messages');
        this.currentChat = null;
        this.unsubscribeMessages = null;
        this.supportStatus = {
            online: false,
            lastChecked: null
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkSupportStatus();
    }

    initializeElements() {
        // Chat widget elements
        this.chatWidget = document.createElement('div');
        this.chatWidget.className = 'chat-widget';
        
        // Chat button
        this.chatButton = document.createElement('button');
        this.chatButton.className = 'chat-button';
        this.chatButton.innerHTML = '<i class="fas fa-comments"></i>';
        
        // Chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.className = 'chat-container hidden';
        this.chatContainer.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">
                    <i class="fas fa-headset"></i>
                    <span>Suporte Online</span>
                </div>
                <div class="chat-actions">
                    <button class="minimize-chat">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="close-chat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="support-status">
                <div class="status-indicator">
                    <i class="fas fa-circle"></i>
                    <span class="status-text">Verificando disponibilidade...</span>
                </div>
                <p class="status-message"></p>
            </div>
            <div class="chat-messages"></div>
            <div class="chat-input">
                <textarea placeholder="Digite sua mensagem..." rows="1"></textarea>
                <button class="send-button">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        
        // Append elements
        this.chatWidget.appendChild(this.chatButton);
        this.chatWidget.appendChild(this.chatContainer);
        document.body.appendChild(this.chatWidget);
        
        // Store references to elements
        this.messagesContainer = this.chatContainer.querySelector('.chat-messages');
        this.messageInput = this.chatContainer.querySelector('textarea');
        this.sendButton = this.chatContainer.querySelector('.send-button');
        this.statusIndicator = this.chatContainer.querySelector('.status-indicator');
        this.statusMessage = this.chatContainer.querySelector('.status-message');
    }

    setupEventListeners() {
        // Toggle chat
        this.chatButton.addEventListener('click', () => this.toggleChat());
        
        // Close chat
        this.chatContainer.querySelector('.close-chat').addEventListener('click', () => {
            this.chatContainer.classList.add('hidden');
        });
        
        // Minimize chat
        this.chatContainer.querySelector('.minimize-chat').addEventListener('click', () => {
            this.chatContainer.classList.add('hidden');
        });
        
        // Send message
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Send on Enter (Shift+Enter for new line)
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    async checkSupportStatus() {
        try {
            const now = new Date();
            const hour = now.getHours();
            
            // Suporte disponível das 8h às 18h em dias úteis
            const isBusinessHour = hour >= 8 && hour < 18;
            const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
            
            this.supportStatus = {
                online: isBusinessHour && isWeekday,
                lastChecked: now
            };
            
            this.updateStatusDisplay();
            
            // Verificar novamente a cada 5 minutos
            setTimeout(() => this.checkSupportStatus(), 5 * 60 * 1000);
        } catch (error) {
            console.error('Erro ao verificar status do suporte:', error);
        }
    }

    updateStatusDisplay() {
        const { online } = this.supportStatus;
        
        this.statusIndicator.className = `status-indicator ${online ? 'online' : 'offline'}`;
        this.statusIndicator.querySelector('.status-text').textContent = 
            online ? 'Suporte Online' : 'Suporte Offline';
        
        this.statusMessage.textContent = online
            ? 'Estamos prontos para ajudar! Tempo médio de resposta: 5 minutos.'
            : 'Deixe sua mensagem e responderemos assim que possível.';
    }

    toggleChat() {
        const isHidden = this.chatContainer.classList.contains('hidden');
        
        if (isHidden) {
            this.chatContainer.classList.remove('hidden');
            this.messageInput.focus();
            this.loadOrCreateChat();
        } else {
            this.chatContainer.classList.add('hidden');
        }
    }

    async loadOrCreateChat() {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;
            
            // Buscar chat existente
            const chatQuery = query(
                this.chatsCollection,
                where('userId', '==', userId),
                where('status', '==', 'active')
            );
            
            const snapshot = await getDocs(chatQuery);
            
            if (snapshot.empty) {
                // Criar novo chat
                const chatDoc = await addDoc(this.chatsCollection, {
                    userId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    status: 'active',
                    userEmail: auth.currentUser.email,
                    userName: auth.currentUser.displayName || 'Usuário'
                });
                
                this.currentChat = chatDoc.id;
            } else {
                this.currentChat = snapshot.docs[0].id;
            }
            
            // Carregar mensagens
            this.subscribeToMessages();
            
        } catch (error) {
            console.error('Erro ao carregar/criar chat:', error);
            this.showError('Erro ao iniciar chat. Tente novamente.');
        }
    }

    subscribeToMessages() {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
        }
        
        const messagesQuery = query(
            this.messagesCollection,
            where('chatId', '==', this.currentChat),
            orderBy('createdAt', 'asc')
        );
        
        this.unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.displayMessage(change.doc.data());
                }
            });
            
            // Scroll to bottom
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || !this.currentChat) return;
        
        try {
            const userId = auth.currentUser?.uid;
            
            await addDoc(this.messagesCollection, {
                chatId: this.currentChat,
                userId,
                content,
                createdAt: serverTimestamp(),
                type: 'user'
            });
            
            // Atualizar timestamp do chat
            const chatRef = doc(this.chatsCollection, this.currentChat);
            await updateDoc(chatRef, {
                updatedAt: serverTimestamp()
            });
            
            // Limpar input
            this.messageInput.value = '';
            this.messageInput.style.height = 'auto';
            
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            this.showError('Erro ao enviar mensagem. Tente novamente.');
        }
    }

    displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${message.type === 'user' ? 'user' : 'support'}`;
        
        const time = message.createdAt?.toDate() || new Date();
        const timeString = time.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(message.content)}</p>
                <span class="message-time">${timeString}</span>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageElement);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showError(message) {
        // Implementar toast ou outro feedback visual
        console.error(message);
    }

    destroy() {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
        }
        
        if (this.chatWidget && this.chatWidget.parentNode) {
            this.chatWidget.parentNode.removeChild(this.chatWidget);
        }
    }
}

export const chatManager = new ChatManager(); 