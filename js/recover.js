import { recuperarSenha } from './config.js';
import { showToast, showLoading, hideLoading } from './auth.js';

/**
 * Valida email simples.
 * @param {string} email
 * @returns {boolean}
 */
function validarEmail(email) {
  const re = /^[\w-.]+@[\w-]+\.[a-z]{2,7}$/i;
  return re.test(email);
}

/**
 * Mostra erro no campo específico
 * @param {string} fieldId
 * @param {string} message
 */
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}-error`);
  
  if (field) field.classList.add('error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
  }
}

/**
 * Limpa erro do campo específico
 * @param {string} fieldId
 */
function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}-error`);
  
  if (field) field.classList.remove('error');
  if (errorElement) errorElement.classList.remove('show');
}

/**
 * Mostra mensagem de sucesso
 */
function showSuccessMessage() {
  const form = document.querySelector('.auth-form');
  const successMessage = document.getElementById('success-message');
  
  if (form && successMessage) {
    form.style.display = 'none';
    successMessage.classList.remove('hidden');
  }
}

/**
 * Evento submit para recuperação de senha via Firebase
 * @param {Event} e
 */
async function handleRecover(e) {
  e.preventDefault();

  const emailInput = document.getElementById('email');
  const recoverBtn = document.getElementById('recover-btn');
  const email = emailInput.value.trim();

  // Limpar erros anteriores
  clearError('email');

  // Validação
  if (!email) {
    showError('email', 'E-mail é obrigatório');
    return;
  }

  if (!validarEmail(email)) {
    showError('email', 'Digite um e-mail válido');
    return;
  }

  try {
    // Mostrar loading
    recoverBtn.disabled = true;
    recoverBtn.classList.add('loading');
    showLoading('Enviando e-mail de recuperação...');

    // Chamar função de recuperação do config.js
    const result = await recuperarSenha(email);

    if (result.success) {
      showToast('E-mail de recuperação enviado com sucesso!', 'success');
      showSuccessMessage();
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Erro ao enviar link:', error);
    
    let errorMessage = 'Erro ao enviar e-mail de recuperação';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'E-mail não encontrado em nossa base de dados';
      showError('email', errorMessage);
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'E-mail inválido';
      showError('email', errorMessage);
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    showToast(errorMessage, 'error');
    
  } finally {
    hideLoading();
    recoverBtn.disabled = false;
    recoverBtn.classList.remove('loading');
  }
}

/**
 * Reenviar e-mail de recuperação
 */
async function handleResend() {
  const emailInput = document.getElementById('email');
  const email = emailInput.value.trim();
  
  if (!email) {
    showToast('E-mail não encontrado', 'error');
    return;
  }
  
  try {
    showLoading('Reenviando e-mail...');
    
    const result = await recuperarSenha(email);
    
    if (result.success) {
      showToast('E-mail reenviado com sucesso!', 'success');
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Erro ao reenviar:', error);
    showToast('Erro ao reenviar e-mail', 'error');
  } finally {
    hideLoading();
  }
}

function initRecover() {
  const form = document.getElementById('recover-form');
  const emailInput = document.getElementById('email');
  const resendBtn = document.getElementById('resend-btn');
  
  if (form) {
    form.addEventListener('submit', handleRecover);
  }
  
  if (emailInput) {
    // Limpar erro quando começar a digitar
    emailInput.addEventListener('input', () => clearError('email'));
  }
  
  if (resendBtn) {
    resendBtn.addEventListener('click', handleResend);
  }
}

window.addEventListener('DOMContentLoaded', initRecover);
