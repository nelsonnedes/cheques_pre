import { recuperarSenha } from './auth.js';

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
 * Mostra mensagem de sucesso.
 * @param {string} msg
 */
function mostrarMensagem(msg) {
  const msgDiv = document.getElementById('recover-message');
  msgDiv.textContent = msg;
}

/**
 * Mostra mensagem de erro.
 * @param {string} msg
 */
function mostrarErro(msg) {
  const errDiv = document.getElementById('recover-error');
  errDiv.textContent = msg;
}

/**
 * Evento submit para recuperação de senha via Firebase
 * @param {Event} e
 */
async function handleRecover(e) {
  e.preventDefault();

  const email = e.target.email.value.trim();

  if (!validarEmail(email)) {
    mostrarErro('Informe um e-mail válido.');
    return;
  }

  mostrarErro('');
  mostrarMensagem('');

  try {
    await recuperarSenha(email);
    mostrarMensagem('Verifique seu e-mail para o link de recuperação.');
  } catch (error) {
    console.error('Erro ao enviar link:', error);
    mostrarErro(error.message);
  }
}

function initRecover() {
  const form = document.getElementById('recover-form');
  form.addEventListener('submit', handleRecover);
}

window.addEventListener('DOMContentLoaded', initRecover);
