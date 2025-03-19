import { getFirestore, collection, query, where, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { formatCurrency, formatDate } from './utils.js';

class RelatoriosManager {
    constructor() {
        this.db = getFirestore();
        this.auth = getAuth();
        
        // Elementos da UI
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.periodoSelect = document.getElementById('periodoRelatorio');
        this.dataInicio = document.getElementById('dataInicio');
        this.dataFim = document.getElementById('dataFim');
        this.empresaSelect = document.getElementById('empresaRelatorio');
        this.statusSelect = document.getElementById('statusRelatorio');
        this.gerarRelatorioBtn = document.getElementById('gerarRelatorio');
        this.exportarPDFBtn = document.getElementById('exportarPDF');
        this.exportarExcelBtn = document.getElementById('exportarExcel');
        
        // Charts
        this.statusChart = null;
        this.valoresChart = null;
        this.empresasChart = null;
        this.evolucaoChart = null;
        
        // Dados
        this.cheques = [];
        this.empresas = new Map();
        
        this.init();
    }

    async init() {
        this.showLoading();
        try {
            await this.checkAuth();
            await this.loadEmpresas();
            this.setupEventListeners();
            this.setupCharts();
            await this.gerarRelatorio();
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

    async loadEmpresas() {
        const empresasRef = collection(this.db, 'empresas');
        const snapshot = await getDocs(empresasRef);
        
        snapshot.forEach(doc => {
            this.empresas.set(doc.id, doc.data());
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().nome;
            this.empresaSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        // Período personalizado
        this.periodoSelect.addEventListener('change', () => {
            const dateRangeFields = document.querySelectorAll('.date-range');
            if (this.periodoSelect.value === 'custom') {
                dateRangeFields.forEach(field => field.classList.remove('hidden'));
            } else {
                dateRangeFields.forEach(field => field.classList.add('hidden'));
            }
        });

        // Gerar relatório
        this.gerarRelatorioBtn.addEventListener('click', () => this.gerarRelatorio());

        // Exportar
        this.exportarPDFBtn.addEventListener('click', () => this.exportarPDF());
        this.exportarExcelBtn.addEventListener('click', () => this.exportarExcel());

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }

    setupCharts() {
        // Configuração comum
        Chart.defaults.color = '#495057';
        Chart.defaults.font.family = "'Poppins', sans-serif";
        
        // Gráfico de Status
        this.statusChart = new Chart(document.getElementById('statusChart'), {
            type: 'pie',
            data: {
                labels: ['Pendente', 'Compensado', 'Devolvido', 'Cancelado'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#ffc107', '#28a745', '#dc3545', '#6c757d']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Gráfico de Valores por Mês
        this.valoresChart = new Chart(document.getElementById('valoresChart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Valor Total',
                    data: [],
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Gráfico de Empresas
        this.empresasChart = new Chart(document.getElementById('empresasChart'), {
            type: 'horizontalBar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Valor Total',
                    data: [],
                    backgroundColor: '#20c997'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Gráfico de Evolução
        this.evolucaoChart = new Chart(document.getElementById('evolucaoChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Quantidade de Cheques',
                    data: [],
                    borderColor: '#6f42c1',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    async gerarRelatorio() {
        this.showLoading();
        try {
            const { startDate, endDate } = this.getDateRange();
            const q = this.buildQuery(startDate, endDate);
            const snapshot = await getDocs(q);
            
            this.cheques = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.updateSummary();
            this.updateCharts();
            this.updateTable();
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            alert('Erro ao gerar relatório. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    getDateRange() {
        let startDate, endDate = new Date();
        
        if (this.periodoSelect.value === 'custom') {
            startDate = new Date(this.dataInicio.value);
            endDate = new Date(this.dataFim.value);
            endDate.setHours(23, 59, 59);
        } else {
            const days = parseInt(this.periodoSelect.value);
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }
        
        return {
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate)
        };
    }

    buildQuery(startDate, endDate) {
        let conditions = [
            where('vencimento', '>=', startDate),
            where('vencimento', '<=', endDate)
        ];

        if (this.empresaSelect.value) {
            conditions.push(where('empresaId', '==', this.empresaSelect.value));
        }

        if (this.statusSelect.value) {
            conditions.push(where('status', '==', this.statusSelect.value));
        }

        return query(collection(this.db, 'cheques'), ...conditions);
    }

    updateSummary() {
        const total = this.cheques.length;
        const valorTotal = this.cheques.reduce((sum, cheque) => sum + cheque.valor, 0);
        const mediaValor = total > 0 ? valorTotal / total : 0;
        const compensados = this.cheques.filter(cheque => cheque.status === 'compensado').length;
        const taxaCompensacao = total > 0 ? (compensados / total) * 100 : 0;

        document.getElementById('totalCheques').textContent = total;
        document.getElementById('valorTotal').textContent = formatCurrency(valorTotal);
        document.getElementById('mediaValor').textContent = formatCurrency(mediaValor);
        document.getElementById('taxaCompensacao').textContent = `${taxaCompensacao.toFixed(1)}%`;
    }

    updateCharts() {
        // Atualizar gráfico de status
        const statusCount = {
            pendente: 0,
            compensado: 0,
            devolvido: 0,
            cancelado: 0
        };
        
        this.cheques.forEach(cheque => {
            statusCount[cheque.status]++;
        });

        this.statusChart.data.datasets[0].data = [
            statusCount.pendente,
            statusCount.compensado,
            statusCount.devolvido,
            statusCount.cancelado
        ];
        this.statusChart.update();

        // Atualizar gráfico de valores por mês
        const valoresPorMes = new Map();
        this.cheques.forEach(cheque => {
            const data = cheque.vencimento.toDate();
            const mesAno = `${data.getMonth() + 1}/${data.getFullYear()}`;
            valoresPorMes.set(mesAno, (valoresPorMes.get(mesAno) || 0) + cheque.valor);
        });

        this.valoresChart.data.labels = Array.from(valoresPorMes.keys());
        this.valoresChart.data.datasets[0].data = Array.from(valoresPorMes.values());
        this.valoresChart.update();

        // Atualizar gráfico de empresas
        const valoresPorEmpresa = new Map();
        this.cheques.forEach(cheque => {
            const empresa = this.empresas.get(cheque.empresaId);
            if (empresa) {
                valoresPorEmpresa.set(empresa.nome, (valoresPorEmpresa.get(empresa.nome) || 0) + cheque.valor);
            }
        });

        const empresasOrdenadas = Array.from(valoresPorEmpresa.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        this.empresasChart.data.labels = empresasOrdenadas.map(([nome]) => nome);
        this.empresasChart.data.datasets[0].data = empresasOrdenadas.map(([, valor]) => valor);
        this.empresasChart.update();

        // Atualizar gráfico de evolução
        const evolucaoPorDia = new Map();
        this.cheques.forEach(cheque => {
            const data = formatDate(cheque.vencimento.toDate());
            evolucaoPorDia.set(data, (evolucaoPorDia.get(data) || 0) + 1);
        });

        this.evolucaoChart.data.labels = Array.from(evolucaoPorDia.keys());
        this.evolucaoChart.data.datasets[0].data = Array.from(evolucaoPorDia.values());
        this.evolucaoChart.update();
    }

    updateTable() {
        const tbody = document.getElementById('relatorioTableBody');
        tbody.innerHTML = '';

        this.cheques.forEach(cheque => {
            const empresa = this.empresas.get(cheque.empresaId);
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${cheque.numeroCheque}</td>
                <td>${formatDate(cheque.vencimento.toDate())}</td>
                <td>${empresa ? empresa.nome : 'N/A'}</td>
                <td>${cheque.emissor}</td>
                <td>${formatCurrency(cheque.valor)}</td>
                <td><span class="status-badge ${cheque.status}">${cheque.status}</span></td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    async exportarPDF() {
        this.showLoading();
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Título
            doc.setFontSize(18);
            doc.text('Relatório de Cheques', 105, 15, { align: 'center' });
            
            // Período
            doc.setFontSize(12);
            const { startDate, endDate } = this.getDateRange();
            doc.text(`Período: ${formatDate(startDate.toDate())} a ${formatDate(endDate.toDate())}`, 105, 25, { align: 'center' });
            
            // Resumo
            doc.setFontSize(14);
            doc.text('Resumo', 14, 40);
            
            doc.setFontSize(12);
            doc.text(`Total de Cheques: ${document.getElementById('totalCheques').textContent}`, 14, 50);
            doc.text(`Valor Total: ${document.getElementById('valorTotal').textContent}`, 14, 60);
            doc.text(`Média por Cheque: ${document.getElementById('mediaValor').textContent}`, 14, 70);
            doc.text(`Taxa de Compensação: ${document.getElementById('taxaCompensacao').textContent}`, 14, 80);
            
            // Tabela
            const headers = ['Número', 'Data', 'Empresa', 'Emissor', 'Valor', 'Status'];
            const data = this.cheques.map(cheque => [
                cheque.numeroCheque,
                formatDate(cheque.vencimento.toDate()),
                this.empresas.get(cheque.empresaId)?.nome || 'N/A',
                cheque.emissor,
                formatCurrency(cheque.valor),
                cheque.status
            ]);
            
            doc.autoTable({
                head: [headers],
                body: data,
                startY: 100,
                theme: 'grid',
                styles: {
                    fontSize: 10,
                    cellPadding: 2
                },
                columnStyles: {
                    4: { halign: 'right' }
                }
            });
            
            // Salvar
            doc.save('relatorio-cheques.pdf');
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            alert('Erro ao exportar PDF. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    async exportarExcel() {
        this.showLoading();
        try {
            const headers = ['Número', 'Data', 'Empresa', 'Emissor', 'Valor', 'Status'];
            const data = this.cheques.map(cheque => [
                cheque.numeroCheque,
                formatDate(cheque.vencimento.toDate()),
                this.empresas.get(cheque.empresaId)?.nome || 'N/A',
                cheque.emissor,
                cheque.valor,
                cheque.status
            ]);
            
            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Cheques');
            
            // Formatar células
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let row = 1; row <= range.e.r; row++) {
                const valorCell = XLSX.utils.encode_cell({ r: row, c: 4 });
                if (ws[valorCell]) {
                    ws[valorCell].z = '#,##0.00';
                }
            }
            
            XLSX.writeFile(wb, 'relatorio-cheques.xlsx');
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            alert('Erro ao exportar Excel. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
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
window.relatoriosManager = new RelatoriosManager(); 