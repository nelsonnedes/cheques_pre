import { auth, db } from './firebase-config.js';
import { 
    updateProfile, 
    updatePassword, 
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    deleteDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { BackupManager } from './backup-manager.js';

class ConfiguracoesManager {
    constructor() {
        this.currentUser = null;
        this.userSettings = null;
        this.backupManager = new BackupManager();
        
        // Elements
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');
        this.currentPassword = document.getElementById('currentPassword');
        this.newPassword = document.getElementById('newPassword');
        this.confirmPassword = document.getElementById('confirmPassword');
        this.emailNotifications = document.getElementById('emailNotifications');
        this.pushNotifications = document.getElementById('pushNotifications');
        this.alertDays = document.getElementById('alertDays');
        this.autoBackup = document.getElementById('autoBackup');
        this.backupFrequency = document.getElementById('backupFrequency');
        this.theme = document.getElementById('theme');
        this.fontSize = document.getElementById('fontSize');
        
        // Buttons
        this.btnUpdateProfile = document.getElementById('btnUpdateProfile');
        this.btnChangePassword = document.getElementById('btnChangePassword');
        this.btnBackupNow = document.getElementById('btnBackupNow');
        this.btnDeleteAccount = document.getElementById('btnDeleteAccount');
        
        // Modals
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmationMessage = document.getElementById('confirmationMessage');
        this.confirmAction = document.getElementById('confirmAction');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        // Toast container
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);

        // Backup restore
        this.setupBackupRestoreUI();

        // Support settings
        this.supportSettings = {
            enabled: false,
            businessHours: {
                start: '08:00',
                end: '18:00'
            },
            offlineMessage: 'Estamos fora do horário de atendimento. Por favor, deixe sua mensagem e retornaremos assim que possível.',
            welcomeMessage: 'Olá! Como posso ajudar?',
            quickResponses: [
                'Olá! Como posso ajudar?',
                'Em que mais posso ajudar?',
                'Agradeço seu contato! Tenha um ótimo dia!'
            ]
        };
        
        this.init();
    }

    setupBackupRestoreUI() {
        // Criar área de restauração
        const backupSection = document.querySelector('.settings-section:nth-child(4)');
        const restoreArea = document.createElement('div');
        restoreArea.className = 'settings-item';
        restoreArea.innerHTML = `
            <label>Restaurar Backup</label>
            <div class="upload-area" id="uploadArea">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Arraste um arquivo de backup ou clique para selecionar</p>
                <input type="file" id="backupFile" accept=".json" style="display: none">
            </div>
            <div class="restore-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Atenção: A restauração substituirá todos os dados atuais pelos dados do backup.</p>
            </div>
        `;
        backupSection.appendChild(restoreArea);

        // Setup drag and drop
        const uploadArea = document.getElementById('uploadArea');
        const backupFile = document.getElementById('backupFile');

        uploadArea.addEventListener('click', () => backupFile.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.handleBackupFile(file);
        });
        backupFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleBackupFile(file);
        });
    }

    async handleBackupFile(file) {
        if (file.type !== 'application/json') {
            this.showError('Por favor, selecione um arquivo de backup válido (.json)');
            return;
        }

        this.confirmationMessage.textContent = 'Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos.';
        this.confirmAction.onclick = async () => {
            this.closeModals();
            this.showLoading();
            try {
                await this.backupManager.restoreBackup(file);
                this.showSuccess('Backup restaurado com sucesso!');
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                this.showError(error.message || 'Erro ao restaurar backup');
            } finally {
                this.hideLoading();
            }
        };
        this.confirmationModal.style.display = 'block';
    }

    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadSettings();
        
        // Setup support settings
        this.setupSupportSettings();
    }

    checkAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.userName.value = user.displayName || '';
                this.userEmail.value = user.email;
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    setupEventListeners() {
        // Profile
        this.btnUpdateProfile.addEventListener('click', () => this.updateProfile());
        
        // Password
        this.btnChangePassword.addEventListener('click', () => this.changePassword());
        
        // Settings
        this.emailNotifications.addEventListener('change', () => this.saveSettings());
        this.pushNotifications.addEventListener('change', () => this.saveSettings());
        this.alertDays.addEventListener('change', () => this.saveSettings());
        this.autoBackup.addEventListener('change', () => {
            if (this.autoBackup.checked) {
                this.backupFrequency.disabled = false;
                this.scheduleAutomaticBackup();
            } else {
                this.backupFrequency.disabled = true;
                this.disableAutomaticBackup();
            }
        });
        this.backupFrequency.addEventListener('change', () => {
            if (this.autoBackup.checked) {
                this.scheduleAutomaticBackup();
            }
        });
        this.theme.addEventListener('change', () => {
            this.saveSettings();
            this.applyTheme(this.theme.value);
        });
        this.fontSize.addEventListener('change', () => {
            this.saveSettings();
            this.applyFontSize(this.fontSize.value);
        });
        
        // Backup
        this.btnBackupNow.addEventListener('click', () => this.backupNow());
        
        // Delete Account
        this.btnDeleteAccount.addEventListener('click', () => this.showDeleteConfirmation());
        
        // Modal
        document.querySelectorAll('.close-modal, [data-dismiss="modal"]').forEach(button => {
            button.addEventListener('click', () => this.closeModals());
        });
    }

    async loadSettings() {
        try {
            const userDoc = doc(this.db, 'users', auth.currentUser.uid);
            const docSnap = await getDoc(userDoc);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Load notification settings
                if (data.notificationSettings) {
                    this.notificationSettings = data.notificationSettings;
                    document.getElementById('enableNotifications').checked = this.notificationSettings.enabled;
                    document.getElementById('daysInAdvance').value = this.notificationSettings.daysInAdvance;
                    document.getElementById('notifyDueDate').checked = this.notificationSettings.notifyDueDate;
                    document.getElementById('notifyStatusChange').checked = this.notificationSettings.notifyStatusChange;
                    document.getElementById('notifyBackup').checked = this.notificationSettings.notifyBackup;
                    document.getElementById('notificationStartTime').value = this.notificationSettings.timeRange.start;
                    document.getElementById('notificationEndTime').value = this.notificationSettings.timeRange.end;
                }
                
                // Load support settings
                if (data.supportSettings) {
                    this.supportSettings = data.supportSettings;
                    document.getElementById('enableSupport').checked = this.supportSettings.enabled;
                    document.getElementById('supportStartTime').value = this.supportSettings.businessHours.start;
                    document.getElementById('supportEndTime').value = this.supportSettings.businessHours.end;
                    document.getElementById('offlineMessage').value = this.supportSettings.offlineMessage;
                    document.getElementById('welcomeMessage').value = this.supportSettings.welcomeMessage;
                    
                    // Update quick responses list
                    const quickResponsesList = document.querySelector('.quick-responses-list');
                    const addQuickResponseBtn = document.getElementById('addQuickResponse');
                    
                    // Remove existing quick responses
                    Array.from(quickResponsesList.querySelectorAll('.quick-response-item')).forEach(item => item.remove());
                    
                    // Add loaded quick responses
                    this.supportSettings.quickResponses.forEach((response, index) => {
                        const newResponse = document.createElement('div');
                        newResponse.className = 'quick-response-item';
                        newResponse.innerHTML = `
                            <input type="text" class="form-control" value="${response}">
                            <button class="btn-remove" data-index="${index}">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                        
                        quickResponsesList.insertBefore(newResponse, addQuickResponseBtn);
                        
                        // Setup remove button
                        newResponse.querySelector('.btn-remove').addEventListener('click', () => {
                            newResponse.remove();
                        });
                    });
                }
                
                // Load theme settings
                if (data.theme) {
                    this.setTheme(data.theme);
                    document.getElementById('themeSwitch').checked = data.theme === 'dark';
                }
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            this.showToast('Erro ao carregar configurações. Tente novamente.', 'error');
        }
    }

    async saveSettings() {
        try {
            this.showLoading();
            
            const settings = {
                emailNotifications: this.emailNotifications.checked,
                pushNotifications: this.pushNotifications.checked,
                alertDays: this.alertDays.value,
                autoBackup: this.autoBackup.checked,
                backupFrequency: this.backupFrequency.value,
                theme: this.theme.value,
                fontSize: this.fontSize.value,
                updatedAt: new Date()
            };
            
            await setDoc(doc(this.db, 'userSettings', this.currentUser.uid), settings);
            this.userSettings = settings;
            
            this.showSuccess('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showError('Erro ao salvar configurações. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async updateProfile() {
        try {
            this.showLoading();
            
            await updateProfile(this.currentUser, {
                displayName: this.userName.value
            });
            
            this.showSuccess('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            this.showError('Erro ao atualizar perfil. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async changePassword() {
        try {
            if (this.newPassword.value !== this.confirmPassword.value) {
                this.showError('As senhas não coincidem.');
                return;
            }
            
            this.showLoading();
            
            // Reautenticar usuário
            const credential = EmailAuthProvider.credential(
                this.currentUser.email,
                this.currentPassword.value
            );
            
            await reauthenticateWithCredential(this.currentUser, credential);
            
            // Alterar senha
            await updatePassword(this.currentUser, this.newPassword.value);
            
            // Limpar campos
            this.currentPassword.value = '';
            this.newPassword.value = '';
            this.confirmPassword.value = '';
            
            this.showSuccess('Senha alterada com sucesso!');
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            if (error.code === 'auth/wrong-password') {
                this.showError('Senha atual incorreta.');
            } else {
                this.showError('Erro ao alterar senha. Por favor, tente novamente.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async backupNow() {
        try {
            this.showLoading();
            const result = await this.backupManager.createBackup();
            this.showSuccess('Backup realizado com sucesso!');
            console.log('Backup metadata:', result.metadata);
        } catch (error) {
            console.error('Erro ao realizar backup:', error);
            this.showError('Erro ao realizar backup. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async scheduleAutomaticBackup() {
        try {
            await this.backupManager.scheduleAutomaticBackup(this.backupFrequency.value);
            this.showSuccess('Backup automático configurado com sucesso!');
        } catch (error) {
            console.error('Erro ao configurar backup automático:', error);
            this.showError('Erro ao configurar backup automático');
        }
    }

    async disableAutomaticBackup() {
        try {
            const userId = this.currentUser.uid;
            await setDoc(doc(this.db, 'backupSchedules', userId), {
                active: false,
                updatedAt: new Date()
            }, { merge: true });
            this.showSuccess('Backup automático desativado');
        } catch (error) {
            console.error('Erro ao desativar backup automático:', error);
            this.showError('Erro ao desativar backup automático');
        }
    }

    showDeleteConfirmation() {
        this.confirmationMessage.textContent = 'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.';
        this.confirmAction.onclick = () => this.deleteAccount();
        this.confirmationModal.style.display = 'block';
    }

    async deleteAccount() {
        try {
            this.showLoading();
            this.closeModals();
            
            // Excluir dados do usuário
            await deleteDoc(doc(this.db, 'userSettings', this.currentUser.uid));
            
            // Excluir conta
            await deleteUser(this.currentUser);
            
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            this.showError('Erro ao excluir conta. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    applyTheme(theme) {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
    }

    applyFontSize(size) {
        document.documentElement.style.fontSize = {
            small: '14px',
            medium: '16px',
            large: '18px'
        }[size];
        localStorage.setItem('fontSize', size);
    }

    closeModals() {
        this.confirmationModal.style.display = 'none';
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <div class="toast-progress"></div>
        `;
        
        this.toastContainer.appendChild(toast);

        // Animate progress bar
        const progress = toast.querySelector('.toast-progress');
        progress.style.width = '100%';
        setTimeout(() => progress.style.width = '0%', 100);

        // Remove toast after animation
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async setupSupportSettings() {
        const supportSection = document.createElement('div');
        supportSection.className = 'settings-section';
        supportSection.innerHTML = `
            <h2><i class="fas fa-headset"></i> Configurações do Suporte</h2>
            <div class="settings-group">
                <div class="settings-item">
                    <label>Ativar Suporte Online</label>
                    <div class="description">Habilitar chat de suporte para os usuários</div>
                    <div class="switch">
                        <input type="checkbox" id="enableSupport">
                        <span class="slider"></span>
                    </div>
                </div>
                
                <div class="settings-item">
                    <label>Horário de Atendimento</label>
                    <div class="time-range">
                        <div class="time-input">
                            <label for="supportStartTime">Início</label>
                            <input type="time" id="supportStartTime" value="08:00">
                        </div>
                        <div class="time-input">
                            <label for="supportEndTime">Fim</label>
                            <input type="time" id="supportEndTime" value="18:00">
                        </div>
                    </div>
                </div>
                
                <div class="settings-item">
                    <label>Mensagem Fora do Horário</label>
                    <textarea id="offlineMessage" class="form-control" rows="3">${this.supportSettings.offlineMessage}</textarea>
                </div>
                
                <div class="settings-item">
                    <label>Mensagem de Boas-vindas</label>
                    <textarea id="welcomeMessage" class="form-control" rows="3">${this.supportSettings.welcomeMessage}</textarea>
                </div>
                
                <div class="settings-item">
                    <label>Respostas Rápidas</label>
                    <div class="quick-responses-list">
                        ${this.supportSettings.quickResponses.map((response, index) => `
                            <div class="quick-response-item">
                                <input type="text" class="form-control" value="${response}">
                                <button class="btn-remove" data-index="${index}">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                        <button class="btn btn-secondary" id="addQuickResponse">
                            <i class="fas fa-plus"></i>
                            Adicionar Resposta
                        </button>
                    </div>
                </div>
                
                <div class="settings-item">
                    <button class="btn btn-primary" id="saveSupportSettings">
                        <i class="fas fa-save"></i>
                        Salvar Configurações
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar seção ao container
        const container = document.querySelector('.settings-container');
        container.insertBefore(supportSection, container.querySelector('.danger-zone'));
        
        // Setup event listeners
        this.setupSupportEventListeners();
    }

    setupSupportEventListeners() {
        const enableSupport = document.getElementById('enableSupport');
        const supportStartTime = document.getElementById('supportStartTime');
        const supportEndTime = document.getElementById('supportEndTime');
        const offlineMessage = document.getElementById('offlineMessage');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const addQuickResponse = document.getElementById('addQuickResponse');
        const saveSupportSettings = document.getElementById('saveSupportSettings');
        
        // Load current settings
        enableSupport.checked = this.supportSettings.enabled;
        supportStartTime.value = this.supportSettings.businessHours.start;
        supportEndTime.value = this.supportSettings.businessHours.end;
        
        // Add quick response
        addQuickResponse.addEventListener('click', () => {
            const quickResponsesList = document.querySelector('.quick-responses-list');
            const newResponse = document.createElement('div');
            newResponse.className = 'quick-response-item';
            newResponse.innerHTML = `
                <input type="text" class="form-control" value="">
                <button class="btn-remove">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            quickResponsesList.insertBefore(newResponse, addQuickResponse);
            
            // Setup remove button
            newResponse.querySelector('.btn-remove').addEventListener('click', () => {
                newResponse.remove();
            });
        });
        
        // Remove quick response
        document.querySelectorAll('.btn-remove').forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.quick-response-item').remove();
            });
        });
        
        // Save settings
        saveSupportSettings.addEventListener('click', async () => {
            try {
                const quickResponses = Array.from(document.querySelectorAll('.quick-response-item input'))
                    .map(input => input.value.trim())
                    .filter(value => value);
                
                this.supportSettings = {
                    enabled: enableSupport.checked,
                    businessHours: {
                        start: supportStartTime.value,
                        end: supportEndTime.value
                    },
                    offlineMessage: offlineMessage.value.trim(),
                    welcomeMessage: welcomeMessage.value.trim(),
                    quickResponses
                };
                
                // Save to Firestore
                const userDoc = doc(this.db, 'users', auth.currentUser.uid);
                await updateDoc(userDoc, {
                    supportSettings: this.supportSettings
                });
                
                this.showToast('Configurações de suporte salvas com sucesso!', 'success');
            } catch (error) {
                console.error('Erro ao salvar configurações:', error);
                this.showToast('Erro ao salvar configurações. Tente novamente.', 'error');
            }
        });
    }
}

// Inicializar e exportar instância
const configuracoesManager = new ConfiguracoesManager();
window.configuracoesManager = configuracoesManager; // Para acesso global 