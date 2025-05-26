import { auth, db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

/**
 * Manipulação da página de empresas: listagem, cadastro, seleção de empresa ativa.
 * Agora integrando com Firebase Auth para associar `createdBy`.
 */

const empresaListElement = document.getElementById('empresa-list');
const formSection = document.getElementById('form-empresa-section');
const empresaForm = document.getElementById('empresa-form');
const btnAddEmpresa = document.getElementById('btn-add-empresa');
const btnCancel = document.getElementById('btn-cancel');
const formTitle = document.getElementById('form-empresa-title');

/**
 * Lista simulada empresas - substituir por fetch Firestore
 * @returns {Array} array de empresas
 */
function buscarEmpresasSimulado() {
  const dados = localStorage.getItem('empresas');
  if (!dados) return [];
  try {
    return JSON.parse(dados);
  } catch {
    return [];
  }
}

/**
 * Salvar empresas localStorage simulado
 * @param {Array} empresas
 */
function salvarEmpresasSimulado(empresas) {
  localStorage.setItem('empresas', JSON.stringify(empresas));
}

/**
 * Renderiza a tabela de empresas
 * @param {Array} empresas
 */
function renderizarEmpresas(empresas) {
  empresaListElement.innerHTML = '';

  if (empresas.length === 0) {
    empresaListElement.innerHTML = '<tr><td colspan="4">Nenhuma empresa cadastrada.</td></tr>';
    return;
  }

  empresas.forEach((empresa, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${empresa.nome}</td>
      <td>${empresa.cnpj}</td>
      <td>${parseFloat(empresa.taxaJuros).toFixed(2)}%</td>
      <td>
        <button data-index="${index}" class="btn btn-select">Selecionar</button>
        <button data-index="${index}" class="btn btn-edit">Editar</button>
        <button data-index="${index}" class="btn btn-delete">Excluir</button>
      </td>
    `;
    empresaListElement.appendChild(tr);
  });
}

/**
 * Validação simples do formulário de empresa
 * @param {Object} dados
 * @returns {string|null} mensagem de erro ou null
 */
function validarDadosEmpresa(dados) {
  if (!dados.nome.trim()) return 'Nome é obrigatório.';
  if (!dados.cnpj.trim()) return 'CNPJ é obrigatório.';
  if (dados.cnpj.replace(/\D/g, '').length !== 14) return 'CNPJ inválido.';
  if (isNaN(dados.taxaJuros) || dados.taxaJuros < 0) return 'Taxa de juros inválida.';
  return null;
}

/**
 * Manipula envio do form empresa - adicionar ou editar
 * @param {Event} e
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!auth.currentUser) {
    alert('Usuário não autenticado, faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  const formData = new FormData(empresaForm);
  const nome = formData.get('nome').trim();
  const cnpj = formData.get('cnpj').trim();
  const taxaJuros = parseFloat(formData.get('taxa-juros').replace(',', '.')) || 0;

  const novoDado = { nome, cnpj, taxaJuros, createdBy: auth.currentUser.uid };

  const erro = validarDadosEmpresa(novoDado);
  if (erro) {
    alert(erro);
    return;
  }

  let empresas = buscarEmpresasSimulado();

  if (empresaForm.dataset.editIndex !== undefined) {
    const idx = parseInt(empresaForm.dataset.editIndex, 10);
    empresas[idx] = novoDado;
    delete empresaForm.dataset.editIndex;
  } else {
    empresas.push(novoDado);
  }

  salvarEmpresasSimulado(empresas);
  renderizarEmpresas(empresas);
  esconderFormulario();
}

function mostrarFormulario(empresa = null, index = null) {
  formSection.classList.remove('hidden');
  if (empresa) {
    formTitle.textContent = 'Editar Empresa';
    empresaForm.nome.value = empresa.nome;
    empresaForm.cnpj.value = empresa.cnpj;
    empresaForm['taxa-juros'].value = empresa.taxaJuros;
    empresaForm.dataset.editIndex = index;
  } else {
    formTitle.textContent = 'Nova Empresa';
    empresaForm.reset();
    delete empresaForm.dataset.editIndex;
  }
  btnAddEmpresa.disabled = true;
}

function esconderFormulario() {
  formSection.classList.add('hidden');
  btnAddEmpresa.disabled = false;
  empresaForm.reset();
  delete empresaForm.dataset.editIndex;
}

function handleEdit(e) {
  if (!e.target.classList.contains('btn-edit')) return;
  const idx = parseInt(e.target.dataset.index, 10);
  const empresas = buscarEmpresasSimulado();
  mostrarFormulario(empresas[idx], idx);
}

function handleDelete(e) {
  if (!e.target.classList.contains('btn-delete')) return;
  const idx = parseInt(e.target.dataset.index, 10);
  let empresas = buscarEmpresasSimulado();
  if (confirm(`Confirma a exclusão da empresa ${empresas[idx].nome}?`)) {
    empresas.splice(idx, 1);
    salvarEmpresasSimulado(empresas);
    renderizarEmpresas(empresas);

    const empresaAtiva = localStorage.getItem('empresaAtiva');
    if (empresaAtiva) {
      const ativa = JSON.parse(empresaAtiva);
      if (ativa.cnpj === empresas[idx]?.cnpj) {
        localStorage.removeItem('empresaAtiva');
      }
    }
  }
}

function handleSelect(e) {
  if (!e.target.classList.contains('btn-select')) return;
  const idx = parseInt(e.target.dataset.index, 10);
  const empresas = buscarEmpresasSimulado();
  const empresaSelecionada = empresas[idx];
  if (empresaSelecionada) {
    localStorage.setItem('empresaAtiva', JSON.stringify(empresaSelecionada));
    alert(`Empresa "${empresaSelecionada.nome}" selecionada.`);
  }
}

function initEmpresas() {
  btnAddEmpresa.addEventListener('click', () => mostrarFormulario());
  btnCancel.addEventListener('click', esconderFormulario);
  empresaForm.addEventListener('submit', handleFormSubmit);
  empresaListElement.addEventListener('click', e => {
    handleEdit(e);
    handleDelete(e);
    handleSelect(e);
  });
  const empresas = buscarEmpresasSimulado();
  renderizarEmpresas(empresas);
}

window.addEventListener('DOMContentLoaded', initEmpresas);

class CompanyManager {
    constructor() {
        this.companies = [];
        this.selectedCompanies = new Set();
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('Inicializando CompanyManager...');
        this.setupEventListeners();
        this.checkAuth();
    }

    checkAuth() {
        console.log('Verificando autenticação...');
        onAuthStateChanged(auth, (user) => {
            console.log('Estado de autenticação:', user ? 'Logado' : 'Não logado');
            if (user) {
                this.currentUser = user;
                console.log('Usuário logado:', user.email);
                this.loadCompanies();
            } else {
                console.log('Usuário não logado, redirecionando...');
                window.location.href = 'login.html';
            }
        });
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Botão Nova Empresa
        const newCompanyBtn = document.querySelector('[data-action="new-company"]');
        if (newCompanyBtn) {
            newCompanyBtn.addEventListener('click', () => {
                console.log('Botão Nova Empresa clicado');
                this.openCompanyModal();
            });
        }

        // Botão Aplicar Seleção
        const applySelectionBtn = document.querySelector('[data-action="apply-selection"]');
        if (applySelectionBtn) {
            applySelectionBtn.addEventListener('click', () => {
                console.log('Botão Aplicar Seleção clicado');
                this.applySelection();
            });
        }

        // Formulário de empresa
        const companyForm = document.getElementById('company-form');
        if (companyForm) {
            companyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Formulário enviado');
                this.saveCompany();
            });
        }

        // Botão cancelar no modal
        const cancelBtn = document.querySelector('[data-action="cancel"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('Botão Cancelar clicado');
                this.closeCompanyModal();
            });
        }

        // Fechar modal clicando fora
        const modal = document.getElementById('company-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeCompanyModal();
                }
            });
        }

        // Auto-formatação do CNPJ
        const cnpjInput = document.getElementById('company-cnpj');
        if (cnpjInput) {
            cnpjInput.addEventListener('input', (e) => {
                this.formatCNPJ(e.target);
            });
        }

        console.log('Event listeners configurados');
    }

    async loadCompanies() {
        try {
            console.log('Carregando empresas...');
            this.showLoading(true);
            
            const companiesRef = collection(db, 'empresas');
            const q = query(
                companiesRef, 
                where('userId', '==', this.currentUser.uid),
                orderBy('nome')
            );

            // Listener em tempo real
            onSnapshot(q, (snapshot) => {
                console.log('Empresas recebidas do Firestore:', snapshot.size);
                this.companies = [];
                snapshot.forEach((doc) => {
                    this.companies.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.renderCompanies();
                this.updateSelectionInfo();
            });

        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            this.showToast('Erro ao carregar empresas: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderCompanies() {
        console.log('Renderizando empresas:', this.companies.length);
        const container = document.getElementById('companies-grid');
        const emptyState = document.getElementById('empty-state');

        if (this.companies.length === 0) {
            if (container) container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (container) container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        if (container) {
            container.innerHTML = this.companies.map(company => this.createCompanyCard(company)).join('');

            // Adicionar event listeners aos cards
            this.companies.forEach(company => {
                const card = document.getElementById(`company-${company.id}`);
                const checkbox = document.getElementById(`checkbox-${company.id}`);
                
                if (card && checkbox) {
                    // Click no card seleciona/deseleciona
                    card.addEventListener('click', (e) => {
                        if (!e.target.closest('.company-actions') && !e.target.closest('.company-checkbox')) {
                            this.toggleCompanySelection(company.id);
                        }
                    });

                    // Checkbox
                    checkbox.addEventListener('change', () => {
                        this.toggleCompanySelection(company.id);
                    });

                    // Botões de ação
                    const editBtn = card.querySelector('.edit-company');
                    const deleteBtn = card.querySelector('.delete-company');

                    editBtn?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.editCompany(company);
                    });

                    deleteBtn?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteCompany(company.id, company.nome);
                    });
                }
            });
        }
    }

    createCompanyCard(company) {
        const isSelected = this.selectedCompanies.has(company.id);
        const taxRate = company.taxaJuros || 0;
        const description = company.descricao || 'Sem descrição';

        return `
            <div class="company-card ${isSelected ? 'selected' : ''}" id="company-${company.id}">
                <div class="company-header">
                    <div class="company-info">
                        <div class="company-name">${company.nome}</div>
                        <div class="company-cnpj">${this.formatCNPJDisplay(company.cnpj)}</div>
                        <div class="company-tax-rate">${taxRate}% a.m.</div>
                    </div>
                    <div class="company-checkbox">
                        <input type="checkbox" id="checkbox-${company.id}" ${isSelected ? 'checked' : ''}>
                        <label for="checkbox-${company.id}" class="checkbox-custom"></label>
                    </div>
                </div>
                
                <div class="company-description">${description}</div>
                
                <div class="company-stats">
                    <div class="stat-mini">
                        <span class="stat-mini-value">0</span>
                        <span class="stat-mini-label">Cheques</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">R$ 0</span>
                        <span class="stat-mini-label">Total</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">0</span>
                        <span class="stat-mini-label">Pendentes</span>
                    </div>
                </div>
                
                <div class="company-actions">
                    <button class="btn-company-action edit edit-company">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn-company-action delete delete-company">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </div>
        `;
    }

    toggleCompanySelection(companyId) {
        if (this.selectedCompanies.has(companyId)) {
            this.selectedCompanies.delete(companyId);
        } else {
            this.selectedCompanies.add(companyId);
        }
        
        this.updateCompanyCardSelection(companyId);
        this.updateSelectionInfo();
        this.updateSelectionSummary();
    }

    updateCompanyCardSelection(companyId) {
        const card = document.getElementById(`company-${companyId}`);
        const checkbox = document.getElementById(`checkbox-${companyId}`);
        
        if (this.selectedCompanies.has(companyId)) {
            card?.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            card?.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }
    }

    updateSelectionInfo() {
        const selectedCounter = document.getElementById('selected-counter');
        
        if (selectedCounter) {
            selectedCounter.textContent = `${this.selectedCompanies.size} empresas selecionadas`;
        }
    }

    updateSelectionSummary() {
        const summaryContainer = document.getElementById('selection-summary');
        if (!summaryContainer) return;

        if (this.selectedCompanies.size === 0) {
            summaryContainer.style.display = 'none';
            return;
        }

        summaryContainer.style.display = 'block';
        const selectedCompaniesList = document.getElementById('selected-companies-list');
        
        if (selectedCompaniesList) {
            const selectedCompaniesData = this.companies.filter(company => 
                this.selectedCompanies.has(company.id)
            );

            selectedCompaniesList.innerHTML = selectedCompaniesData.map(company => `
                <div class="selected-company-tag">
                    ${company.nome}
                    <button class="remove-tag" onclick="companyManager.removeFromSelection('${company.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    removeFromSelection(companyId) {
        this.selectedCompanies.delete(companyId);
        this.updateCompanyCardSelection(companyId);
        this.updateSelectionInfo();
        this.updateSelectionSummary();
    }

    applySelection() {
        if (this.selectedCompanies.size === 0) {
            this.showToast('Selecione pelo menos uma empresa', 'warning');
            return;
        }

        // Salvar seleção no localStorage
        const selectedCompaniesData = this.companies.filter(company => 
            this.selectedCompanies.has(company.id)
        );
        
        localStorage.setItem('selectedCompanies', JSON.stringify(selectedCompaniesData));
        
        this.showToast(`${this.selectedCompanies.size} empresa(s) selecionada(s)`, 'success');
        
        // Redirecionar para o dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }

    openCompanyModal(company = null) {
        console.log('Abrindo modal de empresa:', company ? 'Editar' : 'Nova');
        const modal = document.getElementById('company-modal');
        const form = document.getElementById('company-form');
        const title = document.getElementById('modal-title');
        
        if (company) {
            if (title) title.textContent = 'Editar Empresa';
            if (document.getElementById('company-id')) document.getElementById('company-id').value = company.id;
            if (document.getElementById('company-name')) document.getElementById('company-name').value = company.nome;
            if (document.getElementById('company-cnpj')) document.getElementById('company-cnpj').value = this.formatCNPJDisplay(company.cnpj);
            if (document.getElementById('company-tax-rate')) document.getElementById('company-tax-rate').value = company.taxaJuros || '';
            if (document.getElementById('company-description')) document.getElementById('company-description').value = company.descricao || '';
        } else {
            if (title) title.textContent = 'Nova Empresa';
            if (form) form.reset();
            if (document.getElementById('company-id')) document.getElementById('company-id').value = '';
        }
        
        if (modal) {
            modal.style.display = 'flex';
            const nameInput = document.getElementById('company-name');
            if (nameInput) nameInput.focus();
        }
    }

    closeCompanyModal() {
        const modal = document.getElementById('company-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async saveCompany() {
        try {
            this.showLoading(true);
            
            const formData = new FormData(document.getElementById('company-form'));
            const companyId = document.getElementById('company-id')?.value || '';
            
            const companyData = {
                nome: formData.get('nome')?.trim() || '',
                cnpj: this.cleanCNPJ(formData.get('cnpj') || ''),
                taxaJuros: parseFloat(formData.get('taxaJuros')) || 0,
                descricao: formData.get('descricao')?.trim() || '',
                userId: this.currentUser.uid,
                updatedAt: new Date()
            };

            // Validações
            if (!companyData.nome) {
                throw new Error('Nome da empresa é obrigatório');
            }

            if (!this.validateCNPJ(companyData.cnpj)) {
                throw new Error('CNPJ inválido');
            }

            if (companyId) {
                // Atualizar empresa existente
                const companyRef = doc(db, 'empresas', companyId);
                await updateDoc(companyRef, companyData);
                this.showToast('Empresa atualizada com sucesso!', 'success');
            } else {
                // Criar nova empresa
                companyData.createdAt = new Date();
                await addDoc(collection(db, 'empresas'), companyData);
                this.showToast('Empresa criada com sucesso!', 'success');
            }

            this.closeCompanyModal();

        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            this.showToast(error.message || 'Erro ao salvar empresa', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    editCompany(company) {
        this.openCompanyModal(company);
    }

    async deleteCompany(companyId, companyName) {
        if (!confirm(`Tem certeza que deseja excluir a empresa "${companyName}"?`)) {
            return;
        }

        try {
            this.showLoading(true);
            
            await deleteDoc(doc(db, 'empresas', companyId));
            
            // Remover da seleção se estiver selecionada
            this.selectedCompanies.delete(companyId);
            this.updateSelectionInfo();
            this.updateSelectionSummary();
            
            this.showToast('Empresa excluída com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            this.showToast('Erro ao excluir empresa', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Utilitários
    formatCNPJ(input) {
        let value = input.value.replace(/\D/g, '');
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
        input.value = value;
    }

    formatCNPJDisplay(cnpj) {
        if (!cnpj) return '';
        const cleaned = cnpj.replace(/\D/g, '');
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    cleanCNPJ(cnpj) {
        return cnpj.replace(/\D/g, '');
    }

    validateCNPJ(cnpj) {
        const cleaned = cnpj.replace(/\D/g, '');
        return cleaned.length === 14;
    }

    showLoading(show) {
        const loading = document.getElementById('loading-overlay');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    showToast(message, type = 'info') {
        console.log(`Toast: ${message} (${type})`);
        
        // Criar container se não existir
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            margin-bottom: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span style="margin-left: 8px;">${message}</span>
        `;

        container.appendChild(toast);

        // Remover após 3 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 3000);
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando CompanyManager...');
    window.companyManager = new CompanyManager();
});

export default CompanyManager;