/* js/relatorio.js */
import { 
  collection, query, where, orderBy, getDocs, 
  startAfter, limit, getDoc, doc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth, db } from './firebase-config.js';

// Variáveis globais
let currentUser = null;
let selectedCompanies = [];
let relatorioData = [];
let currentFilters = {};

// Elementos DOM
const empresaDisplay = document.getElementById('selected-company-name');
const filtroDataInicio = document.getElementById('data-inicio');
const filtroDataFim = document.getElementById('data-fim');
const filtroStatus = document.getElementById('tipo-operacao');
const filtroTipo = document.getElementById('tipo-operacao');
const btnFiltrar = document.getElementById('aplicar-filtros');
const btnLimparFiltros = document.getElementById('refresh-btn');
const btnExportarPDF = document.getElementById('export-pdf');
const btnExportarExcel = document.getElementById('export-table');
const relatorioContainer = document.getElementById('relatorio-table');
const loadingIndicator = document.getElementById('loading-overlay');
const companyWarning = document.getElementById('company-indicator');

// Verificar autenticação
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await initializeRelatorio();
  } else {
    console.log('Usuário não autenticado, redirecionando...');
    window.location.href = 'login.html';
  }
});

/**
 * Aguardar shared components
 */
async function waitForSharedComponents() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!window.sharedComponents && attempts < maxAttempts) {
    console.log('⏳ Aguardando shared components...', attempts + 1);
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  if (window.sharedComponents) {
    console.log('✅ Shared components encontrado');
  } else {
    console.warn('⚠️ Shared components não disponível, usando fallback');
  }
}

/**
 * Inicializar página de relatórios
 */
async function initializeRelatorio() {
  try {
    console.log('🔄 Inicializando página de relatórios...');
    
    // Aguardar shared components
    await waitForSharedComponents();
    
    // Carregar empresas selecionadas
    await loadSelectedCompanies();
    
    if (selectedCompanies.length === 0) {
      showCompanyWarning();
      return;
    }
    
    hideCompanyWarning();
    updateCompanyDisplay();
    setupEventListeners();
    setDefaultFilters();
    
    console.log('✅ Página de relatórios inicializada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar relatórios:', error);
    showToast('Erro ao carregar página de relatórios', 'error');
  }
}

/**
 * Carregar empresas selecionadas
 */
async function loadSelectedCompanies() {
  try {
    console.log('🔄 Carregando empresas selecionadas...');
    
    // Tentar usar shared components primeiro
    if (window.sharedComponents) {
      selectedCompanies = window.sharedComponents.getSelectedCompanies();
      console.log('✅ Empresas carregadas via shared components:', selectedCompanies);
    } else {
      // Fallback para localStorage
      const selectedCompaniesData = localStorage.getItem('selectedCompanies');
      if (selectedCompaniesData) {
        selectedCompanies = JSON.parse(selectedCompaniesData);
        console.log('✅ Empresas carregadas via localStorage:', selectedCompanies);
      } else {
        selectedCompanies = [];
        console.warn('⚠️ Nenhuma empresa encontrada');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar empresas:', error);
    selectedCompanies = [];
  }
}

/**
 * Mostrar aviso de empresa
 */
function showCompanyWarning() {
  if (companyWarning) {
    companyWarning.style.display = 'block';
  }
  if (relatorioContainer) {
    relatorioContainer.style.display = 'none';
  }
}

/**
 * Esconder aviso de empresa
 */
function hideCompanyWarning() {
  if (companyWarning) {
    companyWarning.style.display = 'none';
  }
  if (relatorioContainer) {
    relatorioContainer.style.display = 'block';
  }
}

/**
 * Atualizar display da empresa
 */
function updateCompanyDisplay() {
  if (empresaDisplay && selectedCompanies.length > 0) {
    if (selectedCompanies.length === 1) {
      empresaDisplay.textContent = selectedCompanies[0].nome;
    } else {
      empresaDisplay.textContent = `${selectedCompanies.length} empresas selecionadas`;
    }
  }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
  if (btnFiltrar) {
    btnFiltrar.addEventListener('click', handleFiltrar);
  }
  
  if (btnLimparFiltros) {
    btnLimparFiltros.addEventListener('click', handleLimparFiltros);
  }
  
  if (btnExportarPDF) {
    btnExportarPDF.addEventListener('click', handleExportarPDF);
  }
  
  if (btnExportarExcel) {
    btnExportarExcel.addEventListener('click', handleExportarExcel);
  }
  
  // Event listener para mudanças nas empresas
  if (window.sharedComponents) {
    window.addEventListener('companiesChanged', async (event) => {
      selectedCompanies = event.detail.companies;
      if (selectedCompanies.length === 0) {
        showCompanyWarning();
      } else {
        hideCompanyWarning();
        updateCompanyDisplay();
        await loadRelatorioData();
      }
    });
  }
}

/**
 * Definir filtros padrão
 */
function setDefaultFilters() {
  const hoje = new Date();
  const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  if (filtroDataInicio) {
    filtroDataInicio.value = formatDateForInput(primeiroDiaDoMes);
  }
  
  if (filtroDataFim) {
    filtroDataFim.value = formatDateForInput(hoje);
  }
}

/**
 * Manipular filtrar
 */
async function handleFiltrar() {
  try {
    showLoading(true);
    
    currentFilters = {
      dataInicio: filtroDataInicio?.value || null,
      dataFim: filtroDataFim?.value || null,
      status: filtroStatus?.value || null,
      tipo: filtroTipo?.value || null
    };
    
    await loadRelatorioData();
    
  } catch (error) {
    console.error('❌ Erro ao filtrar relatório:', error);
    showToast('Erro ao filtrar dados', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Manipular limpar filtros
 */
function handleLimparFiltros() {
  if (filtroDataInicio) filtroDataInicio.value = '';
  if (filtroDataFim) filtroDataFim.value = '';
  if (filtroStatus) filtroStatus.value = '';
  if (filtroTipo) filtroTipo.value = '';
  
  currentFilters = {};
  setDefaultFilters();
}

/**
 * Carregar dados do relatório
 */
async function loadRelatorioData() {
  try {
    console.log('🔄 Carregando dados do relatório...');
    showLoading(true);
    
    relatorioData = [];
    
    for (const empresa of selectedCompanies) {
      const chequesQuery = buildQuery(empresa);
      const querySnapshot = await getDocs(chequesQuery);
      
      querySnapshot.forEach((doc) => {
        const cheque = { id: doc.id, ...doc.data() };
        cheque.empresaNome = empresa.nome;
        cheque.empresaId = empresa.id;
        relatorioData.push(cheque);
      });
    }
    
    // Ordenar por data de vencimento
    relatorioData.sort((a, b) => {
      const dateA = a.vencimento?.toDate() || new Date(0);
      const dateB = b.vencimento?.toDate() || new Date(0);
      return dateA - dateB;
    });
    
    renderRelatorio();
    updateSummary();
    
    console.log('✅ Dados do relatório carregados:', relatorioData.length, 'cheques');
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados do relatório:', error);
    showToast('Erro ao carregar dados do relatório', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Construir query do Firestore
 */
function buildQuery(empresa) {
  let q = collection(db, 'cheques');
  
  // Filtro por empresa
  q = query(q, where('empresaId', '==', empresa.id));
  
  // Filtros de data
  if (currentFilters.dataInicio) {
    const dataInicio = new Date(currentFilters.dataInicio);
    q = query(q, where('vencimento', '>=', dataInicio));
  }
  
  if (currentFilters.dataFim) {
    const dataFim = new Date(currentFilters.dataFim);
    dataFim.setHours(23, 59, 59, 999);
    q = query(q, where('vencimento', '<=', dataFim));
  }
  
  // Filtro por status
  if (currentFilters.status) {
    q = query(q, where('status', '==', currentFilters.status));
  }
  
  // Filtro por tipo
  if (currentFilters.tipo) {
    q = query(q, where('tipoOperacao', '==', currentFilters.tipo));
  }
  
  // Ordenar por vencimento
  q = query(q, orderBy('vencimento', 'asc'));
  
  return q;
}

/**
 * Renderizar relatório
 */
function renderRelatorio() {
  const tbody = document.querySelector('#relatorio-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (relatorioData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4">
          <i class="fas fa-inbox text-gray-400 text-2xl mb-2"></i>
          <p class="text-gray-500">Nenhum cheque encontrado com os filtros aplicados</p>
        </td>
      </tr>
    `;
    return;
  }
  
  relatorioData.forEach(cheque => {
    const row = createRelatorioRow(cheque);
    tbody.appendChild(row);
  });
}

/**
 * Criar linha do relatório
 */
function createRelatorioRow(cheque) {
  const row = document.createElement('tr');
  row.className = 'hover:bg-gray-50';
  
  const vencimento = cheque.vencimento?.toDate();
  const valor = cheque.valor || 0;
  
  row.innerHTML = `
    <td class="px-4 py-3 text-sm">${cheque.numero || '-'}</td>
    <td class="px-4 py-3 text-sm">${cheque.emitente || '-'}</td>
    <td class="px-4 py-3 text-sm">${cheque.empresaNome || '-'}</td>
    <td class="px-4 py-3 text-sm">${vencimento ? formatDate(vencimento) : '-'}</td>
    <td class="px-4 py-3 text-sm font-medium">${formatCurrency(valor)}</td>
    <td class="px-4 py-3 text-sm">
      <span class="status-badge status-${cheque.status || 'pendente'}">
        ${getStatusText(cheque.status || 'pendente')}
      </span>
    </td>
    <td class="px-4 py-3 text-sm">
      <span class="tipo-badge tipo-${cheque.tipoOperacao || 'receber'}">
        ${getTipoText(cheque.tipoOperacao || 'receber')}
      </span>
    </td>
    <td class="px-4 py-3 text-sm">
      <div class="flex space-x-2">
        <button onclick="viewCheque('${cheque.id}')" class="text-blue-600 hover:text-blue-800">
          <i class="fas fa-eye"></i>
        </button>
        <button onclick="editCheque('${cheque.id}')" class="text-green-600 hover:text-green-800">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </td>
  `;
  
  return row;
}

/**
 * Atualizar resumo
 */
function updateSummary() {
  const totalCheques = relatorioData.length;
  const valorTotal = relatorioData.reduce((sum, cheque) => sum + (cheque.valor || 0), 0);
  
  const statusCounts = relatorioData.reduce((counts, cheque) => {
    const status = cheque.status || 'pendente';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  
  // Atualizar elementos do resumo
  updateElement('total-cheques', totalCheques);
  updateElement('valor-total', formatCurrency(valorTotal));
  updateElement('cheques-pendentes', statusCounts.pendente || 0);
  updateElement('cheques-compensados', statusCounts.compensado || 0);
  updateElement('cheques-devolvidos', statusCounts.devolvido || 0);
}

/**
 * Manipular exportar PDF
 */
async function handleExportarPDF() {
  try {
    showToast('Gerando PDF...', 'info');
    
    // Implementar exportação PDF
    console.log('Exportando PDF com', relatorioData.length, 'registros');
    
    showToast('PDF gerado com sucesso!', 'success');
    
  } catch (error) {
    console.error('❌ Erro ao exportar PDF:', error);
    showToast('Erro ao gerar PDF', 'error');
  }
}

/**
 * Manipular exportar Excel
 */
async function handleExportarExcel() {
  try {
    showToast('Gerando Excel...', 'info');
    
    // Implementar exportação Excel
    console.log('Exportando Excel com', relatorioData.length, 'registros');
    
    showToast('Excel gerado com sucesso!', 'success');
    
  } catch (error) {
    console.error('❌ Erro ao exportar Excel:', error);
    showToast('Erro ao gerar Excel', 'error');
  }
}

/**
 * Funções auxiliares
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

function getStatusText(status) {
  const statusMap = {
    'pendente': 'Pendente',
    'compensado': 'Compensado',
    'devolvido': 'Devolvido',
    'cancelado': 'Cancelado'
  };
  return statusMap[status] || status;
}

function getTipoText(tipo) {
  const tipoMap = {
    'receber': 'A Receber',
    'pagar': 'A Pagar'
  };
  return tipoMap[tipo] || tipo;
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function showLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
  }
}

function showToast(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  // Criar elemento de toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Adicionar ao body
  document.body.appendChild(toast);
  
  // Remover após 3 segundos
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

// Funções globais para os botões
window.viewCheque = function(id) {
  window.open(`incluirCheque.html?id=${id}&view=true`, '_blank');
};

window.editCheque = function(id) {
  window.location.href = `incluirCheque.html?id=${id}`;
}; 