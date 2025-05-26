// Importar as funções necessárias do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Inicializar Auth e Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configurações adicionais
auth.languageCode = 'pt';

console.log('Firebase configurado com sucesso'); 