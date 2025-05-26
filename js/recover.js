// Recuperação de Senha - Sistema Moderno
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-KfA6ZwWJ9E_rl6QjytrDSzWboiWeIos",
  authDomain: "dbcheques.firebaseapp.com",
  projectId: "dbcheques",
  storageBucket: "dbcheques.firebasestorage.app",
  messagingSenderId: "417151486713",
  appId: "1:417151486713:web:036af07778be521d447028"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elementos DOM
const form = document.getElementById('recover-form');
const emailInput = document.getElementById('email');
const recoverBtn = document.getElementById('recover-btn');
const successMessage = document.getElementById('success-message');
const resendBtn = document.getElementById('resend-btn');
const loadingOverlay = document.getElementById('loading-overlay');

// Variável para controlar reenvio
let lastEmailSent = '';

// Função para validar email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para mostrar loading
function showLoading(show) {
  if (show) {
    recoverBtn.classList.add('loading');
    recoverBtn.disabled = true;
    loadingOverlay.classList.remove('hidden');
  } else {
    recoverBtn.classList.remove('loading');
    recoverBtn.disabled = false;
    loadingOverlay.classList.add('hidden');
  }
}

// Função para mostrar toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconHtml = getToastIcon(type);
  toast.innerHTML = `
    <div class="toast-content">
      ${iconHtml}
      <span>${message}</span>
    </div>
    <button onclick="this.parentElement.remove()" class="toast-close">
      <svg class="lucide lucide-x" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function getToastIcon(type) {
  const icons = {
    success: '<svg class="lucide lucide-check-circle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
    error: '<svg class="lucide lucide-alert-circle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    warning: '<svg class="lucide lucide-alert-triangle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg class="lucide lucide-info" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  return icons[type] || icons.info;
}

// Função para mostrar erro
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}-error`);
  
  if (field) field.classList.add('error');
  if (errorElement) {
    errorElement.innerHTML = `<svg class="lucide lucide-alert-circle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${message}`;
    errorElement.classList.add('show');
  }
}

// Função para limpar erro
function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}-error`);
  
  if (field) field.classList.remove('error');
  if (errorElement) errorElement.classList.remove('show');
}

// Função para mostrar tela de sucesso
function showSuccessMessage() {
  form.style.display = 'none';
  successMessage.classList.remove('hidden');
}

// Função para voltar ao formulário
function showForm() {
  form.style.display = 'block';
  successMessage.classList.add('hidden');
}

// Função para obter mensagem de erro do Firebase
function getFirebaseErrorMessage(errorCode) {
  const errorMessages = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-not-found': 'E-mail não encontrado em nossa base de dados',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet'
  };
  return errorMessages[errorCode] || 'Erro ao enviar e-mail. Tente novamente.';
}

// Função para enviar email de recuperação
async function sendRecoveryEmail(email) {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + '/login.html',
      handleCodeInApp: false
    });
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    return { success: false, error };
  }
}

// Função para handle do submit
async function handleRecover(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const email = emailInput.value.trim();
  
  // Validação
  if (!email) {
    showError('email', 'E-mail é obrigatório');
    return false;
  }
  
  if (!validateEmail(email)) {
    showError('email', 'Digite um e-mail válido');
    return false;
  }
  
  try {
    showLoading(true);
    
    // Enviar email de recuperação
    const result = await sendRecoveryEmail(email);
    
    if (result.success) {
      lastEmailSent = email;
      showSuccessMessage();
      showToast('E-mail de recuperação enviado com sucesso!', 'success');
    } else {
      const errorMessage = getFirebaseErrorMessage(result.error.code);
      showToast(errorMessage, 'error');
      
      if (result.error.code === 'auth/user-not-found') {
        showError('email', 'E-mail não encontrado');
      }
    }
    
  } catch (error) {
    console.error('Erro no processo de recuperação:', error);
    showToast('Erro inesperado. Tente novamente.', 'error');
  } finally {
    showLoading(false);
  }
  
  return false;
}

// Função para reenviar email
async function handleResend() {
  if (!lastEmailSent) {
    showToast('Nenhum e-mail para reenviar', 'error');
    return;
  }
  
  try {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Reenviando...';
    
    const result = await sendRecoveryEmail(lastEmailSent);
    
    if (result.success) {
      showToast('E-mail reenviado com sucesso!', 'success');
    } else {
      const errorMessage = getFirebaseErrorMessage(result.error.code);
      showToast(errorMessage, 'error');
    }
    
  } catch (error) {
    console.error('Erro ao reenviar email:', error);
    showToast('Erro ao reenviar e-mail', 'error');
  } finally {
    resendBtn.disabled = false;
    resendBtn.textContent = 'envie novamente';
  }
}

// Inicialização
function initRecover() {
  // Prevenir submit normal do formulário
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });

  // Adicionar listener para o submit
  form.addEventListener('submit', handleRecover);

  // Limpar erros quando o usuário digitar
  emailInput.addEventListener('input', () => clearError('email'));

  // Enter no campo de email
  emailInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRecover(e);
    }
  });

  // Botão de reenvio
  if (resendBtn) {
    resendBtn.addEventListener('click', handleResend);
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', initRecover);
