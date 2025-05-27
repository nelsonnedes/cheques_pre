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
import { where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Variáveis globais
let currentUser = null;
let selectedCompanies = [];
let chartStatus = null;
let chartMonthly = null;

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
      console.warn('Nenhuma empresa selecionada.');
      return;
    }

    selectedCompanies = JSON.parse(selectedCompaniesData);
    if (selectedCompanies.length === 0) {
      console.warn('Nenhuma empresa selecionada.');
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
    let totalCheques = 0;
    let chequesPendentes = 0;
    let chequesCompensados = 0;
    let valorTotal = 0;

    for (const empresa of selectedCompanies) {
      const chequesQuery = query(
        collection(db, COLLECTIONS.CHEQUES),
        where('empresaId', '==', empresa.id),
        where('userId', '==', currentUser.uid)
      );
      
      const chequesSnapshot = await buscarDocumentos(COLLECTIONS.CHEQUES, [
        where('empresaId', '==', empresa.id),
        where('userId', '==', currentUser.uid)
      ]);

      if (chequesSnapshot.success) {
        const cheques = chequesSnapshot.data;
        totalCheques += cheques.length;
        
        cheques.forEach(cheque => {
          valorTotal += parseFloat(cheque.valor || 0);
          
          if (cheque.status === STATUS_CHEQUE.PENDENTE) {
            chequesPendentes++;
          } else if (cheque.status === STATUS_CHEQUE.COMPENSADO) {
            chequesCompensados++;
          }
        });
      }
    }

    // Atualizar elementos da interface
    updateElement('total-cheques', totalCheques);
    updateElement('cheques-pendentes', chequesPendentes);
    updateElement('cheques-compensados', chequesCompensados);
    updateElement('valor-total', formatCurrency(valorTotal));

  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// Carregar cheques recentes
async function loadRecentCheques(selectedCompanies) {
  try {
    const recentChequesBody = document.getElementById('recent-cheques-body');
    if (!recentChequesBody) return;

    recentChequesBody.innerHTML = '';
    
    for (const empresa of selectedCompanies) {
      const chequesSnapshot = await buscarDocumentos(COLLECTIONS.CHEQUES, [
        where('empresaId', '==', empresa.id),
        where('userId', '==', currentUser.uid),
        orderBy('criadoEm', 'desc'),
        limit(5)
      ]);

      if (chequesSnapshot.success) {
        chequesSnapshot.data.forEach(cheque => {
          const row = createChequeRow(cheque.id, cheque);
          recentChequesBody.appendChild(row);
        });
      }
    }

  } catch (error) {
    console.error('Erro ao carregar cheques recentes:', error);
  }
}

// Criar linha da tabela de cheques
function createChequeRow(id, cheque) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td>${cheque.numero || '-'}</td>
    <td>${cheque.emitente || '-'}</td>
    <td>${formatCurrency(cheque.valor || 0)}</td>
    <td>${formatDate(cheque.vencimento)}</td>
    <td>
      <span class="status ${getStatusClass(cheque.status)}">
        ${getStatusText(cheque.status)}
      </span>
    </td>
    <td>
      <div class="table-actions">
        <button class="btn-icon" onclick="editCheque('${id}')" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon" onclick="viewCheque('${id}')" title="Visualizar">
          <i class="fas fa-eye"></i>
        </button>
      </div>
    </td>
  `;
  return tr;
}

// Carregar gráficos
function loadCharts() {
  loadStatusChart();
  loadMonthlyChart();
}

// Carregar gráfico de status
function loadStatusChart() {
  const ctx = document.getElementById('status-chart');
  if (!ctx) return;

  // Dados simulados - substituir por dados reais
  const data = {
    labels: ['Pendente', 'Compensado', 'Devolvido', 'Cancelado'],
    datasets: [{
      data: [12, 19, 3, 5],
      backgroundColor: [
        '#f39c12',
        '#27ae60',
        '#e74c3c',
        '#95a5a6'
      ]
    }]
  };

  if (chartStatus) {
    chartStatus.destroy();
  }

    chartStatus = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Carregar gráfico mensal
function loadMonthlyChart() {
  const ctx = document.getElementById('monthly-chart');
  if (!ctx) return;

  // Dados simulados - substituir por dados reais
  const data = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [{
      label: 'Cheques Recebidos',
      data: [12, 19, 3, 5, 2, 3],
      borderColor: '#3182ce',
      backgroundColor: 'rgba(49, 130, 206, 0.1)',
      tension: 0.4
    }]
  };

  if (chartMonthly) {
    chartMonthly.destroy();
  }

  chartMonthly = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top'
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

// Funções utilitárias
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
  }).format(value);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
}

function getStatusClass(status) {
  const statusClasses = {
    [STATUS_CHEQUE.PENDENTE]: 'status-pending',
    [STATUS_CHEQUE.COMPENSADO]: 'status-success',
    [STATUS_CHEQUE.DEVOLVIDO]: 'status-error',
    [STATUS_CHEQUE.CANCELADO]: 'status-cancelled'
  };
  return statusClasses[status] || 'status-default';
}

function getStatusText(status) {
  const statusTexts = {
    [STATUS_CHEQUE.PENDENTE]: 'Pendente',
    [STATUS_CHEQUE.COMPENSADO]: 'Compensado',
    [STATUS_CHEQUE.DEVOLVIDO]: 'Devolvido',
    [STATUS_CHEQUE.CANCELADO]: 'Cancelado',
    [STATUS_CHEQUE.PARCIAL]: 'Parcial'
  };
  return statusTexts[status] || 'Desconhecido';
}

// Logout
async function handleLogout() {
  try {
    showLoading(true);
    
    const result = await signOut(auth);
    
    // Limpar dados locais
    localStorage.removeItem('selectedCompanies');
    localStorage.removeItem('empresaAtiva');
    
    // Redirecionar para login
    window.location.href = 'login.html';
    
  } catch (error) {
    console.error('Erro no logout:', error);
    showToast('Erro ao fazer logout', 'error');
  } finally {
    showLoading(false);
  }
}

// Toast notifications
function showToast(message, type = 'info') {
  const toastContainer = document.querySelector('.toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="${getToastIcon(type)}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Mostrar toast
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Auto remover
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
  
  // Botão fechar
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });
}

function createToastContainer() {
  const container = document.createElement('div');
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
  let overlay = document.querySelector('.loading-overlay');
  
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Carregando...</p>
      `;
      document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
  } else {
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
}