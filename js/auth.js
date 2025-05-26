// Sistema de Autenticação Universal
import { 
  auth, 
  db, 
  loginUsuario, 
  logoutUsuario, 
  checkAuth, 
  getCurrentUser, 
  onAuthChange,
  COLLECTIONS
} from './config.js';

// Estado global da autenticação
let currentUser = null;
let userProfile = null;

// Toast para mensagens
export function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${getToastIcon(type)}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto remover após 5 segundos
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
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-exclamation-circle';
    case 'warning': return 'fa-exclamation-triangle';
    default: return 'fa-info-circle';
  }
}

// Loading overlay
function showLoading(message = 'Carregando...') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <p>${message}</p>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

// Configurar dropdown do perfil
function setupProfileDropdown() {
  const profileBtn = document.getElementById('profile-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('hidden');
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', () => {
      profileDropdown.classList.add('hidden');
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// Fazer logout
async function handleLogout() {
  try {
    showLoading('Fazendo logout...');
    const result = await logoutUsuario();
    
    if (result.success) {
      showToast('Logout realizado com sucesso!', 'success');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1000);
    } else {
      showToast('Erro ao fazer logout: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Erro no logout:', error);
    showToast('Erro inesperado no logout', 'error');
  } finally {
    hideLoading();
  }
}

// Configurar formulário de login
export function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePassword = document.querySelector('.toggle-password');
  const loginBtn = document.getElementById('login-btn');
  
  if (!loginForm) return;
  
  // Toggle senha
  if (togglePassword) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.querySelector('i').classList.toggle('fa-eye');
      togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
    });
  }
  
  // Submit do formulário
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      showToast('Preencha todos os campos', 'warning');
      return;
    }
    
    try {
      showLoading('Fazendo login...');
      loginBtn.disabled = true;
      
      const result = await loginUsuario(email, password);
      
      if (result.success) {
        showToast('Login realizado com sucesso!', 'success');
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1000);
      } else {
        showToast('Erro no login: ' + getFirebaseErrorMessage(result.error), 'error');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      showToast('Erro inesperado no login', 'error');
    } finally {
      hideLoading();
      loginBtn.disabled = false;
    }
  });
}

// Traduzir erros do Firebase
function getFirebaseErrorMessage(error) {
  const errorMessages = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-disabled': 'Usuário desabilitado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'E-mail já está em uso',
    'auth/weak-password': 'Senha muito fraca',
    'auth/network-request-failed': 'Erro de conexão',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
  };
  
  return errorMessages[error] || error;
}

// Configurar interface do usuário
export function setupUserInterface() {
  setupProfileDropdown();
  
  // Configurar notificações
  const notificationBtn = document.querySelector('.btn-notification');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
      showToast('Sistema de notificações em desenvolvimento', 'info');
    });
  }
  
  // Configurar navegação ativa
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.sidebar nav a');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    
    if (href && (currentPath.includes(href) || (currentPath === '/' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
  // Configurar formulário de login se estiver na página de login
  if (window.location.pathname.includes('login.html')) {
    setupLoginForm();
  } else {
    // Para outras páginas, configurar interface
    setupUserInterface();
  }
});

// Exportar funções úteis
export {
  currentUser,
  userProfile,
  handleLogout,
  setupUserInterface,
  hideLoading,
  showLoading
}; 