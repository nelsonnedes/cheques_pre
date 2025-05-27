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
 * Sistema moderno usando CompanyManager class
 */

class CompanyManager {
    constructor() {
        this.companies = [];
        this.selectedCompanies = new Set();
        this.currentUser = null;
        this.unsubscribe = null;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando CompanyManager...');
        
        try {
            // Inicializar componente compartilhado
            if (window.SharedComponents) {
                window.sharedComponents = new window.SharedComponents();
                await window.sharedComponents.init();
                console.log('✅ Componente compartilhado inicializado');
            }
            
            await this.checkAuth();
            this.setupEventListeners();
            await this.loadCompanies();
            
            console.log('✅ CompanyManager inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar CompanyManager:', error);
            this.showToast('Erro ao inicializar sistema de empresas', 'error');
        }
    }

    checkAuth() {
        console.log('Verificando autenticação...');
        onAuthStateChanged(auth, (user) => {
            console.log('Estado de autenticação:', user ? 'Logado' : 'Não logado');
            if (user) {
                this.currentUser = user;
                console.log('Usuário logado:', user.email);
                this.updateUserDisplay(user);
                this.loadCompanies();
            } else {
                console.log('Usuário não logado, redirecionando...');
                this.cleanup();
                window.location.href = 'login.html';
            }
        });
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    updateUserDisplay(user) {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email?.split('@')[0] || 'Usuário';
        }
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && !logoutBtn.hasAttribute('data-listener-added')) {
            logoutBtn.setAttribute('data-listener-added', 'true');
            logoutBtn.addEventListener('click', async () => {
                try {
                    this.showLoading(true);
                    await auth.signOut();
                    this.cleanup();
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    this.showToast('Erro ao fazer logout', 'error');
                } finally {
                    this.showLoading(false);
                }
            });
        }
    }

    setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Botões Nova Empresa (múltiplos botões com mesmo data-action)
        document.querySelectorAll('[data-action="new-company"]').forEach(btn => {
            if (!btn.hasAttribute('data-listener-added')) {
                btn.setAttribute('data-listener-added', 'true');
                btn.addEventListener('click', () => {
                    console.log('Botão Nova Empresa clicado');
                    this.openCompanyModal();
                });
            }
        });

        // Botão Aplicar Seleção
        const applySelectionBtn = document.querySelector('[data-action="apply-selection"]');
        if (applySelectionBtn && !applySelectionBtn.hasAttribute('data-listener-added')) {
            applySelectionBtn.setAttribute('data-listener-added', 'true');
            applySelectionBtn.addEventListener('click', () => {
                console.log('Botão Aplicar Seleção clicado');
                this.applySelection();
            });
        }

        // Formulário de empresa
        const companyForm = document.getElementById('company-form');
        if (companyForm && !companyForm.hasAttribute('data-listener-added')) {
            companyForm.setAttribute('data-listener-added', 'true');
            companyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Formulário enviado');
                this.saveCompany();
            });
        }

        // Botão cancelar no modal
        const cancelBtn = document.querySelector('[data-action="cancel"]');
        if (cancelBtn && !cancelBtn.hasAttribute('data-listener-added')) {
            cancelBtn.setAttribute('data-listener-added', 'true');
            cancelBtn.addEventListener('click', () => {
                console.log('Botão Cancelar clicado');
                this.closeCompanyModal();
            });
        }

        // Fechar modal clicando fora
        const modal = document.getElementById('company-modal');
        if (modal && !modal.hasAttribute('data-listener-added')) {
            modal.setAttribute('data-listener-added', 'true');
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeCompanyModal();
                }
            });
        }

        // Botão X do modal
        const closeModalBtn = document.getElementById('close-modal');
        if (closeModalBtn && !closeModalBtn.hasAttribute('data-listener-added')) {
            closeModalBtn.setAttribute('data-listener-added', 'true');
            closeModalBtn.addEventListener('click', () => {
                console.log('Botão X clicado');
                this.closeCompanyModal();
            });
        }

        // Auto-formatação do CNPJ
        const cnpjInput = document.getElementById('company-cnpj');
        if (cnpjInput && !cnpjInput.hasAttribute('data-listener-added')) {
            cnpjInput.setAttribute('data-listener-added', 'true');
            cnpjInput.addEventListener('input', (e) => {
                this.formatCNPJ(e.target);
            });
        }

        // Menu profile
        this.setupProfileMenu();

        // Menu mobile
        this.setupMobileMenu();

        console.log('Event listeners configurados');
    }

    setupProfileMenu() {
        console.log('🔧 Configurando menu do perfil...');
        const profileBtn = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        
        console.log('📍 Elementos encontrados:', {
            profileBtn: !!profileBtn,
            profileDropdown: !!profileDropdown,
            profileBtnElement: profileBtn,
            profileDropdownElement: profileDropdown
        });
        
        if (profileBtn && profileDropdown && !profileBtn.hasAttribute('data-listener-added')) {
            profileBtn.setAttribute('data-listener-added', 'true');
            
            console.log('✅ Adicionando event listener no botão do perfil');
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🖱️ Botão do perfil clicado!');
                console.log('📋 Estado atual do dropdown:', {
                    hasHiddenClass: profileDropdown.classList.contains('hidden'),
                    display: window.getComputedStyle(profileDropdown).display,
                    visibility: window.getComputedStyle(profileDropdown).visibility,
                    zIndex: window.getComputedStyle(profileDropdown).zIndex
                });
                
                profileDropdown.classList.toggle('hidden');
                
                console.log('📋 Estado após toggle:', {
                    hasHiddenClass: profileDropdown.classList.contains('hidden'),
                    display: window.getComputedStyle(profileDropdown).display,
                    visibility: window.getComputedStyle(profileDropdown).visibility
                });
            });
            
            console.log('✅ Adicionando event listener no documento para fechar dropdown');
            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                    console.log('🖱️ Clicou fora do menu, fechando dropdown');
                    profileDropdown.classList.add('hidden');
                }
            });
            
            console.log('🎯 Menu do perfil configurado com sucesso!');
        } else {
            console.error('❌ Erro na configuração do menu do perfil:', {
                profileBtn: !!profileBtn,
                profileDropdown: !!profileDropdown,
                alreadyConfigured: profileBtn?.hasAttribute('data-listener-added')
            });
        }
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        
        if (mobileMenuBtn && sidebar && !mobileMenuBtn.hasAttribute('data-listener-added')) {
            mobileMenuBtn.setAttribute('data-listener-added', 'true');
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
    }

    async loadCompanies() {
        try {
            this.showLoading(true);
            
            const user = auth.currentUser;
            if (!user) {
                console.error('Usuário não autenticado');
                return;
            }

            const q = query(
                collection(db, 'empresas'),
                where('createdBy', '==', user.uid),
                orderBy('nome')
            );

            const querySnapshot = await getDocs(q);
            this.companies = [];
            
            querySnapshot.forEach((doc) => {
                this.companies.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('Empresas carregadas:', this.companies);
            
            // Carregar seleção existente
            this.loadExistingSelection();
            
            this.renderCompanies();
            this.updateSelectionInfo();

        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            this.showToast('Erro ao carregar empresas', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    loadExistingSelection() {
        try {
            // Primeiro tentar carregar do componente compartilhado
            if (window.sharedComponents && typeof window.sharedComponents.getSelectedCompanies === 'function') {
                const selectedFromShared = window.sharedComponents.getSelectedCompanies();
                if (selectedFromShared && selectedFromShared.length > 0) {
                    console.log('Carregando seleção do componente compartilhado:', selectedFromShared);
                    selectedFromShared.forEach(company => {
                        this.selectedCompanies.add(company.id);
                    });
                    return;
                }
            }

            // Fallback: carregar do localStorage
            const savedSelection = localStorage.getItem('selectedCompanies');
            if (savedSelection) {
                const selectedCompaniesData = JSON.parse(savedSelection);
                console.log('Carregando seleção do localStorage:', selectedCompaniesData);
                
                if (Array.isArray(selectedCompaniesData)) {
                    selectedCompaniesData.forEach(company => {
                        if (company && company.id) {
                            this.selectedCompanies.add(company.id);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar seleção existente:', error);
        }
    }

    renderCompanies() {
        console.log('Renderizando empresas:', this.companies.length);
        const container = document.getElementById('companies-grid');
        const emptyState = document.getElementById('empty-state');

        if (!container) {
            console.error('Container companies-grid não encontrado');
            return;
        }

        if (this.companies.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
    return;
  }

        container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        // Usar DocumentFragment para melhor performance
        const fragment = document.createDocumentFragment();
        
        this.companies.forEach(company => {
            const cardDiv = document.createElement('div');
            cardDiv.innerHTML = this.createCompanyCard(company);
            fragment.appendChild(cardDiv.firstElementChild);
        });

        container.innerHTML = '';
        container.appendChild(fragment);

        // Adicionar event listeners após renderizar
        this.attachCompanyEventListeners();
    }

    attachCompanyEventListeners() {
        this.companies.forEach(company => {
            const card = document.getElementById(`company-${company.id}`);
            const checkbox = document.getElementById(`checkbox-${company.id}`);
            
            if (card && checkbox) {
                // Click no card
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

    createCompanyCard(company) {
        const isSelected = this.selectedCompanies.has(company.id);
        const taxRate = parseFloat(company.taxaJuros || 0).toFixed(2);
        const description = company.descricao || 'Sem descrição';
        const cnpjFormatted = this.formatCNPJDisplay(company.cnpj);

        return `
            <div class="company-card ${isSelected ? 'selected' : ''}" id="company-${company.id}">
                <div class="company-header">
                    <div class="company-info">
                        <div class="company-name" title="${company.nome}">${company.nome}</div>
                        <div class="company-cnpj" title="${cnpjFormatted}">${cnpjFormatted}</div>
                        <div class="company-tax-rate">${taxRate}% a.m.</div>
                    </div>
                    <div class="company-checkbox">
                        <input type="checkbox" id="checkbox-${company.id}" ${isSelected ? 'checked' : ''}>
                        <label for="checkbox-${company.id}" class="checkbox-custom"></label>
                    </div>
                </div>
                
                <div class="company-description" title="${description}">${description}</div>
                
                <div class="company-stats">
                    <div class="stat-mini">
                        <span class="stat-mini-value">0</span>
                        <span class="stat-mini-label">Cheques</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">R$ 0,00</span>
                        <span class="stat-mini-label">Total</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">0</span>
                        <span class="stat-mini-label">Pendentes</span>
                    </div>
                </div>
                
                <div class="company-actions">
                    <button class="btn-company-action edit edit-company" title="Editar empresa">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn-company-action delete delete-company" title="Excluir empresa">
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
            const count = this.selectedCompanies.size;
            selectedCounter.textContent = `${count} empresa${count !== 1 ? 's' : ''} selecionada${count !== 1 ? 's' : ''}`;
        }
    }

    applySelection() {
        console.log('Aplicando seleção de empresas...');
        
        if (this.selectedCompanies.size === 0) {
            this.showToast('Selecione pelo menos uma empresa para continuar', 'warning');
            return;
        }

        // Obter dados completos das empresas selecionadas
        const selectedCompaniesData = this.companies.filter(company => 
            this.selectedCompanies.has(company.id)
        );

        console.log('Empresas selecionadas para aplicar:', selectedCompaniesData);

        // Integrar com componente compartilhado se disponível
        if (window.sharedComponents && typeof window.sharedComponents.setSelectedCompanies === 'function') {
            try {
                // Atualizar no sistema compartilhado
                window.sharedComponents.setSelectedCompanies(selectedCompaniesData);
                
                const message = selectedCompaniesData.length === 1 
                    ? `Empresa "${selectedCompaniesData[0].nome}" selecionada com sucesso!`
                    : `${selectedCompaniesData.length} empresas selecionadas com sucesso!`;
                    
                this.showToast(message, 'success');
                
                console.log('🏢 Seleção aplicada via componente compartilhado');
                
                // Redirecionar para dashboard após aplicar seleção
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } catch (error) {
                console.error('Erro ao aplicar seleção via componente compartilhado:', error);
                this.fallbackApplySelection(selectedCompaniesData);
            }
        } else {
            console.warn('Componente compartilhado não disponível, usando fallback');
            this.fallbackApplySelection(selectedCompaniesData);
        }
    }

    fallbackApplySelection(selectedCompaniesData) {
        // Fallback: salvar no localStorage diretamente
        try {
            localStorage.setItem('selectedCompanies', JSON.stringify(selectedCompaniesData));
            
            const message = selectedCompaniesData.length === 1 
                ? `Empresa "${selectedCompaniesData[0].nome}" selecionada!`
                : `${selectedCompaniesData.length} empresas selecionadas!`;
                
            this.showToast(message, 'success');
            
            // Disparar evento customizado para atualizar outras partes do sistema
            window.dispatchEvent(new CustomEvent('companiesChanged', {
                detail: { companies: selectedCompaniesData }
            }));
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Erro no fallback de seleção:', error);
            this.showToast('Erro ao salvar seleção de empresas', 'error');
        }
    }

    openCompanyModal(company = null) {
        console.log('Abrindo modal de empresa:', company ? 'Editar' : 'Nova');
        const modal = document.getElementById('company-modal');
        const form = document.getElementById('company-form');
        const title = document.getElementById('modal-title');
        
        if (company) {
            if (title) title.textContent = 'Editar Empresa';
            this.fillFormFields(company);
  } else {
            if (title) title.textContent = 'Nova Empresa';
            if (form) form.reset();
            const companyIdField = document.getElementById('company-id');
            if (companyIdField) companyIdField.value = '';
        }
        
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                const nameInput = document.getElementById('company-name');
                if (nameInput) nameInput.focus();
            }, 100);
        }
    }

    fillFormFields(company) {
        const fields = {
            'company-id': company.id,
            'company-name': company.nome,
            'company-cnpj': this.formatCNPJDisplay(company.cnpj),
            'company-tax-rate': company.taxaJuros || '',
            'company-description': company.descricao || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });
    }

    closeCompanyModal() {
        const modal = document.getElementById('company-modal');
        if (modal) {
            modal.style.display = 'none';
            const form = document.getElementById('company-form');
            if (form) form.reset();
        }
    }

    async saveCompany() {
        try {
            console.log('🔄 Iniciando salvamento de empresa...');
            console.log('👤 Usuário atual:', this.currentUser);
            
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }
            
            console.log('🔑 UID do usuário:', this.currentUser.uid);
            this.showLoading(true);
            
            const formData = new FormData(document.getElementById('company-form'));
            const companyId = document.getElementById('company-id')?.value || '';
            
            console.log('📝 Dados do formulário:', {
                nome: formData.get('nome'),
                cnpj: formData.get('cnpj'),
                taxaJuros: formData.get('taxaJuros'),
                descricao: formData.get('descricao')
            });

            const companyData = {
                nome: formData.get('nome')?.trim() || '',
                cnpj: this.cleanCNPJ(formData.get('cnpj') || ''),
                taxaJuros: parseFloat(formData.get('taxaJuros')) || 0,
                descricao: formData.get('descricao')?.trim() || '',
                createdBy: this.currentUser.uid,
                ativo: true,
                updatedAt: new Date()
            };

            console.log('🏢 Dados da empresa processados:', companyData);

            // Validações básicas
            if (!companyData.nome) {
                throw new Error('Nome da empresa é obrigatório');
            }
            
            if (!companyData.cnpj) {
                throw new Error('CNPJ é obrigatório');
            }

            console.log('✅ Validação básica passou');

            if (companyId) {
                console.log('📝 Atualizando empresa existente...');
                const companyRef = doc(db, 'empresas', companyId);
                await updateDoc(companyRef, companyData);
                this.showToast('Empresa atualizada com sucesso!', 'success');
            } else {
                console.log('➕ Criando nova empresa...');
                companyData.criadoEm = new Date();
                companyData.createdAt = new Date();
                
                console.log('📤 Dados finais antes do envio:', JSON.stringify(companyData, null, 2));
                console.log('🔍 Verificação específica dos campos:');
                console.log('  - createdBy:', companyData.createdBy);
                console.log('  - nome:', companyData.nome);
                console.log('  - cnpj:', companyData.cnpj);
                console.log('  - ativo:', companyData.ativo);
                console.log('  - usuário logado UID:', this.currentUser.uid);
                console.log('  - Match createdBy === uid:', companyData.createdBy === this.currentUser.uid);
                
                // Criar o objeto final explicitamente para evitar qualquer problema
                const finalCompanyData = {
                    nome: companyData.nome,
                    cnpj: companyData.cnpj,
                    taxaJuros: companyData.taxaJuros,
                    descricao: companyData.descricao,
                    createdBy: this.currentUser.uid,
                    ativo: true,
                    criadoEm: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                console.log('🚀 Dados limpos para envio:', JSON.stringify(finalCompanyData, null, 2));
                console.log('🔗 Tentando conectar com Firestore...');
                
                const result = await addDoc(collection(db, 'empresas'), finalCompanyData);
                console.log('✅ Documento criado com ID:', result.id);
                this.showToast('Empresa criada com sucesso!', 'success');
            }

            console.log('✅ Salvamento concluído com sucesso');
            this.closeCompanyModal();
            await this.loadCompanies();

        } catch (error) {
            console.error('❌ Erro detalhado ao salvar empresa:', error);
            console.error('📋 Código do erro:', error.code);
            console.error('📋 Mensagem do erro:', error.message);
            console.error('📋 Stack trace:', error.stack);
            
            let errorMessage = 'Erro ao salvar empresa';
            
            if (error.code === 'permission-denied') {
                errorMessage = 'Erro de permissão. Verifique se você está logado corretamente.';
                console.error('🚫 Detalhes da permissão negada:', {
                    user: this.currentUser,
                    uid: this.currentUser?.uid,
                    email: this.currentUser?.email
                });
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showToast(errorMessage, 'error');
        } finally {
            console.log('🔄 Salvamento finalizado');
            this.showLoading(false);
        }
    }

    editCompany(company) {
        this.openCompanyModal(company);
    }

    async deleteCompany(companyId, companyName) {
        if (!confirm(`Tem certeza que deseja excluir a empresa "${companyName}"?\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            this.showLoading(true);
            
            await deleteDoc(doc(db, 'empresas', companyId));
            
            this.selectedCompanies.delete(companyId);
            this.updateSelectionInfo();
            
            this.showToast('Empresa excluída com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            this.showToast('Erro ao excluir empresa', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Método para formatar CNPJ automaticamente
    formatCNPJ(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length <= 14) {
            // CNPJ: 00.000.000/0000-00
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        
        input.value = value;
    }

    formatCNPJDisplay(cnpj) {
        if (!cnpj) return '';
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    cleanCNPJ(cnpj) {
        return cnpj.replace(/\D/g, '');
    }

    validateCNPJ(cnpj) {
        const cleaned = cnpj.replace(/\D/g, '');
        return cleaned.length === 14 && /^\d{14}$/.test(cleaned);
    }

    showLoading(show) {
        const loading = document.getElementById('loading-overlay');
        if (loading) {
            if (show) {
                loading.classList.remove('hidden');
                loading.style.display = 'flex';
            } else {
                loading.classList.add('hidden');
                loading.style.display = 'none';
            }
        }
    }

    showToast(message, type = 'info') {
        console.log(`Toast: ${message} (${type})`);
        
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${this.getToastColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}" style="margin-right: 8px;"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Animar entrada
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Remover após 4 segundos
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    getToastColor(type) {
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        return colors[type] || colors.info;
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }
}

// Inicializar apenas uma vez
let companyManagerInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!companyManagerInstance) {
        console.log('DOM carregado, inicializando CompanyManager...');
        companyManagerInstance = new CompanyManager();
        window.companyManager = companyManagerInstance;
    }
});

export default CompanyManager;