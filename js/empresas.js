import { auth, db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, startAfter, getDocs, addDoc, updateDoc, deleteDoc, doc, endBefore, limitToLast } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { formatCPFCNPJ, formatPhone } from './utils.js';

class EmpresasManager {
    constructor() {
        this.currentUser = null;
        this.empresasRef = collection(db, 'empresas');
        this.lastVisible = null;
        this.pageSize = 10;
        this.currentFilters = {
            status: '',
            tipo: '',
            search: ''
        };

        // Elements
        this.tableBody = document.getElementById('empresasTableBody');
        this.emptyState = document.getElementById('emptyState');
        this.searchInput = document.getElementById('searchEmpresa');
        this.filterStatus = document.getElementById('filterStatus');
        this.filterTipo = document.getElementById('filterTipo');
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.pageInfo = document.getElementById('pageInfo');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        // Toast container
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);

        // Modals
        this.empresaModal = document.getElementById('empresaModal');
        this.confirmationModal = document.getElementById('confirmationModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.empresaForm = document.getElementById('empresaForm');
        this.confirmationMessage = document.getElementById('confirmationMessage');
        this.confirmActionBtn = document.getElementById('confirmAction');

        this.currentEmpresaId = null;
        this.isEditing = false;

        this.init();
    }

    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadEmpresas();
    }

    checkAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    setupEventListeners() {
        // Nova Empresa
        document.getElementById('btnNovaEmpresa').addEventListener('click', () => this.showModal());

        // Form Submit
        this.empresaForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Filtros e Busca
        this.searchInput.addEventListener('input', () => this.handleFiltersChange());
        this.filterStatus.addEventListener('change', () => this.handleFiltersChange());
        this.filterTipo.addEventListener('change', () => this.handleFiltersChange());

        // Paginação
        this.prevPageBtn.addEventListener('click', () => this.loadPreviousPage());
        this.nextPageBtn.addEventListener('click', () => this.loadNextPage());

        // Fechar Modais
        document.querySelectorAll('.close-modal, [data-dismiss="modal"]').forEach(button => {
            button.addEventListener('click', () => this.closeModals());
        });

        // Máscara CNPJ
        const cnpjInput = document.getElementById('cnpj');
        cnpjInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 14) {
                value = value.replace(/(\d{2})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });

        // Máscara Telefone
        const telefoneInput = document.getElementById('telefone');
        telefoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                if (value.length > 2) value = value.replace(/(\d{2})(\d)/, '($1) $2');
                if (value.length > 7) value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });
    }

    async loadEmpresas(isNextPage = false) {
        try {
            this.showLoading();
            
            let q = query(this.empresasRef, orderBy('nome'));

            // Aplicar filtros
            if (this.currentFilters.status) {
                const isAtivo = this.currentFilters.status === 'ativo';
                q = query(q, where('ativo', '==', isAtivo));
            }
            if (this.currentFilters.tipo) {
                q = query(q, where('tipo', '==', this.currentFilters.tipo));
            }

            // Paginação
            if (isNextPage && this.lastVisible) {
                q = query(q, startAfter(this.lastVisible));
            } else {
                this.lastVisible = null;
            }
            q = query(q, limit(this.pageSize));

            const snapshot = await getDocs(q);
            
            if (!isNextPage) {
                this.tableBody.innerHTML = '';
            }

            if (snapshot.empty && !isNextPage) {
                this.showEmptyState();
                return;
            }

            this.hideEmptyState();
            
            snapshot.forEach((doc) => {
                const empresa = { id: doc.id, ...doc.data() };
                this.addEmpresaToTable(empresa);
            });

            // Atualizar paginação
            this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
            this.updatePaginationButtons(snapshot);

        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            this.showError('Erro ao carregar empresas. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    addEmpresaToTable(empresa) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${empresa.nome}</td>
            <td>${empresa.cnpj}</td>
            <td>${this.formatTipo(empresa.tipo)}</td>
            <td>${empresa.taxaPadrao}%</td>
            <td>
                <span class="status-badge ${empresa.ativo ? 'active' : 'inactive'}">
                    ${empresa.ativo ? 'Ativa' : 'Inativa'}
                </span>
            </td>
            <td class="actions">
                <button class="btn-icon" onclick="empresasManager.editEmpresa('${empresa.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="empresasManager.toggleStatus('${empresa.id}', ${!empresa.ativo})" title="${empresa.ativo ? 'Desativar' : 'Ativar'}">
                    <i class="fas fa-${empresa.ativo ? 'toggle-on' : 'toggle-off'}"></i>
                </button>
                <button class="btn-icon delete" onclick="empresasManager.confirmDelete('${empresa.id}', '${empresa.nome}')" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        this.tableBody.appendChild(row);
    }

    formatTipo(tipo) {
        const tipos = {
            fomento: 'Fomento',
            factoring: 'Factoring',
            banco: 'Banco',
            outros: 'Outros'
        };
        return tipos[tipo] || tipo;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            this.showLoading();
            
            const empresaData = {
                nome: document.getElementById('nomeEmpresa').value,
                cnpj: document.getElementById('cnpj').value,
                tipo: document.getElementById('tipoEmpresa').value,
                taxaPadrao: parseFloat(document.getElementById('taxaPadrao').value),
                endereco: document.getElementById('endereco').value,
                telefone: document.getElementById('telefone').value,
                email: document.getElementById('email').value,
                observacoes: document.getElementById('observacoes').value,
                ativo: document.getElementById('statusAtivo').checked,
                updatedAt: new Date(),
                updatedBy: this.currentUser.uid
            };

            if (this.isEditing) {
                await updateDoc(doc(this.empresasRef, this.currentEmpresaId), empresaData);
            } else {
                empresaData.createdAt = new Date();
                empresaData.createdBy = this.currentUser.uid;
                await addDoc(this.empresasRef, empresaData);
            }

            this.closeModals();
            await this.loadEmpresas();
            this.showSuccess(`Empresa ${this.isEditing ? 'atualizada' : 'cadastrada'} com sucesso!`);

        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            this.showError('Erro ao salvar empresa. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async editEmpresa(empresaId) {
        try {
            this.showLoading();
            
            const docRef = doc(this.empresasRef, empresaId);
            const docSnap = await getDocs(docRef);
            
            if (docSnap.exists()) {
                const empresa = docSnap.data();
                
                // Preparar modal para edição
                this.isEditing = true;
                this.currentEmpresaId = empresaId;
                this.modalTitle.textContent = 'Editar Empresa';
                
                // Preencher formulário
                document.getElementById('nomeEmpresa').value = empresa.nome;
                document.getElementById('cnpj').value = empresa.cnpj;
                document.getElementById('tipoEmpresa').value = empresa.tipo;
                document.getElementById('taxaPadrao').value = empresa.taxaPadrao;
                document.getElementById('endereco').value = empresa.endereco || '';
                document.getElementById('telefone').value = empresa.telefone || '';
                document.getElementById('email').value = empresa.email || '';
                document.getElementById('observacoes').value = empresa.observacoes || '';
                document.getElementById('statusAtivo').checked = empresa.ativo;
                
                // Mostrar modal
                this.empresaModal.style.display = 'block';
            } else {
                this.showError('Empresa não encontrada.');
            }
        } catch (error) {
            console.error('Erro ao carregar empresa:', error);
            this.showError('Erro ao carregar dados da empresa. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async toggleStatus(empresaId, novoStatus) {
        try {
            this.showLoading();
            
            await updateDoc(doc(this.empresasRef, empresaId), {
                ativo: novoStatus,
                updatedAt: new Date(),
                updatedBy: this.currentUser.uid
            });

            await this.loadEmpresas();
            this.showSuccess(`Empresa ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`);

        } catch (error) {
            console.error('Erro ao alterar status:', error);
            this.showError('Erro ao alterar status da empresa. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    confirmDelete(empresaId, empresaNome) {
        this.confirmationMessage.textContent = `Tem certeza que deseja excluir a empresa "${empresaNome}"?`;
        this.confirmActionBtn.onclick = () => this.deleteEmpresa(empresaId);
        this.showConfirmationModal();
    }

    async deleteEmpresa(empresaId) {
        try {
            this.showLoading();
            this.closeModals();
            
            await deleteDoc(doc(this.empresasRef, empresaId));
            
            await this.loadEmpresas();
            this.showSuccess('Empresa excluída com sucesso!');

        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            this.showError('Erro ao excluir empresa. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    handleFiltersChange() {
        this.currentFilters = {
            status: this.filterStatus.value,
            tipo: this.filterTipo.value,
            search: this.searchInput.value.toLowerCase()
        };
        this.loadEmpresas();
    }

    async loadPreviousPage() {
        try {
            this.showLoading();
            
            // Armazenar documentos da página atual
            const currentDocs = Array.from(this.tableBody.children).map(row => {
                return {
                    id: row.querySelector('.btn-icon').getAttribute('onclick').split("'")[1],
                    nome: row.children[0].textContent
                };
            });

            // Consulta para obter documentos anteriores
            let q = query(this.empresasRef, orderBy('nome'));

            // Aplicar filtros
            if (this.currentFilters.status) {
                const isAtivo = this.currentFilters.status === 'ativo';
                q = query(q, where('ativo', '==', isAtivo));
            }
            if (this.currentFilters.tipo) {
                q = query(q, where('tipo', '==', this.currentFilters.tipo));
            }

            // Limitar a consulta ao primeiro documento da página atual
            if (currentDocs.length > 0) {
                const firstDoc = await getDoc(doc(this.empresasRef, currentDocs[0].id));
                q = query(q, endBefore(firstDoc), limitToLast(this.pageSize));
            }

            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                this.tableBody.innerHTML = '';
                snapshot.forEach(doc => {
                    const empresa = { id: doc.id, ...doc.data() };
                    this.addEmpresaToTable(empresa);
                });

                // Atualizar lastVisible para paginação
                this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
                this.updatePaginationButtons(snapshot);
            }

        } catch (error) {
            console.error('Erro ao carregar página anterior:', error);
            this.showError('Erro ao carregar página anterior. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async loadNextPage() {
        await this.loadEmpresas(true);
    }

    updatePaginationButtons(snapshot) {
        // Habilitar/desabilitar botão próxima página
        this.nextPageBtn.disabled = snapshot.docs.length < this.pageSize;

        // Habilitar/desabilitar botão página anterior
        const firstDoc = snapshot.docs[0];
        if (firstDoc) {
            const q = query(
                this.empresasRef,
                orderBy('nome'),
                endBefore(firstDoc),
                limitToLast(1)
            );
            
            getDocs(q).then(prevSnapshot => {
                this.prevPageBtn.disabled = prevSnapshot.empty;
            });
        } else {
            this.prevPageBtn.disabled = true;
        }

        // Atualizar informações da página
        const totalItems = this.tableBody.children.length;
        this.pageInfo.textContent = `Mostrando ${totalItems} ${totalItems === 1 ? 'empresa' : 'empresas'}`;
    }

    showModal() {
        if (!this.isEditing) {
            this.empresaForm.reset();
            this.modalTitle.textContent = 'Nova Empresa';
            document.getElementById('statusAtivo').checked = true;
        }
        this.empresaModal.style.display = 'block';
    }

    showConfirmationModal() {
        this.confirmationModal.style.display = 'block';
    }

    closeModals() {
        this.empresaModal.style.display = 'none';
        this.confirmationModal.style.display = 'none';
        this.isEditing = false;
        this.currentEmpresaId = null;
    }

    showEmptyState() {
        this.tableBody.innerHTML = '';
        this.emptyState.style.display = 'flex';
    }

    hideEmptyState() {
        this.emptyState.style.display = 'none';
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
}

// Inicializar e exportar instância
const empresasManager = new EmpresasManager();
window.empresasManager = empresasManager; // Para acesso global 