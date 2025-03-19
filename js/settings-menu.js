import { auth } from './firebase-config.js';

class SettingsMenu {
    constructor() {
        this.configBtn = document.getElementById('configBtn');
        this.settingsMenu = document.getElementById('settingsMenu');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        if (!this.configBtn || !this.settingsMenu) {
            console.error('Elementos do menu não encontrados');
            return;
        }

        this.init();
    }

    init() {
        // Adiciona evento de clique ao botão de configurações
        this.configBtn.addEventListener('click', this.toggleMenu.bind(this));

        // Fecha o menu quando clicar fora dele
        document.addEventListener('click', this.handleOutsideClick.bind(this));

        // Previne que cliques dentro do menu o fechem
        this.settingsMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        // Configura o botão de logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    toggleMenu(event) {
        event.stopPropagation();
        this.settingsMenu.classList.toggle('visible');
    }

    handleOutsideClick(event) {
        if (!this.settingsMenu.contains(event.target) && !this.configBtn.contains(event.target)) {
            this.settingsMenu.classList.remove('visible');
        }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            alert('Erro ao fazer logout. Tente novamente.');
        }
    }
}

// Inicializa o menu quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new SettingsMenu();
}); 