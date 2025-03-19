import { getFirestore, collection, query, where, orderBy, limit, startAfter, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage, ref, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { formatCurrency, formatDate, formatCPFCNPJ, formatPhone, getStatusClass } from './utils.js';
import { auth, db } from './firebase-config.js';

class ListarChequesManager {
    constructor() {
        this.db = getFirestore();
        this.auth = getAuth();
        this.storage = getStorage();
        this.userId = null;
        
        // Pagination
        this.pageSize = 10;
        this.lastDoc = null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.hasNextPage = false;
        
        // Sort and Filter
        this.currentSort = {
            field: 'dataVencimento',
            direction: 'asc'
        };
        this.activeFilters = {};
        
        // Selected Items
        this.selectedItems = new Set();
        
        // UI Elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.chequesTableBody = document.getElementById('chequesTableBody');
        this.pageInfo = document.getElementById('pageInfo');
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.selectAllCheckbox = document.getElementById('selectAll');
        this.bulkActionsSelect = document.getElementById('bulkActions');
        this.applyBulkActionBtn = document.getElementById('applyBulkAction');
        this.searchInput = document.getElementById('searchInput');
        this.searchButton = document.getElementById('searchButton');
        this.filterButton = document.getElementById('filterButton');
        this.exportButton = document.getElementById('exportButton');
        this.sortField = document.getElementById('sortField');
        this.sortOrder = document.getElementById('sortOrder');
        
        // Modals
        this.filterModal = document.getElementById('filterModal');
        this.exportModal = document.getElementById('exportModal');
        
        this.init();
    }

    async init() {
        this.showLoading();
        try {
            await this.checkAuth();
            await this.loadEmpresas();
            this.setupEventListeners();
            await this.loadCheques();
            await this.updateSummary();
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
                    this.userId = user.uid;
                    resolve(user);
                } else {
                    window.location.href = 'login.html';
                    reject('Usuário não autenticado');
                }
            });
        });
    }

    async loadEmpresas() {
        const empresasRef = collection(this.db, 'empresas');
        const empresasSnap = await getDocs(empresasRef);
        const filterEmpresa = document.getElementById('filterEmpresa');
        
        empresasSnap.forEach(doc => {
            const empresa = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = empresa.nome;
            filterEmpresa.appendChild(option);
        });
    }

    setupEventListeners() {
        // Pagination
        this.prevPageBtn.addEventListener('click', () => this.previousPage());
        this.nextPageBtn.addEventListener('click', () => this.nextPage());
        
        // Selection
        this.selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
        
        // Bulk Actions
        this.bulkActionsSelect.addEventListener('change', () => this.handleBulkActionChange());
        this.applyBulkActionBtn.addEventListener('click', () => this.applyBulkAction());
        
        // Search
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        this.searchButton.addEventListener('click', () => this.handleSearch());
        
        // Sort
        this.sortField.addEventListener('change', () => this.handleSort());
        this.sortOrder.addEventListener('click', () => this.toggleSortDirection());
        
        // Filter Modal
        this.filterButton.addEventListener('click', () => this.showFilterModal());
        document.getElementById('filterForm').addEventListener('submit', (e) => this.handleFilter(e));
        document.getElementById('limparFiltros').addEventListener('click', () => this.clearFilters());
        
        // Export Modal
        this.exportButton.addEventListener('click', () => this.showExportModal());
        document.getElementById('exportForm').addEventListener('submit', (e) => this.handleExport(e));
        
        // Close Modals
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => this.hideModals());
        });
        
        // Currency Input Formatting
        document.querySelectorAll('.currency-input').forEach(input => {
            input.addEventListener('input', (e) => this.formatCurrencyInput(e));
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }

    async loadCheques() {
        this.showLoading();
        try {
            // Build query
            let q = query(
                collection(this.db, 'cheques'),
                where('userId', '==', this.userId)
            );
            
            // Apply filters
            if (Object.keys(this.activeFilters).length > 0) {
                q = this.applyFilters(q);
            }
            
            // Apply sort
            q = query(q, orderBy(this.currentSort.field, this.currentSort.direction));
            
            // Apply pagination
            q = query(q, limit(this.pageSize));
            if (this.lastDoc && this.currentPage > 1) {
                q = query(q, startAfter(this.lastDoc));
            }
            
            const snapshot = await getDocs(q);
            this.updateTable(snapshot);
            
        } catch (error) {
            console.error('Erro ao carregar cheques:', error);
            alert('Erro ao carregar a lista de cheques');
        } finally {
            this.hideLoading();
        }
    }

    updateTable(snapshot) {
        this.chequesTableBody.innerHTML = '';
        
        if (snapshot.empty) {
            this.showEmptyState();
            return;
        }
        
        snapshot.forEach(doc => {
            const cheque = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td class="checkbox-cell">
                    <input type="checkbox" class="check-item" data-id="${doc.id}">
                </td>
                <td>${cheque.numero}</td>
                <td>${cheque.empresa}</td>
                <td>${this.formatCurrency(cheque.valor)}</td>
                <td>${this.formatDate(cheque.dataVencimento.toDate())}</td>
                <td>
                    <span class="status-badge ${cheque.status}">
                        ${this.capitalizeFirst(cheque.status)}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="window.location.href='visualizar-cheque.html?id=${doc.id}'">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="window.location.href='editar-cheque.html?id=${doc.id}'">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-btn" data-id="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            // Add event listeners for checkbox and delete button
            const checkbox = row.querySelector('.check-item');
            checkbox.addEventListener('change', () => this.handleItemSelect(doc.id));
            
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.handleDelete(doc.id));
            
            this.chequesTableBody.appendChild(row);
        });
        
        // Update pagination
        this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        this.hasNextPage = snapshot.docs.length === this.pageSize;
        this.updatePaginationControls();
        
        // Reset select all
        this.selectAllCheckbox.checked = false;
        this.selectedItems.clear();
        this.updateBulkActionButton();
    }

    showEmptyState() {
        this.chequesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhum cheque encontrado</h3>
                    <p>Adicione um novo cheque ou ajuste os filtros de busca</p>
                    <a href="novo-cheque.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        Novo Cheque
                    </a>
                </td>
            </tr>
        `;
    }

    updatePaginationControls() {
        this.pageInfo.textContent = `Página ${this.currentPage}`;
        this.prevPageBtn.disabled = this.currentPage === 1;
        this.nextPageBtn.disabled = !this.hasNextPage;
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.lastDoc = null; // Reset to force reload from start
            await this.loadCheques();
        }
    }

    async nextPage() {
        if (this.hasNextPage) {
            this.currentPage++;
            await this.loadCheques();
        }
    }

    handleSelectAll() {
        const checkboxes = document.querySelectorAll('.check-item');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.selectAllCheckbox.checked;
            const id = checkbox.dataset.id;
            if (this.selectAllCheckbox.checked) {
                this.selectedItems.add(id);
            } else {
                this.selectedItems.delete(id);
            }
        });
        this.updateBulkActionButton();
    }

    handleItemSelect(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        this.updateBulkActionButton();
    }

    updateBulkActionButton() {
        this.applyBulkActionBtn.disabled = this.selectedItems.size === 0;
        this.bulkActionsSelect.disabled = this.selectedItems.size === 0;
    }

    handleBulkActionChange() {
        this.applyBulkActionBtn.disabled = !this.bulkActionsSelect.value || this.selectedItems.size === 0;
    }

    async applyBulkAction() {
        const action = this.bulkActionsSelect.value;
        if (!action || this.selectedItems.size === 0) return;
        
        const confirmMessage = {
            'marcar-compensado': 'Marcar os cheques selecionados como compensados?',
            'marcar-devolvido': 'Marcar os cheques selecionados como devolvidos?',
            'excluir': 'Excluir os cheques selecionados? Esta ação não pode ser desfeita.'
        }[action];
        
        if (!confirm(confirmMessage)) return;
        
        try {
            this.showLoading();
            
            const updates = Array.from(this.selectedItems).map(id => {
                const docRef = doc(this.db, 'cheques', id);
                
                switch (action) {
                    case 'marcar-compensado':
                        return updateDoc(docRef, { status: 'compensado' });
                    case 'marcar-devolvido':
                        return updateDoc(docRef, { status: 'devolvido' });
                    case 'excluir':
                        return deleteDoc(docRef);
                }
            });
            
            await Promise.all(updates);
            
            // Reset and reload
            this.selectedItems.clear();
            this.bulkActionsSelect.value = '';
            this.updateBulkActionButton();
            await this.loadCheques();
            
        } catch (error) {
            console.error('Erro ao aplicar ação em massa:', error);
            alert('Erro ao aplicar ação em massa');
        } finally {
            this.hideLoading();
        }
    }

    async handleSearch() {
        const searchTerm = this.searchInput.value.trim().toLowerCase();
        if (!searchTerm) return;
        
        this.activeFilters.search = searchTerm;
        this.currentPage = 1;
        this.lastDoc = null;
        await this.loadCheques();
    }

    async handleSort() {
        this.currentSort.field = this.sortField.value;
        this.currentPage = 1;
        this.lastDoc = null;
        await this.loadCheques();
    }

    async toggleSortDirection() {
        this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        this.sortOrder.innerHTML = `<i class="fas fa-sort-amount-${this.currentSort.direction === 'asc' ? 'down' : 'up'}"></i>`;
        this.currentPage = 1;
        this.lastDoc = null;
        await this.loadCheques();
    }

    showFilterModal() {
        this.filterModal.classList.add('visible');
    }

    showExportModal() {
        this.exportModal.classList.add('visible');
    }

    hideModals() {
        this.filterModal.classList.remove('visible');
        this.exportModal.classList.remove('visible');
    }

    async handleFilter(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const filters = {
            status: formData.getAll('status'),
            categoria: formData.getAll('categoria'),
            dataInicio: formData.get('dataInicio'),
            dataFim: formData.get('dataFim'),
            valorMinimo: formData.get('valorMinimo'),
            valorMaximo: formData.get('valorMaximo')
        };
        
        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (Array.isArray(filters[key]) && filters[key].length === 0) {
                delete filters[key];
            } else if (!filters[key]) {
                delete filters[key];
            }
        });
        
        this.activeFilters = filters;
        this.updateActiveFiltersDisplay();
        
        this.currentPage = 1;
        this.lastDoc = null;
        await this.loadCheques();
        
        this.hideModals();
    }

    updateActiveFiltersDisplay() {
        const container = document.getElementById('activeFilters');
        container.innerHTML = '';
        
        Object.entries(this.activeFilters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => this.addFilterTag(container, key, v));
            } else {
                this.addFilterTag(container, key, value);
            }
        });
    }

    addFilterTag(container, key, value) {
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        
        const label = {
            status: 'Status',
            categoria: 'Categoria',
            dataInicio: 'A partir de',
            dataFim: 'Até',
            valorMinimo: 'Valor mín',
            valorMaximo: 'Valor máx',
            search: 'Busca'
        }[key];
        
        let displayValue = value;
        if (key.startsWith('valor')) {
            displayValue = this.formatCurrency(parseFloat(value.replace(',', '.')));
        } else if (key.startsWith('data')) {
            displayValue = this.formatDate(new Date(value));
        }
        
        tag.innerHTML = `
            <span>${label}: ${displayValue}</span>
            <button class="btn-icon" data-key="${key}" data-value="${value}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        tag.querySelector('button').addEventListener('click', () => this.removeFilter(key, value));
        container.appendChild(tag);
    }

    async removeFilter(key, value) {
        if (Array.isArray(this.activeFilters[key])) {
            this.activeFilters[key] = this.activeFilters[key].filter(v => v !== value);
            if (this.activeFilters[key].length === 0) {
                delete this.activeFilters[key];
            }
        } else {
            delete this.activeFilters[key];
        }
        
        this.updateActiveFiltersDisplay();
        this.currentPage = 1;
        this.lastDoc = null;
        await this.loadCheques();
    }

    async clearFilters() {
        this.activeFilters = {};
        document.getElementById('filterForm').reset();
        this.updateActiveFiltersDisplay();
        this.currentPage = 1;
        this.lastDoc = null;
        await this.loadCheques();
    }

    applyFilters(baseQuery) {
        let q = baseQuery;
        
        if (this.activeFilters.status) {
            q = query(q, where('status', 'in', this.activeFilters.status));
        }
        
        if (this.activeFilters.categoria) {
            q = query(q, where('categoria', 'in', this.activeFilters.categoria));
        }
        
        if (this.activeFilters.dataInicio) {
            const dataInicio = new Date(this.activeFilters.dataInicio);
            dataInicio.setHours(0, 0, 0, 0);
            q = query(q, where('dataVencimento', '>=', dataInicio));
        }
        
        if (this.activeFilters.dataFim) {
            const dataFim = new Date(this.activeFilters.dataFim);
            dataFim.setHours(23, 59, 59, 999);
            q = query(q, where('dataVencimento', '<=', dataFim));
        }
        
        if (this.activeFilters.valorMinimo) {
            const valorMinimo = parseFloat(this.activeFilters.valorMinimo.replace(',', '.'));
            q = query(q, where('valor', '>=', valorMinimo));
        }
        
        if (this.activeFilters.valorMaximo) {
            const valorMaximo = parseFloat(this.activeFilters.valorMaximo.replace(',', '.'));
            q = query(q, where('valor', '<=', valorMaximo));
        }
        
        return q;
    }

    async handleExport(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const formato = formData.get('formato');
        const campos = formData.getAll('campos');
        
        try {
            this.showLoading();
            
            // Get all cheques (no pagination)
            let q = query(
                collection(this.db, 'cheques'),
                where('userId', '==', this.userId)
            );
            
            if (Object.keys(this.activeFilters).length > 0) {
                q = this.applyFilters(q);
            }
            
            const snapshot = await getDocs(q);
            const cheques = snapshot.docs.map(doc => doc.data());
            
            switch (formato) {
                case 'excel':
                    this.exportToExcel(cheques, campos);
                    break;
                case 'csv':
                    this.exportToCSV(cheques, campos);
                    break;
                case 'pdf':
                    this.exportToPDF(cheques, campos);
                    break;
            }
            
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            alert('Erro ao exportar dados');
        } finally {
            this.hideLoading();
            this.hideModals();
        }
    }

    exportToExcel(cheques, campos) {
        // Implementation will depend on the Excel library chosen
        console.log('Exportar para Excel:', { cheques, campos });
    }

    exportToCSV(cheques, campos) {
        const headers = campos.map(campo => {
            return {
                numero: 'Número do Cheque',
                empresa: 'Empresa',
                valor: 'Valor',
                dataVencimento: 'Data de Vencimento',
                status: 'Status',
                categoria: 'Categoria',
                banco: 'Banco',
                observacoes: 'Observações'
            }[campo];
        });
        
        const rows = cheques.map(cheque => {
            return campos.map(campo => {
                let value = cheque[campo];
                if (campo === 'valor') {
                    value = this.formatCurrency(value);
                } else if (campo === 'dataVencimento') {
                    value = this.formatDate(value.toDate());
                }
                return value || '';
            });
        });
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cheques_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    exportToPDF(cheques, campos) {
        // Implementation will depend on the PDF library chosen
        console.log('Exportar para PDF:', { cheques, campos });
    }

    async handleDelete(id) {
        if (!confirm('Deseja realmente excluir este cheque? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        try {
            this.showLoading();
            
            await deleteDoc(doc(this.db, 'cheques', id));
            await this.loadCheques();
            
        } catch (error) {
            console.error('Erro ao excluir cheque:', error);
            alert('Erro ao excluir cheque');
        } finally {
            this.hideLoading();
        }
    }

    formatCurrencyInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = (parseInt(value) / 100).toFixed(2);
        e.target.value = value.replace('.', ',');
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('pt-BR').format(date);
    }

    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    async updateSummary() {
        const summaryQuery = query(collection(this.db, 'cheques'));
        const snapshot = await getDocs(summaryQuery);
        
        let total = 0;
        let valorTotal = 0;
        let pendentes = 0;
        let compensados = 0;

        snapshot.forEach(doc => {
            const cheque = doc.data();
            total++;
            valorTotal += cheque.valor;
            if (cheque.status === 'pendente') pendentes++;
            if (cheque.status === 'compensado') compensados++;
        });

        document.getElementById('totalCheques').textContent = total;
        document.getElementById('valorTotal').textContent = this.formatCurrency(valorTotal);
        document.getElementById('totalPendentes').textContent = pendentes;
        document.getElementById('totalCompensados').textContent = compensados;
    }
}

// Initialize the list manager
window.listarChequesManager = new ListarChequesManager(); 