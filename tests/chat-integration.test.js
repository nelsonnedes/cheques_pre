import { ChatManager } from '../js/chat-manager.js';
import { auth, db } from '../js/firebase-config.js';

describe('Chat Integration Tests', () => {
    let chatManager;
    let chatContainer;
    let messageInput;
    let sendButton;

    beforeEach(() => {
        // Setup DOM elements
        document.body.innerHTML = `
            <div id="chatContainer" class="chat-container">
                <div id="chatMessages"></div>
                <div class="chat-input">
                    <textarea id="messageInput"></textarea>
                    <button id="sendMessage">Send</button>
                </div>
            </div>
        `;

        chatContainer = document.getElementById('chatContainer');
        messageInput = document.getElementById('messageInput');
        sendButton = document.getElementById('sendMessage');

        // Setup user and chat manager
        setupTestUser();
        chatManager = new ChatManager();
    });

    afterEach(() => {
        clearTestUser();
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Complete chat flow', () => {
        it('should handle full chat session', async () => {
            // Mock chat initialization
            const mockChatDoc = { id: 'test-chat-id' };
            db.getDocs.mockResolvedValueOnce({ empty: true });
            db.addDoc.mockResolvedValueOnce(mockChatDoc);

            // Initialize chat
            await chatManager.initChat();

            expect(chatManager.currentChatId).toBe('test-chat-id');

            // Mock message listener
            const mockMessages = [];
            db.onSnapshot.mockImplementation((query, callback) => {
                const unsubscribe = jest.fn();
                callback({
                    docChanges: () => mockMessages.map(msg => ({
                        type: 'added',
                        doc: { data: () => msg }
                    }))
                });
                return unsubscribe;
            });

            // Send first message
            const firstMessage = 'Hello, I need help';
            await chatManager.sendMessage(firstMessage);

            expect(db.addDoc).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    text: firstMessage,
                    type: 'user'
                })
            );

            // Simulate support response
            mockMessages.push({
                type: 'support',
                text: 'How can I help you today?',
                timestamp: { toDate: () => new Date() }
            });

            // Verify support message is rendered
            const supportMessage = document.querySelector('.chat-message.support');
            expect(supportMessage).toBeTruthy();
            expect(supportMessage.textContent).toContain('How can I help you today?');

            // Send follow-up message
            const followUpMessage = 'I have a question about my account';
            await chatManager.sendMessage(followUpMessage);

            expect(db.addDoc).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    text: followUpMessage,
                    type: 'user'
                })
            );

            // Close chat
            await chatManager.closeChat();

            expect(db.updateDoc).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    status: 'closed'
                })
            );
        });

        it('should handle network errors gracefully', async () => {
            // Mock network error
            db.getDocs.mockRejectedValueOnce(new Error('Network error'));

            // Try to initialize chat
            await expect(chatManager.initChat()).rejects.toThrow('Network error');

            // Verify error handling in UI
            expect(chatManager.currentChatId).toBeNull();
        });

        it('should handle message sending failures', async () => {
            // Setup initial chat
            const mockChatDoc = { id: 'test-chat-id' };
            db.getDocs.mockResolvedValueOnce({ empty: true });
            db.addDoc.mockResolvedValueOnce(mockChatDoc);
            await chatManager.initChat();

            // Mock message sending failure
            db.addDoc.mockRejectedValueOnce(new Error('Failed to send message'));

            // Try to send message
            await expect(chatManager.sendMessage('Test message')).rejects.toThrow('Failed to send message');
        });

        it('should update support status based on time', () => {
            jest.useFakeTimers();

            // Test during business hours
            const businessHour = new Date();
            businessHour.setHours(14);
            jest.setSystemTime(businessHour);

            let status = chatManager.checkSupportStatus();
            expect(status).toBeTruthy();

            // Test after business hours
            const afterHours = new Date();
            afterHours.setHours(22);
            jest.setSystemTime(afterHours);

            status = chatManager.checkSupportStatus();
            expect(status).toBeFalsy();

            jest.useRealTimers();
        });

        it('should maintain message history', async () => {
            // Setup chat
            const mockChatDoc = { id: 'test-chat-id' };
            db.getDocs.mockResolvedValueOnce({ empty: true });
            db.addDoc.mockResolvedValueOnce(mockChatDoc);
            await chatManager.initChat();

            // Mock message history
            const mockMessages = [
                {
                    type: 'user',
                    text: 'First message',
                    timestamp: { toDate: () => new Date() }
                },
                {
                    type: 'support',
                    text: 'First response',
                    timestamp: { toDate: () => new Date() }
                },
                {
                    type: 'user',
                    text: 'Second message',
                    timestamp: { toDate: () => new Date() }
                }
            ];

            // Simulate message history loading
            db.onSnapshot.mockImplementation((query, callback) => {
                callback({
                    docChanges: () => mockMessages.map(msg => ({
                        type: 'added',
                        doc: { data: () => msg }
                    }))
                });
                return jest.fn();
            });

            // Verify all messages are rendered
            const messages = document.querySelectorAll('.chat-message');
            expect(messages.length).toBe(mockMessages.length);

            // Verify message order
            expect(messages[0].textContent).toContain('First message');
            expect(messages[1].textContent).toContain('First response');
            expect(messages[2].textContent).toContain('Second message');
        });
    });
}); 