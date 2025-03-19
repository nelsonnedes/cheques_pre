import { auth, db } from './firebase-config.js';
import {
    collection,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM Elements
const supportForm = document.getElementById('supportForm');
const startChatBtn = document.getElementById('startChatBtn');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkSystemStatus();
});

// Setup event listeners
function setupEventListeners() {
    supportForm.addEventListener('submit', handleSupportForm);
    startChatBtn.addEventListener('click', startChat);
}

// Handle support form submission
async function handleSupportForm(e) {
    e.preventDefault();

    if (!auth.currentUser) {
        alert('Por favor, faça login para enviar uma solicitação de suporte.');
        return;
    }

    const formData = {
        subject: supportForm.subject.value,
        description: supportForm.description.value,
        priority: supportForm.priority.value,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        status: 'aberto',
        createdAt: serverTimestamp()
    };

    try {
        // Upload attachment if exists
        const attachment = supportForm.attachment.files[0];
        if (attachment) {
            formData.attachmentName = attachment.name;
            // Aqui você pode implementar o upload do arquivo para o Firebase Storage
        }

        // Save support ticket
        const ticketRef = await addDoc(collection(db, 'tickets'), formData);
        
        alert('Sua solicitação foi enviada com sucesso! Número do ticket: ' + ticketRef.id);
        supportForm.reset();

        // Send notification to support team (implement your notification system)
        notifySupport(ticketRef.id, formData);

    } catch (error) {
        console.error('Erro ao enviar solicitação:', error);
        alert('Erro ao enviar solicitação. Por favor, tente novamente.');
    }
}

// Start chat session
function startChat() {
    if (!auth.currentUser) {
        alert('Por favor, faça login para iniciar um chat.');
        return;
    }

    // Implement your chat system here
    alert('Funcionalidade de chat em desenvolvimento. Por favor, use outros canais de atendimento.');
}

// Check system status
async function checkSystemStatus() {
    try {
        const statusIndicators = document.querySelectorAll('.status-indicator');
        
        // Here you would implement real status checks
        // For now, we'll simulate all systems being online
        statusIndicators.forEach(indicator => {
            indicator.classList.add('online');
        });

    } catch (error) {
        console.error('Erro ao verificar status do sistema:', error);
    }
}

// Notify support team
function notifySupport(ticketId, ticketData) {
    // Implement your notification system here
    // This could be email, push notification, etc.
    console.log('Novo ticket:', ticketId, ticketData);
}

// Export functions for testing
export {
    handleSupportForm,
    startChat,
    checkSystemStatus,
    notifySupport
}; 