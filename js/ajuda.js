import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class AjudaManager {
    constructor() {
        this.searchInput = document.getElementById('searchHelp');
        this.faqItems = document.querySelectorAll('.faq-item');
        this.helpSections = document.querySelectorAll('.help-section');
        this.chatButton = document.getElementById('openChat');
        
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.setupSearch();
        this.setupFAQAccordion();
    }

    checkAuth() {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = 'login.html';
            }
        });
    }

    setupEventListeners() {
        // FAQ accordion
        this.faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                const answer = item.querySelector('.faq-answer');
                const icon = question.querySelector('i');
                
                // Toggle active class
                item.classList.toggle('active');
                
                // Rotate icon
                icon.style.transform = item.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
                
                // Toggle answer visibility with animation
                if (item.classList.contains('active')) {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                } else {
                    answer.style.maxHeight = '0';
                }
            });
        });

        // Chat button
        if (this.chatButton) {
            this.chatButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.openChat();
            });
        }

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupSearch() {
        this.searchInput.addEventListener('input', () => {
            const searchTerm = this.searchInput.value.toLowerCase();
            
            if (searchTerm.length < 2) {
                this.showAllSections();
                return;
            }
            
            this.helpSections.forEach(section => {
                const content = section.textContent.toLowerCase();
                const isMatch = content.includes(searchTerm);
                
                if (section.id === 'quickGuide') {
                    section.style.display = 'block'; // Always show quick guide
                } else {
                    section.style.display = isMatch ? 'block' : 'none';
                }
            });
        });
    }

    setupFAQAccordion() {
        // Initialize all FAQ answers as closed
        const answers = document.querySelectorAll('.faq-answer');
        answers.forEach(answer => {
            answer.style.maxHeight = '0';
        });
    }

    showAllSections() {
        this.helpSections.forEach(section => {
            section.style.display = 'block';
        });
    }

    openChat() {
        // Placeholder for chat functionality
        alert('Chat em desenvolvimento. Por favor, use outros canais de suporte por enquanto.');
    }

    // Método para destacar seções baseado em termos de pesquisa
    highlightSearchTerms(element, searchTerm) {
        const text = element.innerHTML;
        const regex = new RegExp(searchTerm, 'gi');
        element.innerHTML = text.replace(regex, match => `<mark>${match}</mark>`);
    }
}

// Inicializar
const ajudaManager = new AjudaManager();
window.ajudaManager = ajudaManager; // Para acesso global 