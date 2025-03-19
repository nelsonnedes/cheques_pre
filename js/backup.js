import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class BackupManager {
    constructor() {
        this.db = getFirestore();
        this.auth = getAuth();
        
        // Elementos da UI
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.backupBtn = document.getElementById('backupBtn');
        this.exportJsonBtn = document.getElementById('exportJson');
        this.exportCsvBtn = document.getElementById('exportCsv');
        this.backupAutomatico = document.getElementById('backupAutomatico');
        this.frequenciaBackup = document.getElementById('frequenciaBackup');
        this.retencaoBackup = document.getElementById('retencaoBackup');
        this.backupHistory = document.getElementById('backupHistory');
        this.dropZone = document.getElementById('dropZone');
        this.backupFile = document.getElementById('backupFile');
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmationMessage = document.getElementById('confirmationMessage');
        this.confirmActionBtn = document.getElementById('confirmAction');
        
        // Estado
        this.currentAction = null;
        this.backupConfig = null;
        
        this.init();
    }

    async init() {
        this.showLoading();
        try {
            await this.checkAuth();
            await this.loadBackupConfig();
            this.setupEventListeners();
            await this.loadBackupHistory();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            alert('Erro ao carregar as configurações de backup. Por favor, tente novamente.');
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

    async loadBackupConfig() {
        try {
            const userId = this.auth.currentUser.uid;
            const configRef = doc(this.db, 'usuarios', userId);
            const docSnap = await getDoc(configRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                this.backupConfig = userData.backupConfig || {
                    automatico: false,
                    frequencia: 'daily',
                    retencao: 30
                };
            } else {
                this.backupConfig = {
                    automatico: false,
                    frequencia: 'daily',
                    retencao: 30
                };
                await setDoc(configRef, { backupConfig: this.backupConfig }, { merge: true });
            }
            
            this.updateUI();
        } catch (error) {
            console.error('Erro ao carregar configurações de backup:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Backup manual
        this.backupBtn.addEventListener('click', () => this.realizarBackup());
        
        // Exportação
        this.exportJsonBtn.addEventListener('click', () => this.exportarDados('json'));
        this.exportCsvBtn.addEventListener('click', () => this.exportarDados('csv'));
        
        // Configurações de backup automático
        this.backupAutomatico.addEventListener('change', () => this.atualizarConfigBackup());
        this.frequenciaBackup.addEventListener('change', () => this.atualizarConfigBackup());
        this.retencaoBackup.addEventListener('change', () => this.atualizarConfigBackup());
        
        // Restauração
        this.backupFile.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('dragover');
        });
        
        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('dragover');
        });
        
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFileSelect({ target: { files: [file] } });
            }
        });
        
        // Modal de confirmação
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.confirmationModal.style.display = 'none';
            });
        });
        
        this.confirmActionBtn.addEventListener('click', () => {
            if (this.currentAction === 'restore') {
                this.restaurarBackup();
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
    }

    updateUI() {
        // Configurações de backup
        this.backupAutomatico.checked = this.backupConfig.automatico;
        this.frequenciaBackup.value = this.backupConfig.frequencia;
        this.retencaoBackup.value = this.backupConfig.retencao;
        
        // Habilitar/desabilitar campos de configuração
        this.frequenciaBackup.disabled = !this.backupConfig.automatico;
        this.retencaoBackup.disabled = !this.backupConfig.automatico;
    }

    async loadBackupHistory() {
        try {
            const userId = this.auth.currentUser.uid;
            const backupsRef = collection(this.db, 'backups');
            const q = query(
                backupsRef,
                where('userId', '==', userId),
                orderBy('timestamp', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            this.backupHistory.innerHTML = '';
            
            if (querySnapshot.empty) {
                this.backupHistory.innerHTML = `
                    <div class="backup-item empty">
                        <p>Nenhum backup encontrado</p>
                    </div>
                `;
                return;
            }
            
            querySnapshot.forEach(doc => {
                const backup = doc.data();
                const backupItem = document.createElement('div');
                backupItem.className = 'backup-item';
                backupItem.innerHTML = `
                    <div class="backup-info">${this.formatDate(backup.timestamp)}</div>
                    <div class="backup-info">${this.formatSize(backup.size)}</div>
                    <div class="backup-info">
                        <span class="status-badge ${backup.status}">
                            ${this.getStatusText(backup.status)}
                        </span>
                    </div>
                    <div class="backup-actions">
                        <button class="btn-icon" onclick="backupManager.downloadBackup('${doc.id}')">
                            <i class="fas fa-download" title="Download"></i>
                        </button>
                        <button class="btn-icon" onclick="backupManager.showRestoreConfirmation('${doc.id}')">
                            <i class="fas fa-undo" title="Restaurar"></i>
                        </button>
                        <button class="btn-icon" onclick="backupManager.deleteBackup('${doc.id}')">
                            <i class="fas fa-trash-alt" title="Excluir"></i>
                        </button>
                    </div>
                `;
                this.backupHistory.appendChild(backupItem);
            });
        } catch (error) {
            console.error('Erro ao carregar histórico de backups:', error);
            this.backupHistory.innerHTML = `
                <div class="backup-item error">
                    <p>Erro ao carregar histórico</p>
                </div>
            `;
        }
    }

    async realizarBackup() {
        this.showLoading();
        try {
            const userId = this.auth.currentUser.uid;
            const timestamp = new Date();
            
            // Coletar dados para backup
            const dados = await this.coletarDados();
            
            // Criar registro do backup
            const backupRef = doc(collection(this.db, 'backups'));
            await setDoc(backupRef, {
                userId,
                timestamp,
                size: JSON.stringify(dados).length,
                status: 'success',
                data: dados
            });
            
            await this.loadBackupHistory();
            alert('Backup realizado com sucesso!');
        } catch (error) {
            console.error('Erro ao realizar backup:', error);
            alert('Erro ao realizar backup. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async coletarDados() {
        const userId = this.auth.currentUser.uid;
        const dados = {
            cheques: [],
            empresas: [],
            configuracoes: null,
            timestamp: new Date()
        };
        
        // Coletar cheques
        const chequesRef = collection(this.db, 'cheques');
        const chequesQuery = query(chequesRef, where('userId', '==', userId));
        const chequesSnapshot = await getDocs(chequesQuery);
        chequesSnapshot.forEach(doc => {
            dados.cheques.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Coletar empresas
        const empresasRef = collection(this.db, 'empresas');
        const empresasQuery = query(empresasRef, where('userId', '==', userId));
        const empresasSnapshot = await getDocs(empresasQuery);
        empresasSnapshot.forEach(doc => {
            dados.empresas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Coletar configurações
        const configRef = doc(this.db, 'usuarios', userId);
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
            dados.configuracoes = configSnap.data();
        }
        
        return dados;
    }

    async exportarDados(formato) {
        this.showLoading();
        try {
            const dados = await this.coletarDados();
            let conteudo, tipo, extensao;
            
            if (formato === 'json') {
                conteudo = JSON.stringify(dados, null, 2);
                tipo = 'application/json';
                extensao = 'json';
            } else {
                conteudo = this.converterParaCSV(dados);
                tipo = 'text/csv';
                extensao = 'csv';
            }
            
            const blob = new Blob([conteudo], { type: tipo });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${this.formatDateFileName()}.${extensao}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            alert('Erro ao exportar dados. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    converterParaCSV(dados) {
        let csv = '';
        
        // Cheques
        csv += 'CHEQUES\n';
        csv += 'ID,Número,Valor,Data,Vencimento,Status,Empresa\n';
        dados.cheques.forEach(cheque => {
            csv += `${cheque.id},${cheque.numeroCheque},${cheque.valor},${cheque.data},${cheque.vencimento},${cheque.status},${cheque.empresa}\n`;
        });
        
        csv += '\nEMPRESAS\n';
        csv += 'ID,Nome,CNPJ,Telefone,Email,Endereço\n';
        dados.empresas.forEach(empresa => {
            csv += `${empresa.id},${empresa.nome},${empresa.cnpj},${empresa.telefone},${empresa.email},${empresa.endereco}\n`;
        });
        
        return csv;
    }

    async atualizarConfigBackup() {
        this.showLoading();
        try {
            const config = {
                automatico: this.backupAutomatico.checked,
                frequencia: this.frequenciaBackup.value,
                retencao: parseInt(this.retencaoBackup.value)
            };
            
            const userId = this.auth.currentUser.uid;
            await setDoc(doc(this.db, 'usuarios', userId), {
                backupConfig: config
            }, { merge: true });
            
            this.backupConfig = config;
            this.updateUI();
            
            if (config.automatico) {
                this.configurarBackupAutomatico();
            }
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            alert('Erro ao atualizar configurações. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    configurarBackupAutomatico() {
        // Limpar intervalo existente se houver
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
        }
        
        // Configurar novo intervalo
        let intervalo;
        switch (this.backupConfig.frequencia) {
            case 'daily':
                intervalo = 24 * 60 * 60 * 1000; // 24 horas
                break;
            case 'weekly':
                intervalo = 7 * 24 * 60 * 60 * 1000; // 7 dias
                break;
            case 'monthly':
                intervalo = 30 * 24 * 60 * 60 * 1000; // 30 dias
                break;
            default:
                return;
        }
        
        this.backupInterval = setInterval(() => {
            this.realizarBackup();
            this.limparBackupsAntigos();
        }, intervalo);
    }

    async limparBackupsAntigos() {
        try {
            const userId = this.auth.currentUser.uid;
            const limite = new Date();
            limite.setDate(limite.getDate() - this.backupConfig.retencao);
            
            const backupsRef = collection(this.db, 'backups');
            const q = query(
                backupsRef,
                where('userId', '==', userId),
                where('timestamp', '<=', limite)
            );
            
            const querySnapshot = await getDocs(q);
            const batch = this.db.batch();
            
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            await this.loadBackupHistory();
        } catch (error) {
            console.error('Erro ao limpar backups antigos:', error);
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dados = JSON.parse(e.target.result);
                this.dadosRestauracao = dados;
                this.showRestoreConfirmation();
            } catch (error) {
                console.error('Erro ao ler arquivo:', error);
                alert('Arquivo inválido. Por favor, selecione um arquivo de backup válido.');
            }
        };
        reader.readAsText(file);
    }

    showRestoreConfirmation(backupId) {
        this.currentAction = 'restore';
        this.backupIdRestauracao = backupId;
        
        this.confirmationMessage.textContent = 
            'Atenção: A restauração substituirá todos os dados atuais. Deseja continuar?';
        this.confirmActionBtn.textContent = 'Restaurar';
        
        this.confirmationModal.style.display = 'block';
    }

    async restaurarBackup() {
        this.showLoading();
        try {
            let dados;
            
            if (this.backupIdRestauracao) {
                // Restaurar do histórico
                const backupRef = doc(this.db, 'backups', this.backupIdRestauracao);
                const backupSnap = await getDoc(backupRef);
                if (!backupSnap.exists()) {
                    throw new Error('Backup não encontrado');
                }
                dados = backupSnap.data().data;
            } else {
                // Restaurar do arquivo
                dados = this.dadosRestauracao;
            }
            
            await this.restaurarDados(dados);
            
            this.confirmationModal.style.display = 'none';
            alert('Dados restaurados com sucesso!');
            window.location.reload();
        } catch (error) {
            console.error('Erro ao restaurar dados:', error);
            alert('Erro ao restaurar dados. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async restaurarDados(dados) {
        const userId = this.auth.currentUser.uid;
        
        // Restaurar cheques
        const chequesRef = collection(this.db, 'cheques');
        const chequesQuery = query(chequesRef, where('userId', '==', userId));
        const chequesSnapshot = await getDocs(chequesQuery);
        const batch = this.db.batch();
        
        // Excluir cheques existentes
        chequesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Adicionar novos cheques
        dados.cheques.forEach(cheque => {
            const newRef = doc(chequesRef);
            batch.set(newRef, {
                ...cheque,
                userId
            });
        });
        
        // Restaurar empresas
        const empresasRef = collection(this.db, 'empresas');
        const empresasQuery = query(empresasRef, where('userId', '==', userId));
        const empresasSnapshot = await getDocs(empresasQuery);
        
        // Excluir empresas existentes
        empresasSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Adicionar novas empresas
        dados.empresas.forEach(empresa => {
            const newRef = doc(empresasRef);
            batch.set(newRef, {
                ...empresa,
                userId
            });
        });
        
        // Restaurar configurações
        if (dados.configuracoes) {
            const configRef = doc(this.db, 'usuarios', userId);
            batch.set(configRef, dados.configuracoes, { merge: true });
        }
        
        await batch.commit();
    }

    async downloadBackup(backupId) {
        this.showLoading();
        try {
            const backupRef = doc(this.db, 'backups', backupId);
            const backupSnap = await getDoc(backupRef);
            
            if (!backupSnap.exists()) {
                throw new Error('Backup não encontrado');
            }
            
            const dados = backupSnap.data().data;
            const conteudo = JSON.stringify(dados, null, 2);
            const blob = new Blob([conteudo], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${this.formatDateFileName()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao baixar backup:', error);
            alert('Erro ao baixar backup. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async deleteBackup(backupId) {
        if (!confirm('Tem certeza que deseja excluir este backup?')) {
            return;
        }
        
        this.showLoading();
        try {
            await deleteDoc(doc(this.db, 'backups', backupId));
            await this.loadBackupHistory();
        } catch (error) {
            console.error('Erro ao excluir backup:', error);
            alert('Erro ao excluir backup. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    formatDate(date) {
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

    formatDateFileName() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    getStatusText(status) {
        const statusMap = {
            'success': 'Concluído',
            'pending': 'Pendente',
            'error': 'Erro'
        };
        return statusMap[status] || status;
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Inicialização
window.backupManager = new BackupManager(); 