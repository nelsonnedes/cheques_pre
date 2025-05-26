/* js/dashboard.js */
import { setupUserInterface, checkAuth, getCurrentUser } from './auth.js';
import { 
  db, 
  auth,
  onAuthChange,
  COLLECTIONS, 
  STATUS_CHEQUE, 
  TIPO_OPERACAO, 
  buscarDocumentos, 
  formatarMoeda, 
  formatarData, 
  obterEmpresaAtiva,
  associarUsuarioEmpresa,
  garantirUsuarioNoFirestore,
  signOut
} from './config.js';
import { initializeNotifications } from './notifications.js';
import { where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const totalChequesElem = document.getElementById('total-cheques');
const chequesPendentesElem = document.getElementById('cheques-pendentes');
const chequesCompensadosElem = document.getElementById('cheques-compensados');
const valorTotalElem = document.getElementById('valor-total');
const recentChequesBody = document.getElementById('recent-cheques-body');

let chartStatus = null;
let currentUser = null;
let empresaAtiva = null;

// Recupera empresa ativa do localStorage
function buscarEmpresaAtiva() {
  const emp = localStorage.getItem('empresaAtiva');
  if (!emp) return null;
  try {
    return JSON.parse(emp);
  } catch {
    return null;
  }
}

// Busca cheques simulados no localStorage filtrando pela empresa ativa
function buscarChequesSimulado() {
  const dados = localStorage.getItem('cheques');
  if (!dados) return [];
  try {
    const cheques = JSON.parse(dados);
    const empresa = buscarEmpresaAtiva();
    if (!empresa) return [];
    return cheques.filter(chq => chq.empresaCnpj === empresa.cnpj);
  } catch {
    return [];
  }
}

// Atualiza os totais e a lista de cheques recentes
function atualizarDashboard() {
  const cheques = buscarChequesSimulado();
  
  const total = cheques.length;
  const pendentes = cheques.filter(c => c.status === 'Pendente').length;
  const compensados = cheques.filter(c => c.status === 'Compensado').length;

  totalChequesElem.textContent = total;
  chequesPendentesElem.textContent = pendentes;
  chequesCompensadosElem.textContent = compensados;

  // Popula lista recente (últimos 5)
  recentChequesBody.innerHTML = '';
  cheques.slice(-5).reverse().forEach(cheque => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cheque.numero}</td>
      <td>${cheque.emitente}</td>
      <td>${formatarMoeda(cheque.valor)}</td>
      <td>${cheque.vencimento}</td>
      <td>${cheque.status}</td>
    `;
    recentChequesBody.appendChild(tr);
  });

  atualizarGraficoStatus(cheques);
}

// Atualiza gráfico de status
function atualizarGraficoStatus(cheques) {
  const ctx = document.getElementById('grafico-status') || criarCanvasGrafico();

  const pendentes = cheques.filter(c => c.status === 'Pendente').length;
  const compensados = cheques.filter(c => c.status === 'Compensado').length;
  const cancelados = cheques.filter(c => c.status === 'Cancelado').length;

  const data = {
    labels: ['Pendente', 'Compensado', 'Cancelado'],
    datasets: [{
      data: [pendentes, compensados, cancelados],
      backgroundColor: ['#f39c12', '#27ae60', '#c0392b'],
    }]
  };

  if (chartStatus) {
    chartStatus.data = data;
    chartStatus.update();
  } else {
    chartStatus = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: 'Status dos Cheques'
          }
        }
      }
    });
  }
}

// Cria canvas do gráfico dinamicamente na dashboard
function criarCanvasGrafico() {
  const section = document.querySelector('.dashboard-overview');
  const canvas = document.createElement('canvas');
  canvas.id = 'grafico-status';
  canvas.style.maxWidth = '400px';
  section.appendChild(canvas);
  return canvas.getContext('2d');
}

// Verificar autenticação
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await initializeDashboard();
  } else {
    console.log('Usuário não autenticado, redirecionando...');
    window.location.href = 'login.html';
  }
});

// Inicializar dashboard
async function initializeDashboard() {
  try {
    currentUser = getCurrentUser();
    if (!currentUser) {
      console.log('Nenhum usuário atual, redirecionando...');
      window.location.href = 'login.html';
      return;
    }

    // Verificar se há empresas selecionadas
    const selectedCompaniesData = localStorage.getItem('selectedCompanies');
    if (!selectedCompaniesData) {
      console.warn('Nenhuma empresa selecionada. Redirecionando para seleção de empresas.');
      window.location.href = 'empresas.html';
      return;
    }

    const selectedCompanies = JSON.parse(selectedCompaniesData);
    if (selectedCompanies.length === 0) {
      console.warn('Nenhuma empresa selecionada. Redirecionando para seleção de empresas.');
      window.location.href = 'empresas.html';
      return;
    }

    // Atualizar display das empresas
    updateCompaniesDisplay(selectedCompanies);

    // Inicializar sistemas
    setupEventListeners();
    await loadDashboardData(selectedCompanies);
    updateUserInfo();
    
    // Inicializar notificações
    await initializeNotifications();
    
  } catch (error) {
    console.error('Erro ao inicializar dashboard:', error);
    window.location.href = 'login.html';
  }
}

// Atualizar display das empresas selecionadas
function updateCompaniesDisplay(selectedCompanies) {
  const empresaDisplay = document.getElementById('empresa-ativa-display');
  if (empresaDisplay) {
    if (selectedCompanies.length === 1) {
      empresaDisplay.textContent = selectedCompanies[0].nome;
    } else {
      empresaDisplay.textContent = `${selectedCompanies.length} empresas selecionadas`;
    }
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Sidebar toggle para mobile
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Criar overlay para mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
  }

  // Profile dropdown
  const profileBtn = document.getElementById('profile-btn');
  const profileDropdown = document.getElementById('profile-dropdown');

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
    profileDropdown.classList.toggle('hidden');
  });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', () => {
      profileDropdown.classList.add('hidden');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Fechar sidebar ao clicar em links (mobile)
  const sidebarLinks = document.querySelectorAll('.sidebar nav a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
}

// Toggle sidebar mobile
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (sidebar && overlay) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  }
}

// Fechar sidebar
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (sidebar && overlay) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

// Atualizar informações do usuário
function updateUserInfo() {
  const userNameElement = document.getElementById('user-name');
  if (userNameElement && currentUser) {
    userNameElement.textContent = currentUser.displayName || currentUser.email.split('@')[0];
  }
}

// Carregar dados do dashboard
async function loadDashboardData(selectedCompanies) {
  try {
    showLoading(true);
    
    // Carregar estatísticas
    await loadStatistics(selectedCompanies);
    
    // Carregar cheques recentes
    await loadRecentCheques(selectedCompanies);
    
    // Carregar gráficos
    loadCharts();
    
  } catch (error) {
    console.error('Erro ao carregar dados do dashboard:', error);
    showToast('Erro ao carregar dados do dashboard', 'error');
  } finally {
    showLoading(false);
  }
}

// Carregar estatísticas
async function loadStatistics(selectedCompanies) {
  try {
    if (selectedCompanies.length === 0) {
      console.warn('Nenhuma empresa selecionada');
      return;
    }

    const filtros = [
      where('empresaId', '==', selectedCompanies[0].id || selectedCompanies[0].cnpj)
    ];
    
    const resultado = await buscarDocumentos(COLLECTIONS.CHEQUES, filtros);
    
    if (resultado.success) {
      const cheques = resultado.data;
      
      let totalCheques = cheques.length;
      let chequesPendentes = 0;
      let chequesCompensados = 0;
      let valorTotal = 0;
      
      cheques.forEach((cheque) => {
        valorTotal += parseFloat(cheque.valor) || 0;
        
        if (cheque.status === STATUS_CHEQUE.PENDENTE) {
          chequesPendentes++;
        } else if (cheque.status === STATUS_CHEQUE.COMPENSADO) {
          chequesCompensados++;
        }
      });
      
      // Atualizar elementos
      updateElement('total-cheques', totalCheques);
      updateElement('cheques-pendentes', chequesPendentes);
      updateElement('cheques-compensados', chequesCompensados);
      updateElement('valor-total', formatarMoeda(valorTotal));
    } else {
      console.error('Erro ao carregar estatísticas:', resultado.error);
      throw new Error(resultado.error);
    }
    
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    // Valores padrão em caso de erro
    updateElement('total-cheques', '0');
    updateElement('cheques-pendentes', '0');
    updateElement('cheques-compensados', '0');
    updateElement('valor-total', 'R$ 0,00');
  }
}

// Carregar cheques recentes
async function loadRecentCheques(selectedCompanies) {
  try {
    if (selectedCompanies.length === 0) {
      console.warn('Nenhuma empresa selecionada');
      return;
    }

    const filtros = [
      where('empresaId', '==', selectedCompanies[0].id || selectedCompanies[0].cnpj),
      orderBy('criadoEm', 'desc'),
      limit(5)
    ];
    
    const resultado = await buscarDocumentos(COLLECTIONS.CHEQUES, filtros);
    
    const tbody = document.getElementById('recent-cheques-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">
            <div class="empty-state">
              <i class="fas fa-file-invoice-dollar fa-3x"></i>
              <p>Nenhum cheque encontrado</p>
              <a href="incluirCheque.html" class="btn btn-primary">Adicionar Primeiro Cheque</a>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    resultado.data.forEach((cheque) => {
      const row = createChequeRow(cheque.id, cheque);
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Erro ao carregar cheques recentes:', error);
    const tbody = document.getElementById('recent-cheques-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-error">
            Erro ao carregar cheques recentes
          </td>
        </tr>
      `;
    }
  }
}

// Criar linha da tabela de cheques
function createChequeRow(id, cheque) {
  const row = document.createElement('tr');
  
  const statusClass = getStatusClass(cheque.status);
  const statusText = getStatusText(cheque.status);
  
  row.innerHTML = `
    <td>${cheque.numero || '-'}</td>
    <td>${cheque.emitente || '-'}</td>
    <td>${formatarMoeda(cheque.valor)}</td>
    <td>${formatarData(cheque.vencimento)}</td>
    <td><span class="status ${statusClass}">${statusText}</span></td>
    <td>
      <div class="action-buttons">
        <button onclick="viewCheque('${id}')" class="btn-icon" title="Visualizar">
          <i class="fas fa-eye"></i>
        </button>
        <button onclick="editCheque('${id}')" class="btn-icon" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </td>
  `;
  
  return row;
}

// Carregar gráficos
function loadCharts() {
  loadStatusChart();
  loadMonthlyChart();
}

// Gráfico de status
function loadStatusChart() {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pendentes', 'Compensados', 'Vencidos'],
      datasets: [{
        data: [12, 8, 3],
        backgroundColor: [
          '#ECC94B',
          '#38A169',
          '#E53E3E'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Gráfico mensal
function loadMonthlyChart() {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      datasets: [{
        label: 'Cheques por Mês',
        data: [12, 19, 8, 15, 22, 18],
        borderColor: '#3182CE',
        backgroundColor: 'rgba(49, 130, 206, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Funções auxiliares
function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function getStatusClass(status) {
  const statusMap = {
    [STATUS_CHEQUE.PENDENTE]: 'warning',
    [STATUS_CHEQUE.COMPENSADO]: 'success',
    [STATUS_CHEQUE.DEVOLVIDO]: 'error',
    [STATUS_CHEQUE.PARCIAL]: 'info'
  };
  return statusMap[status] || 'info';
}

function getStatusText(status) {
  const statusMap = {
    [STATUS_CHEQUE.PENDENTE]: 'Pendente',
    [STATUS_CHEQUE.COMPENSADO]: 'Compensado',
    [STATUS_CHEQUE.DEVOLVIDO]: 'Devolvido',
    [STATUS_CHEQUE.PARCIAL]: 'Parcial'
  };
  return statusMap[status] || status;
}

// Ações dos cheques
window.viewCheque = function(id) {
  window.location.href = `listarCheques.html?view=${id}`;
};

window.editCheque = function(id) {
  window.location.href = `incluirCheque.html?edit=${id}`;
};

// Logout
async function handleLogout() {
  if (confirm('Tem certeza que deseja sair?')) {
    try {
      showLoading(true);
      await signOut(auth);
      showToast('Logout realizado com sucesso!', 'success');
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Erro no logout:', error);
      showToast('Erro ao fazer logout', 'error');
    } finally {
      showLoading(false);
    }
  }
}

// Sistema de toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = getToastIcon(type);
  toast.innerHTML = `
    <i class="${icon}"></i>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Auto remove após 5 segundos
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function getToastIcon(type) {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  return icons[type] || icons.info;
}

// Loading overlay
function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se já está autenticado
  if (currentUser) {
    initializeDashboard();
  }
});