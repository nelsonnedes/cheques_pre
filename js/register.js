import { registrar } from './auth.js';

/**
 * Valida o email usando regex simples.
 * @param {string} email
 * @returns {boolean}
 */
function validarEmail(email) {
  const re = /^[\w-.]+@[\w-]+\.[a-z]{2,7}$/i;
  return re.test(email);
}

/**
 * Mostra mensagem de erro no registro.
 * @param {string} msg
 */
function mostrarErro(msg) {
  const erroDiv = document.getElementById('register-error');
  erroDiv.textContent = msg;
}

/**
 * Evento submit do formulário de registro, valida e registra com Firebase
 * @param {Event} e
 */
async function handleRegister(e) {
  e.preventDefault();

  const email = e.target.email.value.trim();
  const password = e.target.password.value.trim();
  const confirmPassword = e.target['confirm-password'].value.trim();

  if (!validarEmail(email)) {
    mostrarErro('Informe um e-mail válido.');
    return;
  }
  if (password.length < 6) {
    mostrarErro('A senha deve ter pelo menos 6 caracteres.');
    return;
  }
  if (password !== confirmPassword) {
    mostrarErro('As senhas não coincidem.');
    return;
  }

  mostrarErro('');

  try {
    await registrar(email, password);
    alert('Conta criada com sucesso! Faça login.');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Erro no registro:', error);
    mostrarErro(error.message);
  }
}

function initRegister() {
  const form = document.getElementById('register-form');
  form.addEventListener('submit', handleRegister);
}

window.addEventListener('DOMContentLoaded', initRegister);
