// Importações do Firebase
import { 
    getAuth, 
    updateProfile, 
    updatePassword, 
    updateEmail,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    updateDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject
} from 'firebase/storage';

// Importações locais
import { auth, db, storage } from './config.js';
import { checkAuth, getCurrentUser } from './auth.js';
import { showToast, showLoading, hideLoading } from './utils.js';

// Elementos DOM
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsPanels = document.querySelectorAll('.settings-panel');
const profileForm = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');
const photoInput = document.getElementById('photo-input');
const profilePhoto = document.getElementById('profile-photo');
const uploadPhotoBtn = document.getElementById('upload-photo');
const removePhotoBtn = document.getElementById('remove-photo');

// Switches e checkboxes
const twoFactorSwitch = document.getElementById('two-factor');
const emailNotificationsSwitch = document.getElementById('email-notifications');
const pushNotificationsSwitch = document.getElementById('push-notifications');
const darkModeSwitch = document.getElementById('dark-mode');

// Botões de ação
const saveProfileBtn = document.getElementById('save-profile');
const changePasswordBtn = document.getElementById('change-password');
const exportDataBtn = document.getElementById('export-data');
const clearCacheBtn = document.getElementById('clear-cache');
const deleteAccountBtn = document.getElementById('delete-account');

// Estado global
let currentUser = null;
let userSettings = {};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        
        // Verificar autenticação
        const user = await checkAuth();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        await loadUserData();
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao carregar configurações', 'error');
    } finally {
        hideLoading();
    }
});

// Configurar event listeners
function setupEventListeners() {
    // Navegação entre abas
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tab.dataset.tab);
        });
    });

    // Upload de foto
    uploadPhotoBtn.addEventListener('click', () => {
        photoInput.click();
    });

    photoInput.addEventListener('change', handlePhotoUpload);
    removePhotoBtn.addEventListener('click', removeProfilePhoto);

    // Formulários
    profileForm.addEventListener('submit', handleProfileUpdate);
    passwordForm.addEventListener('submit', handlePasswordChange);

    // Switches
    twoFactorSwitch.addEventListener('change', handleTwoFactorToggle);
    emailNotificationsSwitch.addEventListener('change', handleNotificationToggle);
    pushNotificationsSwitch.addEventListener('change', handleNotificationToggle);
    darkModeSwitch.addEventListener('change', handleThemeToggle);

    // Botões de ação
    exportDataBtn.addEventListener('click', exportUserData);
    clearCacheBtn.addEventListener('click', clearApplicationCache);
    deleteAccountBtn.addEventListener('click', handleAccountDeletion);
}

// Alternar entre abas
function switchTab(tabName) {
    // Remover classe active de todas as abas
    settingsTabs.forEach(tab => tab.classList.remove('active'));
    settingsPanels.forEach(panel => panel.classList.remove('active'));

    // Adicionar classe active na aba selecionada
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`${tabName}-panel`);

    if (activeTab && activePanel) {
        activeTab.classList.add('active');
        activePanel.classList.add('active');
    }
}

// Carregar dados do usuário
async function loadUserData() {
    try {
        // Carregar dados do perfil
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            populateProfileForm(userData);
            userSettings = userData.settings || {};
            populateSettings();
        }

        // Carregar foto do perfil
        if (currentUser.photoURL) {
            profilePhoto.src = currentUser.photoURL;
        }

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        showToast('Erro ao carregar dados do perfil', 'error');
    }
}

// Preencher formulário de perfil
function populateProfileForm(userData) {
    document.getElementById('nome').value = userData.nome || '';
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('telefone').value = userData.telefone || '';
    document.getElementById('cpf').value = userData.cpf || '';
    document.getElementById('cargo').value = userData.cargo || '';
}

// Preencher configurações
function populateSettings() {
    twoFactorSwitch.checked = userSettings.twoFactor || false;
    emailNotificationsSwitch.checked = userSettings.emailNotifications !== false;
    pushNotificationsSwitch.checked = userSettings.pushNotifications !== false;
    darkModeSwitch.checked = userSettings.darkMode || false;

    // Aplicar tema
    if (userSettings.darkMode) {
        document.body.classList.add('dark-theme');
    }
}

// Atualizar perfil
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    try {
        showLoading();
        
        const formData = new FormData(profileForm);
        const profileData = {
            nome: formData.get('nome'),
            telefone: formData.get('telefone'),
            cpf: formData.get('cpf'),
            cargo: formData.get('cargo'),
            updatedAt: new Date()
        };

        // Atualizar no Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), profileData);

        // Atualizar displayName no Auth
        await updateProfile(currentUser, {
            displayName: profileData.nome
        });

        showToast('Perfil atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        showToast('Erro ao atualizar perfil', 'error');
    } finally {
        hideLoading();
    }
}

// Upload de foto do perfil
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validar arquivo
    if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione uma imagem válida', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
        showToast('A imagem deve ter no máximo 5MB', 'error');
        return;
    }

    try {
        showLoading();

        // Upload para o Storage
        const storageRef = ref(storage, `profile-photos/${currentUser.uid}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Atualizar no Auth
        await updateProfile(currentUser, {
            photoURL: downloadURL
        });

        // Atualizar no Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            photoURL: downloadURL,
            updatedAt: new Date()
        });

        // Atualizar interface
        profilePhoto.src = downloadURL;
        showToast('Foto atualizada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        showToast('Erro ao atualizar foto', 'error');
    } finally {
        hideLoading();
    }
}

// Remover foto do perfil
async function removeProfilePhoto() {
    try {
        showLoading();

        // Remover do Storage
        if (currentUser.photoURL) {
            const photoRef = ref(storage, `profile-photos/${currentUser.uid}`);
            await deleteObject(photoRef);
        }

        // Atualizar no Auth
        await updateProfile(currentUser, {
            photoURL: null
        });

        // Atualizar no Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            photoURL: null,
            updatedAt: new Date()
        });

        // Atualizar interface
        profilePhoto.src = 'assets/images/default-avatar.png';
        showToast('Foto removida com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao remover foto:', error);
        showToast('Erro ao remover foto', 'error');
    } finally {
        hideLoading();
    }
}

// Alterar senha
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validações
    if (newPassword !== confirmPassword) {
        showToast('As senhas não coincidem', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('A nova senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    try {
        showLoading();

        // Reautenticar usuário
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);

        // Atualizar senha
        await updatePassword(currentUser, newPassword);

        // Limpar formulário
        passwordForm.reset();
        showToast('Senha alterada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        if (error.code === 'auth/wrong-password') {
            showToast('Senha atual incorreta', 'error');
        } else {
            showToast('Erro ao alterar senha', 'error');
        }
    } finally {
        hideLoading();
    }
}

// Toggle de autenticação de dois fatores
async function handleTwoFactorToggle(e) {
    const enabled = e.target.checked;
    
    try {
        await updateUserSetting('twoFactor', enabled);
        showToast(
            enabled ? 'Autenticação de dois fatores ativada' : 'Autenticação de dois fatores desativada',
            'success'
        );
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        e.target.checked = !enabled; // Reverter
        showToast('Erro ao atualizar configuração', 'error');
    }
}

// Toggle de notificações
async function handleNotificationToggle(e) {
    const setting = e.target.id.replace('-', '');
    const enabled = e.target.checked;
    
    try {
        await updateUserSetting(setting, enabled);
        showToast('Configuração de notificação atualizada', 'success');
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        e.target.checked = !enabled; // Reverter
        showToast('Erro ao atualizar configuração', 'error');
    }
}

// Toggle de tema
async function handleThemeToggle(e) {
    const darkMode = e.target.checked;
    
    try {
        await updateUserSetting('darkMode', darkMode);
        
        // Aplicar tema
        if (darkMode) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        showToast('Tema atualizado', 'success');
    } catch (error) {
        console.error('Erro ao atualizar tema:', error);
        e.target.checked = !darkMode; // Reverter
        showToast('Erro ao atualizar tema', 'error');
    }
}

// Atualizar configuração do usuário
async function updateUserSetting(setting, value) {
    userSettings[setting] = value;
    
    await updateDoc(doc(db, 'users', currentUser.uid), {
        [`settings.${setting}`]: value,
        updatedAt: new Date()
    });
}

// Exportar dados do usuário
async function exportUserData() {
    try {
        showLoading();
        
        // Coletar dados do usuário
        const userData = await getDoc(doc(db, 'users', currentUser.uid));
        const userChecks = await getDocs(
            query(collection(db, 'cheques'), where('userId', '==', currentUser.uid))
        );
        
        const exportData = {
            profile: userData.data(),
            checks: userChecks.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            exportDate: new Date().toISOString()
        };

        // Criar e baixar arquivo
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dados-usuario-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Dados exportados com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        showToast('Erro ao exportar dados', 'error');
    } finally {
        hideLoading();
    }
}

// Limpar cache da aplicação
async function clearApplicationCache() {
    try {
        // Limpar localStorage
        localStorage.clear();
        
        // Limpar sessionStorage
        sessionStorage.clear();
        
        // Limpar cache do service worker se disponível
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }

        showToast('Cache limpo com sucesso!', 'success');
        
        // Recarregar página após um breve delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Erro ao limpar cache:', error);
        showToast('Erro ao limpar cache', 'error');
    }
}

// Deletar conta do usuário
async function handleAccountDeletion() {
    const confirmation = prompt(
        'Esta ação é irreversível. Digite "DELETAR" para confirmar a exclusão da sua conta:'
    );
    
    if (confirmation !== 'DELETAR') {
        return;
    }

    const password = prompt('Digite sua senha para confirmar:');
    if (!password) {
        return;
    }

    try {
        showLoading();

        // Reautenticar usuário
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);

        // Deletar dados do Firestore
        await deleteDoc(doc(db, 'users', currentUser.uid));
        
        // Deletar cheques do usuário
        const userChecks = await getDocs(
            query(collection(db, 'cheques'), where('userId', '==', currentUser.uid))
        );
        
        const deletePromises = userChecks.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Deletar foto do perfil se existir
        if (currentUser.photoURL) {
            const photoRef = ref(storage, `profile-photos/${currentUser.uid}`);
            await deleteObject(photoRef);
        }

        // Deletar conta do Authentication
        await deleteUser(currentUser);

        showToast('Conta deletada com sucesso', 'success');
        
        // Redirecionar para página inicial
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Erro ao deletar conta:', error);
        if (error.code === 'auth/wrong-password') {
            showToast('Senha incorreta', 'error');
        } else {
            showToast('Erro ao deletar conta', 'error');
        }
    } finally {
        hideLoading();
    }
}

// Validação de força da senha
function checkPasswordStrength(password) {
    const strengthIndicator = document.getElementById('password-strength');
    if (!strengthIndicator) return;

    let strength = 0;
    let feedback = '';

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch (strength) {
        case 0:
        case 1:
            feedback = 'Muito fraca';
            strengthIndicator.className = 'password-strength weak';
            break;
        case 2:
        case 3:
            feedback = 'Média';
            strengthIndicator.className = 'password-strength medium';
            break;
        case 4:
        case 5:
            feedback = 'Forte';
            strengthIndicator.className = 'password-strength strong';
            break;
    }

    strengthIndicator.textContent = feedback;
}

// Event listener para verificação de força da senha
document.getElementById('new-password')?.addEventListener('input', (e) => {
    checkPasswordStrength(e.target.value);
});

// Exportar funções para uso global
window.configuracoes = {
    switchTab,
    exportUserData,
    clearApplicationCache
}; 