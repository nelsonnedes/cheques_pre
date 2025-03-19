import { ChatManager } from '../js/chat-manager.js';
import { auth, db } from '../js/firebase-config.js';

describe('ChatManager', () => {
    let chatManager;

    beforeEach(() => {
        setupTestUser();
        chatManager = new ChatManager();
    });

    afterEach(() => {
        clearTestUser();
    });

    describe('constructor', () => {
        it('should initialize with correct properties', () => {
            expect(chatManager.userId).toBe('test-user-id');
            expect(chatManager.currentChatId).toBeNull();
            expect(chatManager.unsubscribe).toBeNull();
            expect(chatManager.supportOnline).toBeFalsy();
        });
    });

    describe('initChat', () => {
        it('should create new chat if no active chat exists', async () => {
            const mockSnapshot = { empty: true };
            db.getDocs.mockResolvedValueOnce(mockSnapshot);

            const mockChatDoc = { id: 'new-chat-id' };
            db.addDoc.mockResolvedValueOnce(mockChatDoc);

            await chatManager.initChat();

            expect(db.collection).toHaveBeenCalledWith('chats');
            expect(db.query).toHaveBeenCalled();
            expect(db.addDoc).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    userId: 'test-user-id',
                    userEmail: 'test@example.com',
                    status: 'active'
                })
            );
            expect(chatManager.currentChatId).toBe('new-chat-id');
        });

        it('should use existing chat if active chat exists', async () => {
            const mockSnapshot = {
                empty: false,
                docs: [{ id: 'existing-chat-id' }]
            };
            db.getDocs.mockResolvedValueOnce(mockSnapshot);

            await chatManager.initChat();

            expect(db.collection).toHaveBeenCalledWith('chats');
            expect(db.query).toHaveBeenCalled();
            expect(db.addDoc).not.toHaveBeenCalled();
            expect(chatManager.currentChatId).toBe('existing-chat-id');
        });
    });

    describe('sendMessage', () => {
        beforeEach(() => {
            chatManager.currentChatId = 'test-chat-id';
        });

        it('should send message successfully', async () => {
            const messageText = 'Test message';

            await chatManager.sendMessage(messageText);

            expect(db.addDoc).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    chatId: 'test-chat-id',
                    userId: 'test-user-id',
                    text: messageText,
                    type: 'user'
                })
            );

            expect(db.updateDoc).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    lastMessage: messageText
                })
            );
        });

        it('should throw error if chat is not initialized', async () => {
            chatManager.currentChatId = null;

            await expect(chatManager.sendMessage('Test')).rejects.toThrow('Chat não inicializado');
        });
    });

    describe('closeChat', () => {
        beforeEach(() => {
            chatManager.currentChatId = 'test-chat-id';
            chatManager.unsubscribe = jest.fn();
        });

        it('should close chat successfully', async () => {
            await chatManager.closeChat();

            expect(db.updateDoc).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    status: 'closed'
                })
            );
            expect(chatManager.unsubscribe).toHaveBeenCalled();
            expect(chatManager.currentChatId).toBeNull();
        });

        it('should not attempt to close if no active chat', async () => {
            chatManager.currentChatId = null;

            await chatManager.closeChat();

            expect(db.updateDoc).not.toHaveBeenCalled();
            expect(chatManager.unsubscribe).not.toHaveBeenCalled();
        });
    });

    describe('checkSupportStatus', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return true during business hours', () => {
            const businessHour = new Date();
            businessHour.setHours(10);
            jest.setSystemTime(businessHour);

            const status = chatManager.checkSupportStatus();
            expect(status).toBeTruthy();
            expect(chatManager.supportOnline).toBeTruthy();
        });

        it('should return false outside business hours', () => {
            const afterHours = new Date();
            afterHours.setHours(20);
            jest.setSystemTime(afterHours);

            const status = chatManager.checkSupportStatus();
            expect(status).toBeFalsy();
            expect(chatManager.supportOnline).toBeFalsy();
        });
    });

    describe('renderMessage', () => {
        let mockContainer;

        beforeEach(() => {
            mockContainer = document.createElement('div');
            mockContainer.id = 'chatMessages';
            document.body.appendChild(mockContainer);
        });

        afterEach(() => {
            document.body.removeChild(mockContainer);
        });

        it('should render user message correctly', () => {
            const message = {
                type: 'user',
                text: 'Hello',
                timestamp: { toDate: () => new Date() }
            };

            chatManager.renderMessage(message);

            const messageElement = mockContainer.querySelector('.chat-message');
            expect(messageElement).toBeTruthy();
            expect(messageElement.classList.contains('user')).toBeTruthy();
            expect(messageElement.querySelector('p').textContent).toBe('Hello');
        });

        it('should render support message correctly', () => {
            const message = {
                type: 'support',
                text: 'How can I help?',
                timestamp: { toDate: () => new Date() }
            };

            chatManager.renderMessage(message);

            const messageElement = mockContainer.querySelector('.chat-message');
            expect(messageElement).toBeTruthy();
            expect(messageElement.classList.contains('support')).toBeTruthy();
            expect(messageElement.querySelector('p').textContent).toBe('How can I help?');
        });
    });
}); 