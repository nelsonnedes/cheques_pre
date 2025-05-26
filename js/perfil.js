/* js/perfil.js */
import { 
  auth, 
  db, 
  getCurrentUser, 
  onAuthChange,
  obterEmpresaAtiva,
  atualizarDocumento,
  adicionarDocumento,
  buscarDocumentos,
  formatarData,
  COLLECTIONS 
} from './config.js';
import { initializeNotifications } from './notifications.js';
import { 
  updatePassword, 
  updateProfile, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { 
  doc, 
  getDoc, 
  setDoc,
  where,
  orderBy,
  limit 
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Elementos do DOM
let currentUser = null;
let empresaAtiva = null;
let profileData = {};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initializePage();
});

// Inicializar página
async function initializePage() {
  try {
    // Verificar autenticação
    onAuthChange((user) => {
      if (user) {
        currentUser = user;
        loadUserProfile();
        setupEventListeners();
        loadStatistics();
        initializeNotifications();
      } else {
        window.location.href = 'login.html';
      }
    });

    // Obter empresa ativa
    empresaAtiva = obterEmpresaAtiva();
    
  } catch (error) {
    console.error('Erro ao inicializar perfil:', error);
    showToast('Erro ao carregar perfil', 'error');
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Profile form
  const saveBtn = document.getElementById('save-profile-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveProfile);
  }

  // Profile picture
  const changePictureBtn = document.getElementById('change-picture-btn');
  const profilePictureInput = document.getElementById('profile-picture-input');
  const removePictureBtn = document.getElementById('remove-picture-btn');

  if (changePictureBtn && profilePictureInput) {
    changePictureBtn.addEventListener('click', () => {
      profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', handleProfilePictureChange);
  }

  if (removePictureBtn) {
    removePictureBtn.addEventListener('click', removeProfilePicture);
  }

  // Change password
  const changePasswordBtn = document.getElementById('change-password-btn');
  const changePasswordModal = document.getElementById('change-password-modal');
  const closePasswordModal = document.getElementById('close-password-modal');
  const cancelPasswordBtn = document.getElementById('cancel-password-btn');
  const confirmPasswordBtn = document.getElementById('confirm-password-btn');

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
      changePasswordModal?.classList.remove('hidden');
    });
  }

  if (closePasswordModal) {
    closePasswordModal.addEventListener('click', () => {
      changePasswordModal?.classList.add('hidden');
    });
  }

  if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener('click', () => {
      changePasswordModal?.classList.add('hidden');
    });
  }

  if (confirmPasswordBtn) {
    confirmPasswordBtn.addEventListener('click', changePassword);
  }

  // CEP lookup
  const zipCodeInput = document.getElementById('zip-code');
  if (zipCodeInput) {
    zipCodeInput.addEventListener('blur', lookupAddress);
  }

  // Phone mask
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', formatPhoneNumber);
  }

  // CPF mask
  const documentInput = document.getElementById('document');
  if (documentInput) {
    documentInput.addEventListener('input', formatCPF);
  }

  // Sidebar toggle
  const sidebarToggle = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // Profile dropdown
  const profileBtn = document.getElementById('profile-btn');
  const profileDropdown = document.getElementById('profile-dropdown');

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      profileDropdown.classList.add('hidden');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// Carregar perfil do usuário
async function loadUserProfile() {
  try {
    showLoading(true);

    if (!currentUser) return;

    // Carregar dados básicos do Firebase Auth
    const userNameElement = document.getElementById('user-name');
    const emailElement = document.getElementById('email');
    const displayNameElement = document.getElementById('display-name');

    if (userNameElement) {
      userNameElement.textContent = currentUser.displayName || currentUser.email.split('@')[0];
    }

    if (emailElement) {
      emailElement.value = currentUser.email;
    }

    if (displayNameElement) {
      displayNameElement.value = currentUser.displayName || '';
    }

    // Tentar carregar dados adicionais do Firestore
    try {
      const docRef = doc(db, COLLECTIONS.USUARIOS, currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        profileData = docSnap.data();
        populateProfileForm(profileData);
      }
    } catch (error) {
      console.warn('Dados adicionais não encontrados no Firestore:', error);
    }

    // Exibir foto do perfil
    const profileImage = document.getElementById('profile-image');
    if (profileImage && currentUser.photoURL) {
      profileImage.src = currentUser.photoURL;
    }

  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    showToast('Erro ao carregar dados do perfil', 'error');
  } finally {
    showLoading(false);
  }
}

// Preencher formulário com dados do perfil
function populateProfileForm(data) {
  // Informações pessoais
  setInputValue('phone', data.phone);
  setInputValue('birth-date', data.birthDate);
  setInputValue('document', data.document);
  setInputValue('bio', data.bio);

  // Endereço
  setInputValue('zip-code', data.address?.zipCode);
  setInputValue('street', data.address?.street);
  setInputValue('number', data.address?.number);
  setInputValue('complement', data.address?.complement);
  setInputValue('neighborhood', data.address?.neighborhood);
  setInputValue('city', data.address?.city);
  setInputValue('state', data.address?.state);
}

// Definir valor do input
function setInputValue(id, value) {
  const element = document.getElementById(id);
  if (element && value) {
    element.value = value;
  }
}

// Salvar perfil
async function saveProfile() {
  try {
    showLoading(true);

    if (!currentUser) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    // Coletar dados do formulário
    const formData = {
      displayName: document.getElementById('display-name').value,
      phone: document.getElementById('phone').value,
      birthDate: document.getElementById('birth-date').value,
      document: document.getElementById('document').value,
      bio: document.getElementById('bio').value,
      address: {
        zipCode: document.getElementById('zip-code').value,
        street: document.getElementById('street').value,
        number: document.getElementById('number').value,
        complement: document.getElementById('complement').value,
        neighborhood: document.getElementById('neighborhood').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value
      },
      updatedAt: new Date()
    };

    // Atualizar displayName no Firebase Auth
    if (formData.displayName !== currentUser.displayName) {
      await updateProfile(currentUser, {
        displayName: formData.displayName
      });
    }

    // Atualizar dados no Firestore
    const userData = {
      uid: currentUser.uid,
      email: currentUser.email,
      nome: formData.displayName,
      ...formData,
      empresaId: empresaAtiva?.id || empresaAtiva?.cnpj
    };

    const docRef = doc(db, COLLECTIONS.USUARIOS, currentUser.uid);
    await setDoc(docRef, userData, { merge: true });

    profileData = userData;
    showToast('Perfil atualizado com sucesso!', 'success');
    
    // Atualizar nome na interface
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = formData.displayName || currentUser.email.split('@')[0];
    }

  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    showToast('Erro ao salvar perfil', 'error');
  } finally {
    showLoading(false);
  }
}

// Alterar senha
async function changePassword() {
  try {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Preencha todos os campos', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('A nova senha deve ter pelo menos 8 caracteres', 'error');
      return;
    }

    showLoading(true);

    // Reautenticar usuário
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    // Atualizar senha
    await updatePassword(currentUser, newPassword);

    // Fechar modal e limpar formulário
    document.getElementById('change-password-modal').classList.add('hidden');
    document.getElementById('change-password-form').reset();

    showToast('Senha alterada com sucesso!', 'success');

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    
    if (error.code === 'auth/wrong-password') {
      showToast('Senha atual incorreta', 'error');
    } else if (error.code === 'auth/weak-password') {
      showToast('A nova senha é muito fraca', 'error');
    } else {
      showToast('Erro ao alterar senha', 'error');
    }
  } finally {
    showLoading(false);
  }
}

// Alterar foto do perfil
async function handleProfilePictureChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validar arquivo
  if (!file.type.startsWith('image/')) {
    showToast('Selecione um arquivo de imagem válido', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB
    showToast('O arquivo deve ter no máximo 5MB', 'error');
    return;
  }

  try {
    showLoading(true);

    // Converter para base64 para armazenar no Firestore
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      
      try {
        // Atualizar no Firebase Auth
        await updateProfile(currentUser, {
          photoURL: base64
        });

        // Atualizar no Firestore
        const docRef = doc(db, COLLECTIONS.USUARIOS, currentUser.uid);
        await setDoc(docRef, { photoURL: base64 }, { merge: true });

        // Atualizar interface
        const profileImage = document.getElementById('profile-image');
        if (profileImage) {
          profileImage.src = base64;
        }

        showToast('Foto do perfil atualizada!', 'success');
      } catch (error) {
        console.error('Erro ao salvar foto:', error);
        showToast('Erro ao salvar foto do perfil', 'error');
      } finally {
        showLoading(false);
      }
    };

    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    showToast('Erro ao processar imagem', 'error');
    showLoading(false);
  }
}

// Remover foto do perfil
async function removeProfilePicture() {
  try {
    showLoading(true);

    // Remover do Firebase Auth
    await updateProfile(currentUser, {
      photoURL: null
    });

    // Remover do Firestore
    const docRef = doc(db, COLLECTIONS.USUARIOS, currentUser.uid);
    await setDoc(docRef, { photoURL: null }, { merge: true });

    // Resetar interface
    const profileImage = document.getElementById('profile-image');
    if (profileImage) {
      profileImage.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCA1MEMyOC45IDUwIDEwIDMxLjEgMTAgMTBTMjguOSAtMzAgNTAgLTMwIDkwIC0xMS4xIDkwIDEwIDcxLjEgNTAgNTAgNTBaTTUwIDYwQzY2LjYgNjAgODAgNzMuNCA4MCA5MFY5MEgxMFY5MEM1MCA3My40IDMzLjQgNjAgNTAgNjBaIiBmaWxsPSIjOUM5Qzk4Ii8+Cjwvc3ZnPg==";
    }

    showToast('Foto do perfil removida', 'success');

  } catch (error) {
    console.error('Erro ao remover foto:', error);
    showToast('Erro ao remover foto do perfil', 'error');
  } finally {
    showLoading(false);
  }
}

// Buscar endereço pelo CEP
async function lookupAddress() {
  const zipCode = document.getElementById('zip-code').value.replace(/\D/g, '');
  
  if (zipCode.length !== 8) return;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
    const data = await response.json();

    if (data.erro) {
      showToast('CEP não encontrado', 'error');
      return;
    }

    // Preencher campos
    setInputValue('street', data.logradouro);
    setInputValue('neighborhood', data.bairro);
    setInputValue('city', data.localidade);
    setInputValue('state', data.uf);

    // Focar no campo número
    const numberInput = document.getElementById('number');
    if (numberInput) {
      numberInput.focus();
    }

  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
}

// Carregar estatísticas
async function loadStatistics() {
  try {
    // Membro desde
    const memberSince = document.getElementById('member-since');
    if (memberSince && currentUser?.metadata?.creationTime) {
      const creationDate = new Date(currentUser.metadata.creationTime);
      memberSince.textContent = creationDate.toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });
    }

    // Total de cheques
    if (empresaAtiva) {
      const filtros = [where('empresaId', '==', empresaAtiva.id || empresaAtiva.cnpj)];
      const resultado = await buscarDocumentos(COLLECTIONS.CHEQUES, filtros);
      
      if (resultado.success) {
        const totalCheques = document.getElementById('total-cheques');
        if (totalCheques) {
          totalCheques.textContent = resultado.data.length;
        }
      }
    }

    // Última atividade
    const lastActivity = document.getElementById('last-activity');
    if (lastActivity && currentUser?.metadata?.lastSignInTime) {
      const lastSignIn = new Date(currentUser.metadata.lastSignInTime);
      lastActivity.textContent = formatTimeAgo(lastSignIn);
    }

    // Empresa ativa
    const activeCompany = document.getElementById('active-company');
    if (activeCompany && empresaAtiva) {
      activeCompany.textContent = empresaAtiva.nome || 'Empresa';
    }

  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// Formatar número de telefone
function formatPhoneNumber(event) {
  let value = event.target.value.replace(/\D/g, '');
  
  if (value.length <= 11) {
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
  }
  
  event.target.value = value;
}

// Formatar CPF
function formatCPF(event) {
  let value = event.target.value.replace(/\D/g, '');
  
  if (value.length <= 11) {
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  
  event.target.value = value;
}

// Formatar tempo relativo
function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d atrás`;
  
  return date.toLocaleDateString('pt-BR');
}

// Logout
async function handleLogout() {
  try {
    showLoading(true);
    await auth.signOut();
    localStorage.clear();
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    showToast('Erro ao sair', 'error');
  } finally {
    showLoading(false);
  }
}

// Mostrar loading
function showLoading(show) {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    if (show) {
      loadingOverlay.classList.remove('hidden');
    } else {
      loadingOverlay.classList.add('hidden');
    }
  }
}

// Mostrar toast
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = getToastIcon(type);
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${icon}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Adicionar event listener para fechar
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  toastContainer.appendChild(toast);

  // Auto remover após 5 segundos
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 5000);
}

// Obter ícone do toast
function getToastIcon(type) {
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  return icons[type] || icons.info;
} 