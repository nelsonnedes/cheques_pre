import { setupLoginForm } from './auth.js';

// Inicialização da página de login
document.addEventListener('DOMContentLoaded', () => {
  setupLoginForm();
});

// Configuração de ícones para toast
const toastIcons = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
};
