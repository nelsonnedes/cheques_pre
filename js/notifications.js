/* js/notifications.js */
import { 
  db, 
  COLLECTIONS, 
  STATUS_CHEQUE, 
  buscarDocumentos, 
  formatarMoeda, 
  formatarData, 
  obterEmpresaAtiva,
  getCurrentUser
} from './config.js';
import { where, orderBy } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Configurações de notificação
const NOTIFICATION_TYPES = {
  VENCIMENTO_PROXIMO: 'vencimento-proximo',
  CHEQUE_VENCIDO: 'cheque-vencido',
  VALOR_ALTO: 'valor-alto',
  JUROS_ACUMULADOS: 'juros-acumulados'
};

const NOTIFICATION_SETTINGS = {
  diasVencimentoProximo: 7, // Notificar 7 dias antes do vencimento
  valorAltoThreshold: 10000, // Valores acima de R$ 10.000
  maxNotifications: 20 // Máximo de notificações para exibir
};

let notifications = [];
let notificationBadge = null;
let notificationDropdown = null;

/**
 * Inicializar sistema de notificações
 */
export async function initializeNotifications() {
  try {
    // Encontrar elementos do DOM
    notificationBadge = document.querySelector('.notification-badge');
    notificationDropdown = document.querySelector('.notification-dropdown');
    
    if (!notificationBadge || !notificationDropdown) {
      console.warn('Elementos de notificação não encontrados no DOM');
      return;
    }
    
    // Configurar event listeners
    setupNotificationEvents();
    
    // Carregar notificações
    await loadNotifications();
    
    // Atualizar interface
    updateNotificationUI();
    
    // Configurar auto-atualização (a cada 5 minutos)
    setInterval(async () => {
      await loadNotifications();
      updateNotificationUI();
    }, 5 * 60 * 1000);
    
  } catch (error) {
    console.error('Erro ao inicializar notificações:', error);
  }
}

/**
 * Configurar eventos das notificações
 */
function setupNotificationEvents() {
  const notificationBtn = document.querySelector('.btn-notification');
  
  if (notificationBtn) {
    notificationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNotificationDropdown();
    });
  }
  
  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notification-container')) {
      closeNotificationDropdown();
    }
  });
  
  // Configurar ações dentro do dropdown
  if (notificationDropdown) {
    notificationDropdown.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const notificationId = e.target.dataset.notificationId;
      
      if (action === 'mark-read') {
        markNotificationAsRead(notificationId);
      } else if (action === 'view-cheque') {
        const chequeId = e.target.dataset.chequeId;
        viewCheque(chequeId);
      } else if (action === 'clear-all') {
        clearAllNotifications();
      }
    });
  }
}

/**
 * Carregar notificações baseadas na empresa ativa
 */
async function loadNotifications() {
  try {
    const empresaAtiva = obterEmpresaAtiva();
    if (!empresaAtiva) {
      notifications = [];
      return;
    }
    
    const filtros = [
      where('empresaId', '==', empresaAtiva.id || empresaAtiva.cnpj),
      where('status', 'in', [STATUS_CHEQUE.PENDENTE, STATUS_CHEQUE.PARCIAL]),
      orderBy('vencimento', 'asc')
    ];
    
    const resultado = await buscarDocumentos(COLLECTIONS.CHEQUES, filtros);
    
    if (resultado.success) {
      const cheques = resultado.data;
      notifications = [];
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      cheques.forEach(cheque => {
        const vencimento = new Date(cheque.vencimento);
        vencimento.setHours(0, 0, 0, 0);
        
        const diasAteVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
        
        // Cheques vencidos
        if (diasAteVencimento < 0) {
          notifications.push({
            id: `vencido-${cheque.id}`,
            chequeId: cheque.id,
            type: NOTIFICATION_TYPES.CHEQUE_VENCIDO,
            title: 'Cheque Vencido',
            message: `Cheque #${cheque.numero} venceu há ${Math.abs(diasAteVencimento)} dias`,
            priority: 'high',
            timestamp: new Date(),
            data: cheque
          });
        }
        // Cheques próximos do vencimento
        else if (diasAteVencimento <= NOTIFICATION_SETTINGS.diasVencimentoProximo && diasAteVencimento >= 0) {
          notifications.push({
            id: `proximo-${cheque.id}`,
            chequeId: cheque.id,
            type: NOTIFICATION_TYPES.VENCIMENTO_PROXIMO,
            title: 'Vencimento Próximo',
            message: `Cheque #${cheque.numero} vence em ${diasAteVencimento} dias`,
            priority: diasAteVencimento <= 2 ? 'high' : 'medium',
            timestamp: new Date(),
            data: cheque
          });
        }
        
        // Valores altos
        if (cheque.valor >= NOTIFICATION_SETTINGS.valorAltoThreshold) {
          notifications.push({
            id: `valor-alto-${cheque.id}`,
            chequeId: cheque.id,
            type: NOTIFICATION_TYPES.VALOR_ALTO,
            title: 'Valor Alto',
            message: `Cheque #${cheque.numero} - ${formatarMoeda(cheque.valor)}`,
            priority: 'medium',
            timestamp: new Date(),
            data: cheque
          });
        }
      });
      
      // Ordenar por prioridade e data
      notifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      // Limitar número de notificações
      notifications = notifications.slice(0, NOTIFICATION_SETTINGS.maxNotifications);
    }
    
  } catch (error) {
    console.error('Erro ao carregar notificações:', error);
    notifications = [];
  }
}

/**
 * Atualizar interface das notificações
 */
function updateNotificationUI() {
  // Atualizar badge
  updateNotificationBadge();
  
  // Atualizar dropdown
  updateNotificationDropdown();
}

/**
 * Atualizar badge de notificações
 */
function updateNotificationBadge() {
  if (!notificationBadge) return;
  
  const highPriorityCount = notifications.filter(n => n.priority === 'high').length;
  const totalCount = notifications.length;
  
  if (totalCount > 0) {
    notificationBadge.textContent = totalCount > 99 ? '99+' : totalCount;
    notificationBadge.classList.remove('hidden');
    
    // Adicionar classe de alta prioridade se houver alertas críticos
    if (highPriorityCount > 0) {
      notificationBadge.classList.add('high-priority');
    } else {
      notificationBadge.classList.remove('high-priority');
    }
  } else {
    notificationBadge.classList.add('hidden');
  }
}

/**
 * Atualizar dropdown de notificações
 */
function updateNotificationDropdown() {
  if (!notificationDropdown) return;
  
  if (notifications.length === 0) {
    notificationDropdown.innerHTML = `
      <div class="notification-header">
        <h3>Notificações</h3>
      </div>
      <div class="notification-body">
        <div class="notification-empty">
          <i class="fas fa-bell-slash"></i>
          <p>Nenhuma notificação</p>
        </div>
      </div>
    `;
    return;
  }
  
  const notificationsHTML = notifications.map(notification => `
    <div class="notification-item priority-${notification.priority}" data-notification-id="${notification.id}">
      <div class="notification-icon">
        <i class="fas ${getNotificationIcon(notification.type)}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-meta">
          <span class="notification-time">${formatTimeAgo(notification.timestamp)}</span>
          <span class="notification-amount">${formatarMoeda(notification.data.valor)}</span>
        </div>
      </div>
      <div class="notification-actions">
        <button class="btn-icon" data-action="view-cheque" data-cheque-id="${notification.chequeId}" title="Ver Cheque">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-icon" data-action="mark-read" data-notification-id="${notification.id}" title="Marcar como Lida">
          <i class="fas fa-check"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  notificationDropdown.innerHTML = `
    <div class="notification-header">
      <h3>Notificações (${notifications.length})</h3>
      <button class="btn-clear" data-action="clear-all">
        <i class="fas fa-trash"></i> Limpar Todas
      </button>
    </div>
    <div class="notification-body">
      ${notificationsHTML}
    </div>
    <div class="notification-footer">
      <a href="listarCheques.html" class="btn-view-all">Ver Todos os Cheques</a>
    </div>
  `;
}

/**
 * Obter ícone da notificação
 */
function getNotificationIcon(type) {
  const icons = {
    [NOTIFICATION_TYPES.VENCIMENTO_PROXIMO]: 'fa-calendar-exclamation',
    [NOTIFICATION_TYPES.CHEQUE_VENCIDO]: 'fa-exclamation-triangle',
    [NOTIFICATION_TYPES.VALOR_ALTO]: 'fa-dollar-sign',
    [NOTIFICATION_TYPES.JUROS_ACUMULADOS]: 'fa-percentage'
  };
  
  return icons[type] || 'fa-bell';
}

/**
 * Formatar tempo relativo
 */
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Agora mesmo';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
  
  return formatarData(date);
}

/**
 * Toggle dropdown de notificações
 */
function toggleNotificationDropdown() {
  if (!notificationDropdown) return;
  
  const isVisible = !notificationDropdown.classList.contains('hidden');
  
  if (isVisible) {
    closeNotificationDropdown();
  } else {
    openNotificationDropdown();
  }
}

/**
 * Abrir dropdown de notificações
 */
function openNotificationDropdown() {
  if (!notificationDropdown) return;
  
  notificationDropdown.classList.remove('hidden');
  
  // Marcar botão como ativo
  const notificationBtn = document.querySelector('.btn-notification');
  if (notificationBtn) {
    notificationBtn.classList.add('active');
  }
}

/**
 * Fechar dropdown de notificações
 */
function closeNotificationDropdown() {
  if (!notificationDropdown) return;
  
  notificationDropdown.classList.add('hidden');
  
  // Remover estado ativo do botão
  const notificationBtn = document.querySelector('.btn-notification');
  if (notificationBtn) {
    notificationBtn.classList.remove('active');
  }
}

/**
 * Marcar notificação como lida
 */
function markNotificationAsRead(notificationId) {
  notifications = notifications.filter(n => n.id !== notificationId);
  updateNotificationUI();
}

/**
 * Limpar todas as notificações
 */
function clearAllNotifications() {
  notifications = [];
  updateNotificationUI();
  closeNotificationDropdown();
}

/**
 * Ver detalhes do cheque
 */
function viewCheque(chequeId) {
  closeNotificationDropdown();
  window.location.href = `listarCheques.html?highlight=${chequeId}`;
}

/**
 * Obter contadores de notificação
 */
export function getNotificationCounts() {
  return {
    total: notifications.length,
    high: notifications.filter(n => n.priority === 'high').length,
    medium: notifications.filter(n => n.priority === 'medium').length,
    low: notifications.filter(n => n.priority === 'low').length
  };
}

/**
 * Obter notificações atuais
 */
export function getCurrentNotifications() {
  return [...notifications];
}

// Inicializar automaticamente quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Só inicializar se estivermos em uma página com sistema de notificações
  if (document.querySelector('.btn-notification')) {
    initializeNotifications();
  }
}); 