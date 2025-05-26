import { loginEmailSenha, loginGoogle } from './auth.js';

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
 * Mostra mensagem de erro no login.
 * @param {string} msg
 */
function mostrarErro(msg) {
  const erroDiv = document.getElementById('login-error');
  erroDiv.textContent = msg;
}

/**
 * Evento submit do formulário, valida e realiza login Firebase.
 * @param {Event} event
 */
async function handleLogin(event) {
  event.preventDefault();

  const email = event.target.email.value.trim();
  const password = event.target.password.value.trim();

  if (!validarEmail(email)) {
    mostrarErro('Informe um e-mail válido.');
    return;
  }
  if (password.length < 6) {
    mostrarErro('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  mostrarErro('');

  try {
    await loginEmailSenha(email, password);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Erro no login:', error);
    mostrarErro(error.message);
  }
}

/**
 * Evento para login com Google
 */
async function handleGoogleLogin() {
  try {
    await loginGoogle();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Erro login Google:', error);
    mostrarErro(error.message);
  }
}

/**
 * Inicializa eventos da página
 */
function initLogin() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', handleLogin);

  const googleBtn = document.getElementById('google-login');
  googleBtn.addEventListener('click', handleGoogleLogin);
}

window.addEventListener('DOMContentLoaded', initLogin);
