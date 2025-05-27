/**
 * Componentes compartilhados - Menu do Perfil e Sistema de Notificações
 * Este arquivo gerencia funcionalidades comuns a todas as páginas
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class SharedComponents {
    constructor() {
        this.currentUser = null;
        this.notifications = [];
        this.notificationsUnsubscribe = null;
        this.selectedCompanies = this.getSelectedCompanies();
        this.init();
    }

    init() {
        console.log('🔧 Inicializando componentes compartilhados...');
        this.setupAuth();
        this.setupProfileMenu();
        this.setupNotifications();
        this.setupMobileMenu();
        this.setupCompanyIndicator();
    }

    setupAuth() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            if (user) {
                this.updateUserDisplay(user);
                this.loadNotifications();
                this.loadUserCompanies();
            }
        });
    }

    updateUserDisplay(user) {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email?.split('@')[0] || 'Usuário';
        }
        
        this.setupLogoutButton();
    }

    setupLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && !logoutBtn.hasAttribute('data-listener-added')) {
            logoutBtn.setAttribute('data-listener-added', 'true');
            logoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    this.clearSelectedCompanies();
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                }
            });
        }
    }

    setupProfileMenu() {
        console.log('🔧 Configurando menu do perfil...');
        const profileBtn = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        
        if (profileBtn && profileDropdown && !profileBtn.hasAttribute('data-listener-added')) {
            profileBtn.setAttribute('data-listener-added', 'true');
            
            console.log('✅ Configurando event listeners do menu do perfil');
            
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🖱️ Menu do perfil clicado');
                
                // Fechar notificações se estiverem abertas
                const notificationDropdown = document.getElementById('notification-dropdown');
                if (notificationDropdown) {
                    notificationDropdown.classList.add('hidden');
                }
                
                // Toggle do menu do perfil
                profileDropdown.classList.toggle('hidden');
                
                console.log('📋 Menu do perfil:', profileDropdown.classList.contains('hidden') ? 'fechado' : 'aberto');
            });
            
            // Fechar dropdown clicando fora
            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                    profileDropdown.classList.add('hidden');
                }
            });
            
            console.log('🎯 Menu do perfil configurado com sucesso!');
        }
    }

    setupNotifications() {
        console.log('🔔 Configurando sistema de notificações...');
        const notificationBtn = document.getElementById('notification-btn');
        const notificationDropdown = document.getElementById('notification-dropdown');
        
        if (notificationBtn && notificationDropdown && !notificationBtn.hasAttribute('data-listener-added')) {
            notificationBtn.setAttribute('data-listener-added', 'true');
            
            console.log('✅ Configurando event listeners das notificações');
            
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🔔 Botão de notificações clicado');
                
                // Fechar menu do perfil se estiver aberto
                const profileDropdown = document.getElementById('profile-dropdown');
                if (profileDropdown) {
                    profileDropdown.classList.add('hidden');
                }
                
                // Toggle das notificações
                notificationDropdown.classList.toggle('hidden');
                
                console.log('📋 Notificações:', notificationDropdown.classList.contains('hidden') ? 'fechadas' : 'abertas');
                
                // Marcar notificações como lidas quando abrir
                if (!notificationDropdown.classList.contains('hidden')) {
                    this.markNotificationsAsRead();
                }
            });
            
            // Fechar dropdown clicando fora
            document.addEventListener('click', (e) => {
                if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
                    notificationDropdown.classList.add('hidden');
                }
            });
            
            // Inicializar o conteúdo das notificações
            this.initNotificationContent();
            
            console.log('🎯 Sistema de notificações configurado com sucesso!');
        }
    }

    initNotificationContent() {
        const notificationDropdown = document.getElementById('notification-dropdown');
        if (notificationDropdown && notificationDropdown.innerHTML.trim() === '') {
            notificationDropdown.innerHTML = `
                <div class="notification-header">
                    <h3>Notificações</h3>
                    <button class="btn-clear" onclick="sharedComponents.clearAllNotifications()">
                        <i class="fas fa-check"></i> Marcar todas como lidas
                    </button>
                </div>
                <div class="notification-body" id="notification-body">
                    <div class="notification-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>Nenhuma notificação</p>
                    </div>
                </div>
                <div class="notification-footer">
                    <a href="suporte.html" class="btn-view-all">Ver todas as notificações</a>
                </div>
            `;
        }
    }

    async loadNotifications() {
        if (!this.currentUser) return;
        
        try {
            console.log('🔔 Carregando notificações...');
            
            // Simular notificações para demonstração
            const mockNotifications = [
                {
                    id: '1',
                    title: 'Cheque vencendo',
                    message: 'Você tem 3 cheques vencendo esta semana',
                    time: '2 minutos atrás',
                    type: 'warning',
                    read: false
                },
                {
                    id: '2', 
                    title: 'Backup realizado',
                    message: 'Backup automático dos dados concluído com sucesso',
                    time: '1 hora atrás',
                    type: 'success',
                    read: false
                },
                {
                    id: '3',
                    title: 'Nova empresa cadastrada',
                    message: 'Empresa "Tech Solutions" foi adicionada ao sistema',
                    time: '3 horas atrás',
                    type: 'info',
                    read: true
                }
            ];
            
            this.notifications = mockNotifications;
            this.renderNotifications();
            this.updateNotificationBadge();
            
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
        }
    }

    renderNotifications() {
        const notificationBody = document.getElementById('notification-body');
        if (!notificationBody) return;
        
        if (this.notifications.length === 0) {
            notificationBody.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>Nenhuma notificação</p>
                </div>
            `;
            return;
        }
        
        const notificationsHtml = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${notification.time}</div>
                </div>
            </div>
        `).join('');
        
        notificationBody.innerHTML = notificationsHtml;
        
        // Adicionar event listeners para os itens de notificação
        notificationBody.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = item.dataset.id;
                this.markNotificationAsRead(notificationId);
            });
        });
    }

    getNotificationIcon(type) {
        const icons = {
            warning: 'exclamation-triangle',
            success: 'check-circle',
            info: 'info-circle',
            error: 'exclamation-circle'
        };
        return icons[type] || 'bell';
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;
        
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    markNotificationAsRead(notificationId) {
        this.notifications = this.notifications.map(notification => {
            if (notification.id === notificationId) {
                return { ...notification, read: true };
            }
            return notification;
        });
        
        this.renderNotifications();
        this.updateNotificationBadge();
    }

    markNotificationsAsRead() {
        this.notifications = this.notifications.map(notification => ({
            ...notification,
            read: true
        }));
        
        this.renderNotifications();
        this.updateNotificationBadge();
    }

    clearAllNotifications() {
        this.markNotificationsAsRead();
        
        // Opcional: remover todas as notificações
        setTimeout(() => {
            this.notifications = [];
            this.renderNotifications();
            this.updateNotificationBadge();
        }, 1000);
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn') || document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        
        if (mobileMenuBtn && sidebar && !mobileMenuBtn.hasAttribute('data-listener-added')) {
            mobileMenuBtn.setAttribute('data-listener-added', 'true');
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                
                // Criar overlay se não existir
                let overlay = document.querySelector('.sidebar-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'sidebar-overlay';
                    document.body.appendChild(overlay);
                    
                    overlay.addEventListener('click', () => {
                        sidebar.classList.remove('open');
                        overlay.classList.remove('show');
                    });
                }
                
                overlay.classList.toggle('show');
            });
        }
    }

    // ===== GESTÃO DE EMPRESAS =====

    setupCompanyIndicator() {
        console.log('🏢 Configurando indicador de empresa...');
        this.updateCompanyIndicator();
        
        // Se houver múltiplas empresas, permitir clique para ver/alterar
        const companyIndicator = document.getElementById('company-indicator');
        if (companyIndicator) {
            companyIndicator.addEventListener('click', (e) => {
                if (companyIndicator.classList.contains('multiple')) {
                    e.preventDefault();
                    this.showCompanySelector();
                }
            });
        }
    }

    getSelectedCompanies() {
        try {
            const stored = localStorage.getItem('selectedCompanies');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Erro ao recuperar empresas selecionadas:', error);
            return [];
        }
    }

    setSelectedCompanies(companies) {
        this.selectedCompanies = companies;
        localStorage.setItem('selectedCompanies', JSON.stringify(companies));
        this.updateCompanyIndicator();
        console.log('🏢 Empresas selecionadas atualizadas:', companies);
        
        // Disparar evento para outras páginas
        window.dispatchEvent(new CustomEvent('companiesChanged', { 
            detail: { companies } 
        }));
    }

    clearSelectedCompanies() {
        this.selectedCompanies = [];
        localStorage.removeItem('selectedCompanies');
        this.updateCompanyIndicator();
    }

    async loadUserCompanies() {
        if (!this.currentUser) return;
        
        try {
            console.log('🏢 Carregando empresas do usuário...');
            
            // Se não há empresas selecionadas, tentar carregar da primeira vez
            if (this.selectedCompanies.length === 0) {
                const companiesRef = collection(db, 'empresas');
                const q = query(companiesRef, where('createdBy', '==', this.currentUser.uid));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    const companies = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Se houver apenas uma empresa, selecioná-la automaticamente
                    if (companies.length === 1) {
                        this.setSelectedCompanies([companies[0]]);
                    }
                }
            }
            
            this.updateCompanyIndicator();
            
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
        }
    }

    updateCompanyIndicator() {
        const indicator = document.getElementById('company-indicator');
        const nameElement = document.getElementById('selected-company-name');
        
        if (!indicator || !nameElement) return;
        
        const companies = this.selectedCompanies;
        
        if (companies.length === 0) {
            indicator.classList.add('hidden');
            nameElement.textContent = 'Nenhuma empresa';
        } else if (companies.length === 1) {
            indicator.classList.remove('hidden', 'multiple');
            nameElement.textContent = companies[0].nome;
            indicator.title = `Empresa: ${companies[0].nome}`;
        } else {
            indicator.classList.remove('hidden');
            indicator.classList.add('multiple');
            nameElement.textContent = `${companies.length} empresas`;
            indicator.title = `Empresas selecionadas: ${companies.map(c => c.nome).join(', ')}`;
        }
    }

    showCompanySelector() {
        // Criar modal simples para mostrar/alterar empresas
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3><i class="fas fa-building"></i> Empresas Selecionadas</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="selected-companies-list">
                        ${this.selectedCompanies.map(company => `
                            <div class="company-item">
                                <i class="fas fa-building"></i>
                                <span>${company.nome}</span>
                                <small>${company.cnpj || ''}</small>
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-actions">
                        <a href="empresas.html" class="btn btn-primary">
                            <i class="fas fa-edit"></i> Gerenciar Empresas
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar modal
        const closeBtn = modal.querySelector('.modal-close');
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Auto-fechar após 5 segundos
        setTimeout(closeModal, 5000);
    }

    // Método público para outras páginas usarem
    getSelectedCompanyIds() {
        return this.selectedCompanies.map(c => c.id);
    }

    getSelectedCompanyNames() {
        return this.selectedCompanies.map(c => c.nome);
    }

    hasSelectedCompanies() {
        return this.selectedCompanies.length > 0;
    }
}

// Instância global dos componentes compartilhados
let sharedComponents = null;

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    if (!sharedComponents) {
        console.log('🚀 Inicializando componentes compartilhados...');
        sharedComponents = new SharedComponents();
        window.sharedComponents = sharedComponents; // Disponibilizar globalmente
    }
});

// Escutar mudanças na seleção de empresas
window.addEventListener('companiesChanged', (event) => {
    console.log('🏢 Empresas alteradas:', event.detail.companies);
});

export default SharedComponents; 