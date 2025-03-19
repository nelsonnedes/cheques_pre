import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let statusChart, valoresChart, empresasChart;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    setupEventListeners();
    loadEmpresas();
    setDefaultDates();
    loadReportData();
});

// Set default date range to current month
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('periodoInicio').value = formatDateForInput(firstDay);
    document.getElementById('periodoFim').value = formatDateForInput(lastDay);
}

// Format date for input fields
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('aplicarFiltroBtn').addEventListener('click', loadReportData);
    document.getElementById('shareBtn').addEventListener('click', shareReport);
    document.getElementById('downloadBtn').addEventListener('click', downloadReport);
}

// Load companies for filter
async function loadEmpresas() {
    try {
        const empresasRef = collection(db, 'empresas');
        const snapshot = await getDocs(empresasRef);
        const select = document.getElementById('empresaFiltro');
        
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        alert('Erro ao carregar lista de empresas');
    }
}

// Initialize Chart.js charts
function initializeCharts() {
    // Status Distribution Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['Pendente', 'Pago', 'Vencido', 'Cancelado'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#ffd700', '#4caf50', '#f44336', '#9e9e9e']
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

    // Monthly Values Chart
    const valoresCtx = document.getElementById('valoresChart').getContext('2d');
    valoresChart = new Chart(valoresCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Valor Total',
                data: [],
                backgroundColor: '#2196f3'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `R$ ${value.toLocaleString('pt-BR')}`
                    }
                }
            }
        }
    });

    // Top Companies Chart
    const empresasCtx = document.getElementById('empresasChart').getContext('2d');
    empresasChart = new Chart(empresasCtx, {
        type: 'horizontalBar',
        data: {
            labels: [],
            datasets: [{
                label: 'Valor Total',
                data: [],
                backgroundColor: '#4caf50'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `R$ ${value.toLocaleString('pt-BR')}`
                    }
                }
            }
        }
    });
}

// Load report data based on filters
async function loadReportData() {
    try {
        const periodoInicio = new Date(document.getElementById('periodoInicio').value);
        const periodoFim = new Date(document.getElementById('periodoFim').value);
        const empresaId = document.getElementById('empresaFiltro').value;

        // Create base query
        let q = query(
            collection(db, 'cheques'),
            where('data', '>=', Timestamp.fromDate(periodoInicio)),
            where('data', '<=', Timestamp.fromDate(periodoFim))
        );

        // Add company filter if selected
        if (empresaId) {
            q = query(q, where('empresaId', '==', empresaId));
        }

        const snapshot = await getDocs(q);
        const cheques = [];
        snapshot.forEach(doc => {
            cheques.push({ id: doc.id, ...doc.data() });
        });

        updateSummary(cheques);
        updateCharts(cheques);
        updateTable(cheques);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do relatório');
    }
}

// Update summary cards
function updateSummary(cheques) {
    const totalCheques = cheques.length;
    const valorTotal = cheques.reduce((sum, cheque) => sum + cheque.valor, 0);
    const totalJuros = cheques.reduce((sum, cheque) => sum + (cheque.juros || 0), 0);
    const totalImpostos = cheques.reduce((sum, cheque) => sum + (cheque.impostos || 0), 0);

    document.getElementById('totalCheques').textContent = totalCheques;
    document.getElementById('valorTotal').textContent = formatCurrency(valorTotal);
    document.getElementById('totalJuros').textContent = formatCurrency(totalJuros);
    document.getElementById('totalImpostos').textContent = formatCurrency(totalImpostos);
}

// Update all charts with new data
function updateCharts(cheques) {
    // Update Status Chart
    const statusCount = {
        'Pendente': 0,
        'Pago': 0,
        'Vencido': 0,
        'Cancelado': 0
    };
    cheques.forEach(cheque => statusCount[cheque.status]++);
    statusChart.data.datasets[0].data = Object.values(statusCount);
    statusChart.update();

    // Update Monthly Values Chart
    const monthlyValues = {};
    cheques.forEach(cheque => {
        const month = new Date(cheque.data.toDate()).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        monthlyValues[month] = (monthlyValues[month] || 0) + cheque.valor;
    });
    valoresChart.data.labels = Object.keys(monthlyValues);
    valoresChart.data.datasets[0].data = Object.values(monthlyValues);
    valoresChart.update();

    // Update Companies Chart
    const empresasValues = {};
    cheques.forEach(cheque => {
        empresasValues[cheque.empresaNome] = (empresasValues[cheque.empresaNome] || 0) + cheque.valor;
    });
    const sortedEmpresas = Object.entries(empresasValues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    empresasChart.data.labels = sortedEmpresas.map(([nome]) => nome);
    empresasChart.data.datasets[0].data = sortedEmpresas.map(([,valor]) => valor);
    empresasChart.update();
}

// Update detailed table
function updateTable(cheques) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    cheques.sort((a, b) => a.data.toDate() - b.data.toDate())
        .forEach(cheque => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${formatDate(cheque.data.toDate())}</td>
                <td>${cheque.empresaNome}</td>
                <td>${formatCurrency(cheque.valor)}</td>
                <td>${formatCurrency(cheque.juros || 0)}</td>
                <td>${formatCurrency(cheque.impostos || 0)}</td>
                <td>${formatCurrency(cheque.valor + (cheque.juros || 0) + (cheque.impostos || 0))}</td>
                <td><span class="status-badge ${cheque.status.toLowerCase()}">${cheque.status}</span></td>
            `;
        });
}

// Share report
async function shareReport() {
    try {
        const title = 'Relatório de Cheques';
        const text = 'Relatório gerado pelo Sistema de Cheques';
        const url = window.location.href;

        if (navigator.share) {
            await navigator.share({ title, text, url });
        } else {
            alert('Compartilhamento não suportado neste navegador');
        }
    } catch (error) {
        console.error('Erro ao compartilhar:', error);
        alert('Erro ao compartilhar relatório');
    }
}

// Download report as PDF
function downloadReport() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Relatório de Cheques', 20, 20);

        // Add period
        doc.setFontSize(12);
        const periodoInicio = document.getElementById('periodoInicio').value;
        const periodoFim = document.getElementById('periodoFim').value;
        doc.text(`Período: ${formatDate(new Date(periodoInicio))} a ${formatDate(new Date(periodoFim))}`, 20, 30);

        // Add summary
        doc.text('Resumo:', 20, 40);
        doc.text(`Total de Cheques: ${document.getElementById('totalCheques').textContent}`, 30, 50);
        doc.text(`Valor Total: ${document.getElementById('valorTotal').textContent}`, 30, 60);
        doc.text(`Total de Juros: ${document.getElementById('totalJuros').textContent}`, 30, 70);
        doc.text(`Total de Impostos: ${document.getElementById('totalImpostos').textContent}`, 30, 80);

        // Save PDF
        doc.save('relatorio-cheques.pdf');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF do relatório');
    }
}

// Utility function to format currency
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Utility function to format date
function formatDate(date) {
    return date.toLocaleDateString('pt-BR');
} 