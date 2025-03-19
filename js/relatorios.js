import { auth, db } from './firebase-config.js';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { formatCurrency, formatDate } from './utils.js';
import { ExportManager } from './export-manager.js';
import { exportManager } from './export-manager.js';

class RelatoriosManager {
    constructor() {
        this.currentUser = null;
        this.chequesRef = collection(db, 'cheques');
        this.empresasRef = collection(db, 'empresas');
        
        // Elements
        this.tipoRelatorio = document.getElementById('tipoRelatorio');
        this.dataInicio = document.getElementById('dataInicio');
        this.dataFim = document.getElementById('dataFim');
        this.empresasSelect = document.getElementById('empresas');
        this.statusSelect = document.getElementById('status');
        this.btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
        this.btnLimparFiltros = document.getElementById('btnLimparFiltros');
        this.btnExportarExcel = document.getElementById('btnExportarExcel');
        this.btnExportarPDF = document.getElementById('btnExportarPDF');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.tableBody = document.getElementById('relatorioTableBody');
        this.searchInput = document.getElementById('searchTable');

        // Charts
        this.statusChart = null;
        this.empresasChart = null;
        this.evolucaoChart = null;
        this.tipoChart = null;

        // Data
        this.chequesData = [];
        this.empresasData = [];
        this.currentFilters = {
            tipo: 'geral',
            dataInicio: null,
            dataFim: null,
            empresas: [],
            status: []
        };

        this.exportManager = new ExportManager();

        this.initializeElements();
        this.setupEventListeners();
        this.loadData();
    }

    initializeElements() {
        // Elementos de filtro
        this.startDateInput = document.getElementById('startDate');
        this.endDateInput = document.getElementById('endDate');
        this.statusSelect = document.getElementById('statusFilter');
        this.empresaSelect = document.getElementById('empresaFilter');

        // Botões de exportação
        this.exportExcelBtn = document.getElementById('exportExcel');
        this.exportPdfBtn = document.getElementById('exportPdf');

        // Elementos de feedback
        this.loadingElement = document.getElementById('loading');
        this.messageElement = document.getElementById('message');
    }

    setupEventListeners() {
        // Filtros
        this.tipoRelatorio.addEventListener('change', () => this.handleFiltersChange());
        this.dataInicio.addEventListener('change', () => this.handleFiltersChange());
        this.dataFim.addEventListener('change', () => this.handleFiltersChange());
        this.empresasSelect.addEventListener('change', () => this.handleFiltersChange());
        this.statusSelect.addEventListener('change', () => this.handleFiltersChange());
        
        // Botões
        this.btnGerarRelatorio.addEventListener('click', () => this.gerarRelatorio());
        this.btnLimparFiltros.addEventListener('click', () => this.limparFiltros());
        this.btnExportarExcel.addEventListener('click', () => this.exportData('excel'));
        this.btnExportarPDF.addEventListener('click', () => this.exportData('pdf'));
        
        // Busca na tabela
        this.searchInput.addEventListener('input', () => this.filtrarTabela());

        // Eventos de filtro
        this.startDateInput.addEventListener('change', () => this.loadData());
        this.endDateInput.addEventListener('change', () => this.loadData());
        this.statusSelect.addEventListener('change', () => this.loadData());
        this.empresaSelect.addEventListener('change', () => this.loadData());
    }

    async loadEmpresas() {
        try {
            const snapshot = await getDocs(this.empresasRef);
            this.empresasData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Preencher select de empresas
            this.empresasSelect.innerHTML = this.empresasData
                .map(empresa => `<option value="${empresa.id}">${empresa.nome}</option>`)
                .join('');
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            this.showError('Erro ao carregar lista de empresas.');
        }
    }

    setupCharts() {
        // Configuração comum para todos os gráficos
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        };

        // Gráfico de Status
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        this.statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pendente', 'Compensado', 'Devolvido', 'Cancelado'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#ffc107',
                        '#28a745',
                        '#dc3545',
                        '#6c757d'
                    ]
                }]
            },
            options: commonOptions
        });

        // Gráfico de Empresas
        const empresasCtx = document.getElementById('empresasChart').getContext('2d');
        this.empresasChart = new Chart(empresasCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Valor Total',
                    data: [],
                    backgroundColor: '#4a90e2'
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                    }
                }
            }
        });

        // Gráfico de Evolução
        const evolucaoCtx = document.getElementById('evolucaoChart').getContext('2d');
        this.evolucaoChart = new Chart(evolucaoCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Valor Total',
                    data: [],
                    borderColor: '#4a90e2',
                    tension: 0.1
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                    }
                }
            }
        });

        // Gráfico de Tipos
        const tipoCtx = document.getElementById('tipoChart').getContext('2d');
        this.tipoChart = new Chart(tipoCtx, {
            type: 'pie',
            data: {
                labels: ['Fomento', 'Factoring', 'Banco', 'Outros'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#4a90e2',
                        '#28a745',
                        '#ffc107',
                        '#6c757d'
                    ]
                }]
            },
            options: commonOptions
        });
    }

    handleFiltersChange() {
        this.currentFilters = {
            tipo: this.tipoRelatorio.value,
            dataInicio: this.dataInicio.value ? new Date(this.dataInicio.value) : null,
            dataFim: this.dataFim.value ? new Date(this.dataFim.value) : null,
            empresas: Array.from(this.empresasSelect.selectedOptions).map(option => option.value),
            status: Array.from(this.statusSelect.selectedOptions).map(option => option.value)
        };
    }

    async gerarRelatorio() {
        try {
            this.showLoading(true);
            
            // Construir query base
            let q = query(this.chequesRef, orderBy('dataEmissao', 'desc'));

            // Aplicar filtros
            if (this.currentFilters.dataInicio) {
                q = query(q, where('dataEmissao', '>=', this.currentFilters.dataInicio));
            }
            if (this.currentFilters.dataFim) {
                q = query(q, where('dataEmissao', '<=', this.currentFilters.dataFim));
            }
            if (this.currentFilters.empresas.length > 0) {
                q = query(q, where('empresaId', 'in', this.currentFilters.empresas));
            }
            if (this.currentFilters.status.length > 0) {
                q = query(q, where('status', 'in', this.currentFilters.status));
            }

            const snapshot = await getDocs(q);
            this.chequesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Atualizar resumo
            this.atualizarResumo();
            
            // Atualizar gráficos
            this.atualizarGraficos();
            
            // Atualizar tabela
            this.atualizarTabela();

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            this.showError('Erro ao gerar relatório. Por favor, tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    atualizarResumo() {
        const totalCheques = this.chequesData.length;
        const valorTotal = this.chequesData.reduce((sum, cheque) => sum + cheque.valor, 0);
        const chequesPendentes = this.chequesData.filter(cheque => cheque.status === 'pendente').length;
        const valorPendente = this.chequesData
            .filter(cheque => cheque.status === 'pendente')
            .reduce((sum, cheque) => sum + cheque.valor, 0);

        document.getElementById('totalCheques').textContent = totalCheques;
        document.getElementById('valorTotal').textContent = `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('chequesPendentes').textContent = chequesPendentes;
        document.getElementById('valorPendente').textContent = `R$ ${valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    atualizarGraficos() {
        // Gráfico de Status
        const statusCounts = {
            pendente: this.chequesData.filter(c => c.status === 'pendente').length,
            compensado: this.chequesData.filter(c => c.status === 'compensado').length,
            devolvido: this.chequesData.filter(c => c.status === 'devolvido').length,
            cancelado: this.chequesData.filter(c => c.status === 'cancelado').length
        };

        this.statusChart.data.datasets[0].data = Object.values(statusCounts);
        this.statusChart.update();

        // Gráfico de Empresas
        const empresasData = {};
        this.chequesData.forEach(cheque => {
            const empresa = this.empresasData.find(e => e.id === cheque.empresaId);
            if (empresa) {
                if (!empresasData[empresa.nome]) {
                    empresasData[empresa.nome] = 0;
                }
                empresasData[empresa.nome] += cheque.valor;
            }
        });

        this.empresasChart.data.labels = Object.keys(empresasData);
        this.empresasChart.data.datasets[0].data = Object.values(empresasData);
        this.empresasChart.update();

        // Gráfico de Evolução
        const evolucaoData = {};
        this.chequesData.forEach(cheque => {
            const mes = new Date(cheque.dataEmissao).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
            if (!evolucaoData[mes]) {
                evolucaoData[mes] = 0;
            }
            evolucaoData[mes] += cheque.valor;
        });

        this.evolucaoChart.data.labels = Object.keys(evolucaoData);
        this.evolucaoChart.data.datasets[0].data = Object.values(evolucaoData);
        this.evolucaoChart.update();

        // Gráfico de Tipos
        const tipoCounts = {
            fomento: this.chequesData.filter(c => c.tipo === 'fomento').length,
            factoring: this.chequesData.filter(c => c.tipo === 'factoring').length,
            banco: this.chequesData.filter(c => c.tipo === 'banco').length,
            outros: this.chequesData.filter(c => c.tipo === 'outros').length
        };

        this.tipoChart.data.datasets[0].data = Object.values(tipoCounts);
        this.tipoChart.update();
    }

    atualizarTabela() {
        this.tableBody.innerHTML = this.chequesData.map(cheque => {
            const empresa = this.empresasData.find(e => e.id === cheque.empresaId);
            return `
                <tr>
                    <td>${new Date(cheque.dataEmissao).toLocaleDateString('pt-BR')}</td>
                    <td>${empresa ? empresa.nome : 'N/A'}</td>
                    <td>${cheque.numero}</td>
                    <td>R$ ${cheque.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>
                        <span class="status-badge ${cheque.status}">
                            ${this.formatStatus(cheque.status)}
                        </span>
                    </td>
                    <td>${new Date(cheque.dataVencimento).toLocaleDateString('pt-BR')}</td>
                </tr>
            `;
        }).join('');
    }

    formatStatus(status) {
        const statusMap = {
            pendente: 'Pendente',
            compensado: 'Compensado',
            devolvido: 'Devolvido',
            cancelado: 'Cancelado'
        };
        return statusMap[status] || status;
    }

    filtrarTabela() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const rows = this.tableBody.getElementsByTagName('tr');

        Array.from(rows).forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    limparFiltros() {
        this.tipoRelatorio.value = 'geral';
        this.dataInicio.value = '';
        this.dataFim.value = '';
        this.empresasSelect.selectedIndex = -1;
        this.statusSelect.selectedIndex = -1;
        this.handleFiltersChange();
        this.gerarRelatorio();
    }

    async exportData(type) {
        try {
            this.showLoading(true);
            
            const filters = this.getFilters();
            let result;
            
            if (type === 'excel') {
                result = await exportManager.exportToExcel('cheques', filters);
            } else if (type === 'pdf') {
                result = await exportManager.exportToPDF('cheques', filters);
            }
            
            if (result.success) {
                this.showMessage(result.message, 'success');
            } else {
                this.showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro na exportação:', error);
            this.showMessage('Erro ao exportar dados. Tente novamente.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    getFilters() {
        return {
            startDate: this.startDateInput.value ? new Date(this.startDateInput.value) : null,
            endDate: this.endDateInput.value ? new Date(this.endDateInput.value) : null,
            status: this.statusSelect.value || null,
            empresa: this.empresaSelect.value || null
        };
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }

    showLoading(show) {
        if (this.loadingElement) {
            this.loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    showMessage(text, type = 'info') {
        if (this.messageElement) {
            this.messageElement.textContent = text;
            this.messageElement.className = `message ${type}`;
            this.messageElement.style.display = 'block';
            
            setTimeout(() => {
                this.messageElement.style.display = 'none';
            }, 3000);
        }
    }

    showError(message) {
        // Implementar toast de erro
        console.error('Erro:', message);
    }

    async loadData() {
        try {
            this.showLoading(true);
            
            const filters = this.getFilters();
            await this.updateCharts(filters);
            await this.updateTables(filters);
            
            this.showLoading(false);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showMessage('Erro ao carregar dados. Tente novamente.', 'error');
            this.showLoading(false);
        }
    }

    async updateCharts(filters) {
        // Implementar atualização dos gráficos com os dados filtrados
        // Esta função será implementada quando adicionarmos os gráficos
    }

    async updateTables(filters) {
        // Implementar atualização das tabelas com os dados filtrados
        // Esta função será implementada quando adicionarmos as tabelas
    }
}

// Inicializar e exportar instância
const relatoriosManager = new RelatoriosManager();
window.relatoriosManager = relatoriosManager; // Para acesso global 