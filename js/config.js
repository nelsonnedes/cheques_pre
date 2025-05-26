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

// Configuração Firebase
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

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
  RECEBER: 'receber', // Empresa deposita cheque, paga juros
  PAGAR: 'pagar'      // Empresa recebe dinheiro antecipado, cobra juros
};

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

export async function registrarUsuario(email, password, userData) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Atualizar perfil
    await updateProfile(userCredential.user, {
      displayName: userData.nome
    });
    
    // Salvar dados do usuário no Firestore
    await adicionarDocumento(COLLECTIONS.USUARIOS, {
      uid: userCredential.user.uid,
      email: email,
      nome: userData.nome,
      telefone: userData.telefone || '',
      empresa: userData.empresa || '',
      criadoEm: serverTimestamp(),
      ativo: true
    });
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Erro no registro:', error);
    return { success: false, error: error.message };
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

export async function recuperarSenha(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Erro ao recuperar senha:', error);
    return { success: false, error: error.message };
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Verificar se usuário está logado
export async function checkAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Função para redirecionar se não autenticado
export async function requireAuth() {
  const user = await checkAuth();
  if (!user) {
    window.location.href = '/login.html';
    return false;
  }
  return user;
}

/**
 * Função genérica para adicionar documento
 */
export async function adicionarDocumento(collectionName, data) {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Erro ao adicionar documento:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Função genérica para buscar documentos
 */
export async function buscarDocumentos(collectionName, filtros = []) {
  try {
    let q = collection(db, collectionName);
    
    if (filtros.length > 0) {
      q = query(q, ...filtros);
    }
    
    const querySnapshot = await getDocs(q);
    const docs = [];
    querySnapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: docs };
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Função genérica para atualizar documento
 */
export async function atualizarDocumento(collectionName, docId, data) {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Função genérica para deletar documento
 */
export async function deletarDocumento(collectionName, docId) {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Função para escutar mudanças em tempo real
 */
export function escutarDocumentos(collectionName, callback, filtros = []) {
  let q = collection(db, collectionName);
  
  if (filtros.length > 0) {
    q = query(q, ...filtros);
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const docs = [];
    querySnapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    callback(docs);
  });
}

/**
 * Calcular juros compostos
 */
export function calcularJuros(valor, taxaJuros, diasAtraso) {
  if (diasAtraso <= 0) return 0;
  
  const taxaDiaria = taxaJuros / 100 / 30; // Taxa mensal convertida para diária
  const montante = valor * Math.pow(1 + taxaDiaria, diasAtraso);
  return montante - valor;
}

/**
 * Formatar valor em reais
 */
export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

/**
 * Formatar data para exibição
 */
export function formatarData(data) {
  if (!data) return '';
  
  const dataObj = data.toDate ? data.toDate() : new Date(data);
  return dataObj.toLocaleDateString('pt-BR');
}

/**
 * Calcular diferença de dias entre duas datas
 */
export function calcularDiasEntreDatas(dataInicial, dataFinal) {
  const inicio = new Date(dataInicial);
  const fim = new Date(dataFinal);
  const diffTime = Math.abs(fim - inicio);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Validar CNPJ
 */
export function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]+/g,'');
  
  if(cnpj == '') return false;
  
  if (cnpj.length != 14) return false;
  
  // Elimina CNPJs invalidos conhecidos
  if (cnpj == "00000000000000" || 
      cnpj == "11111111111111" || 
      cnpj == "22222222222222" || 
      cnpj == "33333333333333" || 
      cnpj == "44444444444444" || 
      cnpj == "55555555555555" || 
      cnpj == "66666666666666" || 
      cnpj == "77777777777777" || 
      cnpj == "88888888888888" || 
      cnpj == "99999999999999")
      return false;
      
  // Valida DVs
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0,tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado != digitos.charAt(0)) return false;
       
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0,tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  
  if (resultado != digitos.charAt(1)) return false;
    
  return true;
}

/**
 * Obter empresa ativa do localStorage
 */
export function obterEmpresaAtiva() {
  const empresaData = localStorage.getItem('empresaAtiva');
  return empresaData ? JSON.parse(empresaData) : null;
}

/**
 * Definir empresa ativa no localStorage
 */
export function definirEmpresaAtiva(empresa) {
  localStorage.setItem('empresaAtiva', JSON.stringify(empresa));
}

/**
 * Garantir que o usuário existe no Firestore
 */
export async function garantirUsuarioNoFirestore(user, empresaId = null) {
  try {
    const docRef = doc(db, COLLECTIONS.USUARIOS, user.uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Criar documento do usuário
      const userData = {
        uid: user.uid,
        email: user.email,
        nome: user.displayName || user.email.split('@')[0],
        criadoEm: new Date(),
        ativo: true,
        empresaId: empresaId
      };
      
      await setDoc(docRef, userData);
      console.log('Usuário criado no Firestore:', userData);
      return { success: true, data: userData };
    } else {
      // Usuário já existe, verificar se precisa atualizar empresaId
      const userData = docSnap.data();
      if (empresaId && userData.empresaId !== empresaId) {
        await updateDoc(docRef, { empresaId: empresaId });
        userData.empresaId = empresaId;
        console.log('EmpresaId atualizada para o usuário:', empresaId);
      }
      return { success: true, data: userData };
    }
  } catch (error) {
    console.error('Erro ao garantir usuário no Firestore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obter dados do usuário do Firestore
 */
export async function obterDadosUsuario(userId) {
  try {
    const docRef = doc(db, COLLECTIONS.USUARIOS, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: false, error: 'Usuário não encontrado no Firestore' };
    }
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Associar usuário à empresa ativa
 */
export async function associarUsuarioEmpresa(empresaId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    const docRef = doc(db, COLLECTIONS.USUARIOS, currentUser.uid);
    await updateDoc(docRef, { empresaId: empresaId });
    
    console.log('Usuário associado à empresa:', empresaId);
    return { success: true };
  } catch (error) {
    console.error('Erro ao associar usuário à empresa:', error);
    return { success: false, error: error.message };
  }
}

// Exportar signOut diretamente para uso em outros módulos
export { signOut }; 