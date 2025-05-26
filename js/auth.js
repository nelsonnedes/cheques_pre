/* js/auth.js */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

// Substituir pelas suas configurações Firebase reais
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const providerGoogle = new GoogleAuthProvider();

/**
 * Registra usuário com email e senha
 * @param {string} email
 * @param {string} password
 * @returns {Promise}
 */
export async function registrar(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Login com email e senha
 * @param {string} email
 * @param {string} password
 * @returns {Promise}
 */
export async function loginEmailSenha(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Login com Google OAuth
 * @returns {Promise}
 */
export async function loginGoogle() {
  return signInWithPopup(auth, providerGoogle);
}

/**
 * Logout do usuário
 * @returns {Promise}
 */
export async function logout() {
  return signOut(auth);
}

/**
 * Envia link de recuperação de senha
 * @param {string} email
 * @returns {Promise}
 */
export async function recuperarSenha(email) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Monitora estado de autenticação e executa callback
 * @param {Function} callback
 */
export function monitorarEstadoAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
