import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth } from './firebase-config.js';

export class ChatWidget {
    constructor() {
        this.db = getFirestore();
        this.currentUser = null;
        this.currentChat = null;
        this.supportSettings = null;
        this.isOpen = false;
        this.unsubscribeChat = null;
        
        this.init();
    }
    
    async init() {
        // Create widget container
        this.createWidget();
        
        // Load support settings
        await this.loadSupportSettings();
        
        // Setup auth listener
        auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            if (user) {
                await this.checkExistingChat();
            }
        });
    }
    
    async loadSupportSettings() {
        try {
            // Get support settings from admin user (first admin found)
            const adminsQuery = query(collection(this.db, 'users'), where('role', '==', 'admin'));
            const adminsSnap = await getDocs(adminsQuery);
            
            if (!adminsSnap.empty) {
                const adminDoc = adminsSnap.docs[0];
                const adminData = adminDoc.data();
                
                if (adminData.supportSettings) {
                    this.supportSettings = adminData.supportSettings;
                }
            }
        } catch (error) {
            console.error('Error loading support settings:', error);
        }
    }
    
    createWidget() {
        // Create widget button
        const button = document.createElement('button');
        button.className = 'chat-widget-button';
        button.innerHTML = '<i class="fas fa-comments"></i>';
        button.addEventListener('click', () => this.toggleWidget());
        
        // Create widget container
        const container = document.createElement('div');
        container.className = 'chat-widget-container';
        container.innerHTML = `
            <div class="chat-widget-header">
                <h3>Suporte</h3>
                <button class="chat-widget-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="chat-widget-messages"></div>
            <div class="chat-widget-input">
                <textarea placeholder="Digite sua mensagem..."></textarea>
                <button class="chat-widget-send">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(button);
        document.body.appendChild(container);
        
        // Setup event listeners
        container.querySelector('.chat-widget-close').addEventListener('click', () => this.toggleWidget());
        container.querySelector('.chat-widget-send').addEventListener('click', () => this.sendMessage());
        container.querySelector('textarea').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.container = container;
        this.button = button;
    }
    
    async checkExistingChat() {
        try {
            // Check for active chat
            const chatsQuery = query(
                collection(this.db, 'chats'),
                where('userId', '==', this.currentUser.uid),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            
            const chatsSnap = await getDocs(chatsQuery);
            
            if (!chatsSnap.empty) {
                this.currentChat = {
                    id: chatsSnap.docs[0].id,
                    ...chatsSnap.docs[0].data()
                };
                
                // Subscribe to messages
                this.subscribeToMessages();
            }
        } catch (error) {
            console.error('Error checking existing chat:', error);
        }
    }
    
    toggleWidget() {
        this.isOpen = !this.isOpen;
        this.container.classList.toggle('open', this.isOpen);
        
        if (this.isOpen && !this.currentChat) {
            this.startNewChat();
        }
    }
    
    async startNewChat() {
        try {
            if (!this.currentUser) {
                this.showMessage('system', 'Por favor, faça login para iniciar um chat.');
                return;
            }
            
            if (!this.supportSettings?.enabled) {
                this.showMessage('system', 'O suporte está temporariamente indisponível.');
                return;
            }
            
            // Check business hours
            const now = new Date();
            const currentTime = now.getHours() + ':' + now.getMinutes();
            const isWithinHours = this.isWithinBusinessHours(currentTime);
            
            if (!isWithinHours) {
                this.showMessage('system', this.supportSettings.offlineMessage);
                return;
            }
            
            // Create new chat
            const chatDoc = await addDoc(collection(this.db, 'chats'), {
                userId: this.currentUser.uid,
                userName: this.currentUser.displayName || this.currentUser.email,
                status: 'active',
                createdAt: serverTimestamp(),
                lastMessage: this.supportSettings.welcomeMessage,
                lastMessageAt: serverTimestamp()
            });
            
            this.currentChat = {
                id: chatDoc.id,
                userId: this.currentUser.uid,
                status: 'active'
            };
            
            // Add welcome message
            await addDoc(collection(this.db, 'messages'), {
                chatId: this.currentChat.id,
                type: 'support',
                content: this.supportSettings.welcomeMessage,
                createdAt: serverTimestamp()
            });
            
            // Subscribe to messages
            this.subscribeToMessages();
        } catch (error) {
            console.error('Error starting new chat:', error);
            this.showMessage('system', 'Erro ao iniciar chat. Tente novamente.');
        }
    }
    
    isWithinBusinessHours(currentTime) {
        if (!this.supportSettings?.businessHours) return false;
        
        const { start, end } = this.supportSettings.businessHours;
        return currentTime >= start && currentTime <= end;
    }
    
    subscribeToMessages() {
        if (this.unsubscribeChat) {
            this.unsubscribeChat();
        }
        
        const messagesQuery = query(
            collection(this.db, 'messages'),
            where('chatId', '==', this.currentChat.id),
            orderBy('createdAt', 'asc')
        );
        
        this.unsubscribeChat = onSnapshot(messagesQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    this.showMessage(message.type, message.content);
                }
            });
        });
    }
    
    async sendMessage() {
        const textarea = this.container.querySelector('textarea');
        const content = textarea.value.trim();
        
        if (!content) return;
        
        try {
            if (!this.currentChat) {
                await this.startNewChat();
            }
            
            if (this.currentChat) {
                // Add message
                await addDoc(collection(this.db, 'messages'), {
                    chatId: this.currentChat.id,
                    type: 'user',
                    content,
                    createdAt: serverTimestamp()
                });
                
                // Update chat
                await updateDoc(doc(this.db, 'chats', this.currentChat.id), {
                    lastMessage: content,
                    lastMessageAt: serverTimestamp()
                });
                
                // Clear input
                textarea.value = '';
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showMessage('system', 'Erro ao enviar mensagem. Tente novamente.');
        }
    }
    
    showMessage(type, content) {
        const messagesContainer = this.container.querySelector('.chat-widget-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.textContent = content;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Initialize chat widget
const chatWidget = new ChatWidget(); 