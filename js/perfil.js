import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getAuth, 
    onAuthStateChanged, 
    updateProfile, 
    updateEmail, 
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { formatPhone } from './utils.js';

class PerfilManager {
    constructor() {
        this.db = getFirestore();
        this.auth = getAuth();
        
        // Elementos da UI
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.profileForm = document.getElementById('profileForm');
        this.securityForm = document.getElementById('securityForm');
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmationMessage = document.getElementById('confirmationMessage');
        this.confirmActionBtn = document.getElementById('confirmAction');
        
        // Estado
        this.currentAction = null;
        this.userData = null;
        
        this.init();
    }

    async init() {
        this.showLoading();
        try {
            await this.checkAuth();
            await this.loadUserData();
            this.setupEventListeners();
            this.setupPasswordValidation();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            alert('Erro ao carregar os dados do perfil. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    checkAuth() {
        return new Promise((resolve, reject) => {
            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    document.getElementById('userName').textContent = user.email;
                    resolve(user);
                } else {
                    window.location.href = 'login.html';
                    reject('Usuário não autenticado');
                }
            });
        });
    }

    async loadUserData() {
        try {
            const userId = this.auth.currentUser.uid;
            const userRef = doc(this.db, 'usuarios', userId);
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
                this.userData = docSnap.data();
            } else {
                this.userData = {
                    nome: this.auth.currentUser.displayName || '',
                    email: this.auth.currentUser.email,
                    telefone: '',
                    cargo: '',
                    tema: 'light',
                    idioma: 'pt-BR',
                    dataCadastro: new Date(),
                    ultimoLogin: new Date(),
                    ultimaAlteracaoSenha: null
                };
                await setDoc(userRef, this.userData);
            }
            
            this.updateUI();
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Form de perfil
        this.profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Form de segurança
        this.securityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePassword();
        });

        // Tema
        document.getElementById('tema').addEventListener('change', (e) => {
            this.updateTheme(e.target.value);
        });

        // Idioma
        document.getElementById('idioma').addEventListener('change', (e) => {
            this.updateLanguage(e.target.value);
        });

        // Ações de conta
        document.getElementById('desativarConta').addEventListener('click', () => {
            this.showConfirmation('desativar');
        });

        document.getElementById('excluirConta').addEventListener('click', () => {
            this.showConfirmation('excluir');
        });

        // Modal de confirmação
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.confirmationModal.style.display = 'none';
            });
        });

        this.confirmActionBtn.addEventListener('click', () => {
            if (this.currentAction === 'desativar') {
                this.deactivateAccount();
            } else if (this.currentAction === 'excluir') {
                this.deleteAccount();
            }
        });

        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === this.confirmationModal) {
                this.confirmationModal.style.display = 'none';
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });

        // Máscara de telefone
        const telefoneInput = document.getElementById('telefone');
        telefoneInput.addEventListener('input', (e) => {
            e.target.value = formatPhone(e.target.value);
        });
    }

    setupPasswordValidation() {
        const novaSenha = document.getElementById('novaSenha');
        const confirmarSenha = document.getElementById('confirmarSenha');
        
        const validatePassword = () => {
            const password = novaSenha.value;
            
            // Atualizar indicadores
            document.getElementById('reqLength').innerHTML = 
                `<i class="fas fa-${password.length >= 8 ? 'check' : 'times'}"></i> Mínimo de 8 caracteres`;
            
            document.getElementById('reqUpper').innerHTML = 
                `<i class="fas fa-${/[A-Z]/.test(password) ? 'check' : 'times'}"></i> Uma letra maiúscula`;
            
            document.getElementById('reqLower').innerHTML = 
                `<i class="fas fa-${/[a-z]/.test(password) ? 'check' : 'times'}"></i> Uma letra minúscula`;
            
            document.getElementById('reqNumber').innerHTML = 
                `<i class="fas fa-${/\d/.test(password) ? 'check' : 'times'}"></i> Um número`;
            
            document.getElementById('reqSpecial').innerHTML = 
                `<i class="fas fa-${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'check' : 'times'}"></i> Um caractere especial`;
            
            // Validar confirmação
            if (confirmarSenha.value) {
                confirmarSenha.setCustomValidity(
                    password === confirmarSenha.value ? '' : 'As senhas não coincidem'
                );
            }
        };
        
        novaSenha.addEventListener('input', validatePassword);
        confirmarSenha.addEventListener('input', validatePassword);
    }

    updateUI() {
        // Informações pessoais
        document.getElementById('nome').value = this.userData.nome;
        document.getElementById('email').value = this.userData.email;
        document.getElementById('telefone').value = this.userData.telefone || '';
        document.getElementById('cargo').value = this.userData.cargo || '';
        
        // Preferências
        document.getElementById('tema').value = this.userData.tema || 'light';
        document.getElementById('idioma').value = this.userData.idioma || 'pt-BR';
        
        // Atividade da conta
        document.getElementById('lastLogin').textContent = 
            this.formatDate(this.userData.ultimoLogin);
        
        document.getElementById('lastPasswordChange').textContent = 
            this.userData.ultimaAlteracaoSenha ? 
            this.formatDate(this.userData.ultimaAlteracaoSenha) : 
            'Nunca alterada';
        
        document.getElementById('accountStatus').textContent = 
            this.userData.ativo ? 'Ativa' : 'Desativada';
        
        // Aplicar tema
        this.updateTheme(this.userData.tema);
    }

    async updateProfile() {
        this.showLoading();
        try {
            const formData = new FormData(this.profileForm);
            const updates = {
                nome: formData.get('nome'),
                telefone: formData.get('telefone'),
                cargo: formData.get('cargo'),
                dataAtualizacao: new Date()
            };
            
            // Atualizar no Firestore
            const userId = this.auth.currentUser.uid;
            await setDoc(doc(this.db, 'usuarios', userId), {
                ...this.userData,
                ...updates
            });
            
            // Atualizar no Auth
            await updateProfile(this.auth.currentUser, {
                displayName: updates.nome
            });
            
            this.userData = {
                ...this.userData,
                ...updates
            };
            
            alert('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            alert('Erro ao atualizar perfil. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async updatePassword() {
        this.showLoading();
        try {
            const senhaAtual = document.getElementById('senhaAtual').value;
            const novaSenha = document.getElementById('novaSenha').value;
            const confirmarSenha = document.getElementById('confirmarSenha').value;
            
            if (novaSenha !== confirmarSenha) {
                throw new Error('As senhas não coincidem');
            }
            
            // Reautenticar usuário
            const credential = EmailAuthProvider.credential(
                this.auth.currentUser.email,
                senhaAtual
            );
            
            await reauthenticateWithCredential(this.auth.currentUser, credential);
            
            // Atualizar senha
            await updatePassword(this.auth.currentUser, novaSenha);
            
            // Atualizar registro
            const userId = this.auth.currentUser.uid;
            await setDoc(doc(this.db, 'usuarios', userId), {
                ...this.userData,
                ultimaAlteracaoSenha: new Date()
            });
            
            this.securityForm.reset();
            alert('Senha atualizada com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            if (error.code === 'auth/wrong-password') {
                alert('Senha atual incorreta. Por favor, tente novamente.');
            } else {
                alert('Erro ao atualizar senha. Por favor, tente novamente.');
            }
        } finally {
            this.hideLoading();
        }
    }

    updateTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    }

    async updateLanguage(language) {
        this.showLoading();
        try {
            const userId = this.auth.currentUser.uid;
            await setDoc(doc(this.db, 'usuarios', userId), {
                ...this.userData,
                idioma: language
            });
            
            this.userData.idioma = language;
            // TODO: Implementar mudança de idioma
            alert('Idioma atualizado com sucesso! A mudança será aplicada após recarregar a página.');
        } catch (error) {
            console.error('Erro ao atualizar idioma:', error);
            alert('Erro ao atualizar idioma. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    showConfirmation(action) {
        this.currentAction = action;
        
        if (action === 'desativar') {
            this.confirmationMessage.textContent = 
                'Tem certeza que deseja desativar sua conta? Você poderá reativá-la posteriormente.';
            this.confirmActionBtn.textContent = 'Desativar';
        } else if (action === 'excluir') {
            this.confirmationMessage.textContent = 
                'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.';
            this.confirmActionBtn.textContent = 'Excluir';
        }
        
        this.confirmationModal.style.display = 'block';
    }

    async deactivateAccount() {
        this.showLoading();
        try {
            const userId = this.auth.currentUser.uid;
            await setDoc(doc(this.db, 'usuarios', userId), {
                ...this.userData,
                ativo: false,
                dataDesativacao: new Date()
            });
            
            await this.auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao desativar conta:', error);
            alert('Erro ao desativar conta. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async deleteAccount() {
        this.showLoading();
        try {
            const userId = this.auth.currentUser.uid;
            
            // Excluir dados do usuário
            await deleteDoc(doc(this.db, 'usuarios', userId));
            
            // Excluir conta de autenticação
            await deleteUser(this.auth.currentUser);
            
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            alert('Erro ao excluir conta. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    formatDate(date) {
        if (!date) return 'N/A';
        
        if (date.toDate) {
            date = date.toDate();
        } else if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Inicialização
window.perfilManager = new PerfilManager(); 