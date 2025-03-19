import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class ConfiguracoesManager {
    constructor() {
        this.db = getFirestore();
        this.auth = getAuth();
        
        // Elementos da UI
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.salvarBtn = document.getElementById('salvarConfig');
        this.resetarBtn = document.getElementById('resetarConfig');
        
        // Configurações padrão
        this.defaultConfig = {
            notificacoes: {
                alertasVencimento: true,
                diasAntecedencia: 3,
                notificacoesEmail: true
            },
            preferencias: {
                moedaPadrao: 'BRL',
                formatoData: 'dd/mm/yyyy',
                itensPorPagina: 25
            },
            seguranca: {
                autenticacaoDupla: false,
                tempoSessao: 30,
                historicoLogin: true
            },
            backup: {
                backupAutomatico: true,
                frequenciaBackup: 'daily',
                sincronizacaoNuvem: true
            }
        };
        
        this.init();
    }

    async init() {
        this.showLoading();
        try {
            await this.checkAuth();
            this.setupEventListeners();
            await this.carregarConfiguracoes();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            alert('Erro ao carregar as configurações. Por favor, tente novamente.');
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

    setupEventListeners() {
        // Salvar configurações
        this.salvarBtn.addEventListener('click', () => this.salvarConfiguracoes());

        // Resetar configurações
        this.resetarBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja restaurar todas as configurações para os valores padrão?')) {
                this.resetarConfiguracoes();
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });

        // Atualizar configurações ao mudar
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', () => {
                this.salvarBtn.disabled = false;
            });
        });
    }

    async carregarConfiguracoes() {
        try {
            const userId = this.auth.currentUser.uid;
            const configRef = doc(this.db, 'configuracoes', userId);
            const docSnap = await getDoc(configRef);
            
            let config;
            if (docSnap.exists()) {
                config = docSnap.data();
            } else {
                config = this.defaultConfig;
                await setDoc(configRef, config);
            }
            
            this.atualizarFormulario(config);
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            throw error;
        }
    }

    atualizarFormulario(config) {
        // Notificações
        document.getElementById('notifVencimento').checked = config.notificacoes.alertasVencimento;
        document.getElementById('diasAntecedencia').value = config.notificacoes.diasAntecedencia;
        document.getElementById('notifEmail').checked = config.notificacoes.notificacoesEmail;
        
        // Preferências
        document.getElementById('moedaPadrao').value = config.preferencias.moedaPadrao;
        document.getElementById('formatoData').value = config.preferencias.formatoData;
        document.getElementById('itensPorPagina').value = config.preferencias.itensPorPagina;
        
        // Segurança
        document.getElementById('autenticacaoDupla').checked = config.seguranca.autenticacaoDupla;
        document.getElementById('tempoSessao').value = config.seguranca.tempoSessao;
        document.getElementById('historicoLogin').checked = config.seguranca.historicoLogin;
        
        // Backup
        document.getElementById('backupAutomatico').checked = config.backup.backupAutomatico;
        document.getElementById('frequenciaBackup').value = config.backup.frequenciaBackup;
        document.getElementById('sincCloud').checked = config.backup.sincronizacaoNuvem;
        
        // Desabilitar botão de salvar
        this.salvarBtn.disabled = true;
    }

    async salvarConfiguracoes() {
        this.showLoading();
        try {
            const config = {
                notificacoes: {
                    alertasVencimento: document.getElementById('notifVencimento').checked,
                    diasAntecedencia: parseInt(document.getElementById('diasAntecedencia').value),
                    notificacoesEmail: document.getElementById('notifEmail').checked
                },
                preferencias: {
                    moedaPadrao: document.getElementById('moedaPadrao').value,
                    formatoData: document.getElementById('formatoData').value,
                    itensPorPagina: parseInt(document.getElementById('itensPorPagina').value)
                },
                seguranca: {
                    autenticacaoDupla: document.getElementById('autenticacaoDupla').checked,
                    tempoSessao: parseInt(document.getElementById('tempoSessao').value),
                    historicoLogin: document.getElementById('historicoLogin').checked
                },
                backup: {
                    backupAutomatico: document.getElementById('backupAutomatico').checked,
                    frequenciaBackup: document.getElementById('frequenciaBackup').value,
                    sincronizacaoNuvem: document.getElementById('sincCloud').checked
                }
            };
            
            const userId = this.auth.currentUser.uid;
            await setDoc(doc(this.db, 'configuracoes', userId), config);
            
            this.salvarBtn.disabled = true;
            alert('Configurações salvas com sucesso!');
            
            // Atualizar configurações no localStorage para uso em outras páginas
            localStorage.setItem('userConfig', JSON.stringify(config));
            
            // Aplicar configurações
            this.aplicarConfiguracoes(config);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            alert('Erro ao salvar as configurações. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async resetarConfiguracoes() {
        this.showLoading();
        try {
            const userId = this.auth.currentUser.uid;
            await setDoc(doc(this.db, 'configuracoes', userId), this.defaultConfig);
            
            this.atualizarFormulario(this.defaultConfig);
            alert('Configurações restauradas com sucesso!');
            
            // Atualizar configurações no localStorage
            localStorage.setItem('userConfig', JSON.stringify(this.defaultConfig));
            
            // Aplicar configurações
            this.aplicarConfiguracoes(this.defaultConfig);
        } catch (error) {
            console.error('Erro ao resetar configurações:', error);
            alert('Erro ao restaurar as configurações. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    aplicarConfiguracoes(config) {
        // Aplicar tema
        document.documentElement.setAttribute('data-theme', config.preferencias.tema || 'light');
        
        // Configurar tempo de sessão
        if (config.seguranca.tempoSessao) {
            this.configurarTempoSessao(config.seguranca.tempoSessao);
        }
        
        // Configurar notificações
        if (config.notificacoes.alertasVencimento) {
            this.configurarNotificacoes(config);
        }
        
        // Configurar backup automático
        if (config.backup.backupAutomatico) {
            this.configurarBackupAutomatico(config.backup.frequenciaBackup);
        }
    }

    configurarTempoSessao(minutos) {
        let tempoInativo = 0;
        const intervalo = minutos * 60 * 1000;
        
        // Resetar contador quando houver atividade
        const resetarContador = () => {
            tempoInativo = 0;
        };
        
        document.addEventListener('mousemove', resetarContador);
        document.addEventListener('keypress', resetarContador);
        
        // Verificar inatividade
        setInterval(() => {
            tempoInativo += 1000;
            if (tempoInativo >= intervalo) {
                this.auth.signOut().then(() => {
                    alert('Sessão expirada por inatividade.');
                    window.location.href = 'login.html';
                });
            }
        }, 1000);
    }

    configurarNotificacoes(config) {
        // Verificar suporte a notificações
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    // Configurar verificação de vencimentos
                    setInterval(() => {
                        this.verificarVencimentos(config.notificacoes.diasAntecedencia);
                    }, 3600000); // Verificar a cada hora
                }
            });
        }
    }

    async verificarVencimentos(diasAntecedencia) {
        const hoje = new Date();
        const limite = new Date();
        limite.setDate(hoje.getDate() + diasAntecedencia);
        
        try {
            const userId = this.auth.currentUser.uid;
            const chequesRef = collection(this.db, 'cheques');
            const q = query(
                chequesRef,
                where('userId', '==', userId),
                where('status', '==', 'pendente'),
                where('vencimento', '<=', limite),
                where('vencimento', '>=', hoje)
            );
            
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const cheque = doc.data();
                const diasRestantes = Math.ceil((cheque.vencimento.toDate() - hoje) / (1000 * 60 * 60 * 24));
                
                new Notification('Cheque próximo do vencimento', {
                    body: `O cheque ${cheque.numeroCheque} vence em ${diasRestantes} dias.`,
                    icon: '/img/favicon.png'
                });
            });
        } catch (error) {
            console.error('Erro ao verificar vencimentos:', error);
        }
    }

    configurarBackupAutomatico(frequencia) {
        let intervalo;
        switch (frequencia) {
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
        
        setInterval(() => {
            this.realizarBackupAutomatico();
        }, intervalo);
    }

    async realizarBackupAutomatico() {
        try {
            const userId = this.auth.currentUser.uid;
            const data = new Date().toISOString().split('T')[0];
            const backupRef = doc(this.db, 'backups', `${userId}_${data}`);
            
            // Coletar dados para backup
            const dados = {
                cheques: [],
                empresas: [],
                configuracoes: null,
                timestamp: new Date()
            };
            
            // Backup de cheques
            const chequesSnapshot = await getDocs(collection(this.db, 'cheques'));
            chequesSnapshot.forEach(doc => {
                dados.cheques.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Backup de empresas
            const empresasSnapshot = await getDocs(collection(this.db, 'empresas'));
            empresasSnapshot.forEach(doc => {
                dados.empresas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Backup de configurações
            const configSnapshot = await getDoc(doc(this.db, 'configuracoes', userId));
            if (configSnapshot.exists()) {
                dados.configuracoes = configSnapshot.data();
            }
            
            // Salvar backup
            await setDoc(backupRef, dados);
            
            console.log('Backup automático realizado com sucesso:', data);
        } catch (error) {
            console.error('Erro ao realizar backup automático:', error);
        }
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Inicialização
window.configuracoesManager = new ConfiguracoesManager(); 