// Importar as funções necessárias do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

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

// Inicializar Auth, Firestore e Storage
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Configurações adicionais
auth.languageCode = 'pt';

// Constantes para collections
export const COLLECTIONS = {
  USUARIOS: 'usuarios',
  EMPRESAS: 'empresas',
  CHEQUES: 'cheques',
  TRANSACOES: 'transacoes',
  CONFIGURACOES: 'configuracoes',
  AGENDA: 'agenda',
  SUPORTE: 'suporte',
  CHAT: 'chat',
  TICKETS: 'tickets'
};

// Status dos cheques
export const STATUS_CHEQUE = {
  PENDENTE: 'pendente',
  COMPENSADO: 'compensado',
  DEVOLVIDO: 'devolvido',
  CANCELADO: 'cancelado',
  PARCIAL: 'parcial'
};

// Tipos de operação
export const TIPO_OPERACAO = {
  RECEBER: 'receber',
  PAGAR: 'pagar'
};

// Empresa ativa (configuração global)
let activeCompany = null;

// ===== FUNÇÕES UTILITÁRIAS =====

/**
 * Buscar documentos com filtros
 */
export async function buscarDocumentos(collectionName, filtros = []) {
  try {
    const collectionRef = collection(db, collectionName);
    
    let q;
    if (filtros.length > 0) {
      q = query(collectionRef, ...filtros);
    } else {
      q = collectionRef;
    }
    
    const snapshot = await getDocs(q);
    const docs = [];
    
    snapshot.forEach((doc) => {
      docs.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      data: docs,
      count: docs.length
    };
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}

/**
 * Funções de formatação
 */
export function formatarMoeda(valor) {
  if (!valor && valor !== 0) return 'R$ 0,00';
  
  const numValue = typeof valor === 'string' ? 
    parseFloat(valor.replace(/[^\d,-]/g, '').replace(',', '.')) : valor;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue || 0);
}

export function formatarData(data, formato = 'dd/MM/yyyy') {
  if (!data) return '';
  
  const d = data instanceof Date ? data : 
           data.toDate ? data.toDate() : 
           new Date(data);
  
  if (isNaN(d.getTime())) return '';
  
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  
  switch (formato) {
    case 'dd/MM/yyyy':
      return `${dia}/${mes}/${ano}`;
    case 'yyyy-MM-dd':
      return `${ano}-${mes}-${dia}`;
    case 'MM/yyyy':
      return `${mes}/${ano}`;
    default:
      return d.toLocaleDateString('pt-BR');
  }
}

/**
 * Gerenciar empresa ativa
 */
export function obterEmpresaAtiva() {
  if (activeCompany) {
    return activeCompany;
  }
  
  // Tentar obter do localStorage
  const empresaSelecionada = localStorage.getItem('empresaAtiva');
  if (empresaSelecionada) {
    try {
      activeCompany = JSON.parse(empresaSelecionada);
      return activeCompany;
    } catch (error) {
      console.warn('Erro ao parsear empresa ativa do localStorage:', error);
    }
  }
  
  // Tentar obter das empresas selecionadas
  const selectedCompanies = localStorage.getItem('selectedCompanies');
  if (selectedCompanies) {
    try {
      const companies = JSON.parse(selectedCompanies);
      if (companies.length === 1) {
        activeCompany = companies[0];
        return activeCompany;
      }
    } catch (error) {
      console.warn('Erro ao parsear empresas selecionadas:', error);
    }
  }
  
  return null;
}

export function definirEmpresaAtiva(empresa) {
  activeCompany = empresa;
  if (empresa) {
    localStorage.setItem('empresaAtiva', JSON.stringify(empresa));
  } else {
    localStorage.removeItem('empresaAtiva');
  }
}

// Funções de Autenticação
export async function loginUsuario(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Garantir que o usuário existe no Firestore
    const empresaAtiva = obterEmpresaAtiva();
    const empresaId = empresaAtiva ? (empresaAtiva.id || empresaAtiva.cnpj) : null;
    await garantirUsuarioNoFirestore(user, empresaId);
    
    return { success: true, user };
  } catch (error) {
    console.error('Erro no login:', error);
    return { success: false, error: error.code };
  }
}

export async function logoutUsuario() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Erro no logout:', error);
    return { success: false, error: error.message };
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function checkAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function garantirUsuarioNoFirestore(user, empresaId = null) {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USUARIOS, user.uid));
    
    if (!userDoc.exists()) {
      await setDoc(doc(db, COLLECTIONS.USUARIOS, user.uid), {
        uid: user.uid,
        email: user.email,
        nome: user.displayName || '',
        criadoEm: serverTimestamp(),
        ativo: true,
        empresaId: empresaId
      });
    }
  } catch (error) {
    console.error('Erro ao garantir usuário no Firestore:', error);
  }
}

console.log('Firebase configurado com sucesso'); 