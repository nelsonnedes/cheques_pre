import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { formatCPFCNPJ, formatPhone } from './utils.js';

class EmpresasManager {
    constructor() {
        this.db = getFirestore();
        this.auth = getAuth();
        
        // Elementos da UI
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.empresaForm = document.getElementById('empresaForm');
        this.editForm = document.getElementById('editForm');
        this.empresasList = document.getElementById('empresasList');
        this.searchInput = document.getElementById('searchEmpresa');
        this.toggleFormBtn = document.getElementById('toggleForm');
        this.editModal = document.getElementById('editModal');
        this.deleteModal = document.getElementById('deleteModal');
        
        // Estado
        this.currentEmpresaId = null;
        this.empresas = new Map();
        this.filteredEmpresas = [];
        
        this.init();
    }

    async init() {
        this.showLoading();
        try {
            await this.checkAuth();
            this.setupEventListeners();
            await this.loadEmpresas();
            this.copyEstadosToEditForm();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            alert('Erro ao carregar os dados. Por favor, tente novamente.');
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
        // Toggle do formulário
        this.toggleFormBtn.addEventListener('click', () => {
            this.empresaForm.classList.toggle('hidden');
            this.toggleFormBtn.innerHTML = this.empresaForm.classList.contains('hidden') 
                ? '<i class="fas fa-plus"></i> Adicionar Empresa'
                : '<i class="fas fa-minus"></i> Ocultar Formulário';
        });

        // Form principal
        this.empresaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(e.target);
        });

        // Busca
        this.searchInput.addEventListener('input', this.debounce(() => {
            this.filterEmpresas();
        }, 300));

        // Modal de edição
        this.editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEdit();
        });

        // Fechar modais
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.editModal.style.display = 'none';
                this.deleteModal.style.display = 'none';
            });
        });

        // Confirmar exclusão
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.handleDelete();
        });

        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.editModal.style.display = 'none';
            }
            if (e.target === this.deleteModal) {
                this.deleteModal.style.display = 'none';
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });

        // Máscaras de input
        this.setupInputMasks();
    }

    setupInputMasks() {
        const maskCNPJ = (el) => {
            el.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 14) {
                    value = value.replace(/(\d{2})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d)/, '$1/$2');
                    value = value.replace(/(\d{4})(\d)/, '$1-$2');
                }
                e.target.value = value;
            });
        };

        const maskPhone = (el) => {
            el.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                    if (value.length > 2) {
                        value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
                    }
                    if (value.length > 9) {
                        value = `${value.substring(0, 9)}-${value.substring(9)}`;
                    }
                }
                e.target.value = value;
            });
        };

        // Aplicar máscaras
        maskCNPJ(document.getElementById('cnpj'));
        maskCNPJ(document.getElementById('editCnpj'));
        maskPhone(document.getElementById('telefone'));
        maskPhone(document.getElementById('editTelefone'));
    }

    async loadEmpresas() {
        this.showLoading();
        try {
            const empresasRef = collection(this.db, 'empresas');
            const q = query(empresasRef, orderBy('nome'));
            const snapshot = await getDocs(q);
            
            this.empresas.clear();
            snapshot.forEach(doc => {
                this.empresas.set(doc.id, {
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.filteredEmpresas = Array.from(this.empresas.values());
            this.renderEmpresas();
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            alert('Erro ao carregar empresas. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async handleSubmit(form) {
        this.showLoading();
        try {
            const formData = new FormData(form);
            const empresa = {
                nome: formData.get('nome'),
                cnpj: formData.get('cnpj'),
                telefone: formData.get('telefone'),
                email: formData.get('email'),
                endereco: formData.get('endereco'),
                cidade: formData.get('cidade'),
                estado: formData.get('estado'),
                observacoes: formData.get('observacoes'),
                dataCadastro: new Date(),
                dataAtualizacao: new Date()
            };

            await addDoc(collection(this.db, 'empresas'), empresa);
            form.reset();
            this.empresaForm.classList.add('hidden');
            this.toggleFormBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Empresa';
            await this.loadEmpresas();
            alert('Empresa cadastrada com sucesso!');
        } catch (error) {
            console.error('Erro ao cadastrar empresa:', error);
            alert('Erro ao cadastrar empresa. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async handleEdit() {
        if (!this.currentEmpresaId) return;
        
        this.showLoading();
        try {
            const formData = new FormData(this.editForm);
            const empresa = {
                nome: formData.get('nome'),
                cnpj: formData.get('cnpj'),
                telefone: formData.get('telefone'),
                email: formData.get('email'),
                endereco: formData.get('endereco'),
                cidade: formData.get('cidade'),
                estado: formData.get('estado'),
                observacoes: formData.get('observacoes'),
                dataAtualizacao: new Date()
            };

            const empresaRef = doc(this.db, 'empresas', this.currentEmpresaId);
            await updateDoc(empresaRef, empresa);
            this.editModal.style.display = 'none';
            await this.loadEmpresas();
            alert('Empresa atualizada com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar empresa:', error);
            alert('Erro ao atualizar empresa. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async handleDelete() {
        if (!this.currentEmpresaId) return;
        
        this.showLoading();
        try {
            // Verificar se existem cheques vinculados
            const chequesRef = collection(this.db, 'cheques');
            const q = query(chequesRef, where('empresaId', '==', this.currentEmpresaId));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                alert('Não é possível excluir esta empresa pois existem cheques vinculados a ela.');
                return;
            }

            await deleteDoc(doc(this.db, 'empresas', this.currentEmpresaId));
            this.deleteModal.style.display = 'none';
            await this.loadEmpresas();
            alert('Empresa excluída com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            alert('Erro ao excluir empresa. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    editEmpresa(id) {
        const empresa = this.empresas.get(id);
        if (!empresa) return;

        this.currentEmpresaId = id;
        
        // Preencher formulário
        document.getElementById('editNome').value = empresa.nome;
        document.getElementById('editCnpj').value = empresa.cnpj;
        document.getElementById('editTelefone').value = empresa.telefone || '';
        document.getElementById('editEmail').value = empresa.email || '';
        document.getElementById('editEndereco').value = empresa.endereco || '';
        document.getElementById('editCidade').value = empresa.cidade || '';
        document.getElementById('editEstado').value = empresa.estado || '';
        document.getElementById('editObservacoes').value = empresa.observacoes || '';

        this.editModal.style.display = 'block';
    }

    confirmDelete(id) {
        const empresa = this.empresas.get(id);
        if (!empresa) return;

        this.currentEmpresaId = id;
        document.getElementById('deleteEmpresaNome').textContent = empresa.nome;
        this.deleteModal.style.display = 'block';
    }

    filterEmpresas() {
        const searchTerm = this.searchInput.value.toLowerCase();
        
        if (!searchTerm) {
            this.filteredEmpresas = Array.from(this.empresas.values());
        } else {
            this.filteredEmpresas = Array.from(this.empresas.values()).filter(empresa => {
                return empresa.nome.toLowerCase().includes(searchTerm) ||
                       empresa.cnpj.toLowerCase().includes(searchTerm) ||
                       (empresa.cidade && empresa.cidade.toLowerCase().includes(searchTerm));
            });
        }
        
        this.renderEmpresas();
    }

    renderEmpresas() {
        if (this.filteredEmpresas.length === 0) {
            this.empresasList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <h3>Nenhuma empresa encontrada</h3>
                    <p>Tente outros termos na busca ou cadastre uma nova empresa.</p>
                </div>
            `;
            return;
        }

        const html = this.filteredEmpresas.map(empresa => `
            <div class="empresa-item">
                <div class="empresa-info">
                    <h3>${empresa.nome}</h3>
                    <p><i class="fas fa-id-card"></i> ${formatCPFCNPJ(empresa.cnpj)}</p>
                    ${empresa.telefone ? `<p><i class="fas fa-phone"></i> ${formatPhone(empresa.telefone)}</p>` : ''}
                    ${empresa.email ? `<p><i class="fas fa-envelope"></i> ${empresa.email}</p>` : ''}
                    ${empresa.cidade && empresa.estado ? `<p><i class="fas fa-map-marker-alt"></i> ${empresa.cidade}/${empresa.estado}</p>` : ''}
                </div>
                <div class="empresa-actions">
                    <button class="btn-icon" onclick="window.empresasManager.editEmpresa('${empresa.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="window.empresasManager.confirmDelete('${empresa.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        this.empresasList.innerHTML = html;
    }

    copyEstadosToEditForm() {
        const estados = document.getElementById('estado');
        const editEstados = document.getElementById('editEstado');
        editEstados.innerHTML = estados.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Inicialização
window.empresasManager = new EmpresasManager(); 