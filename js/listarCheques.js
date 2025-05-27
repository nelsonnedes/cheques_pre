import { auth, db } from './firebase-config.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Constantes
const STATUS_CHEQUE = {
  PENDENTE: 'pendente',
  COMPENSADO: 'compensado',
  DEVOLVIDO: 'devolvido',
  CANCELADO: 'cancelado',
  PARCIAL: 'parcial'
};

const TIPO_OPERACAO = {
  RECEBER: 'receber',
  PAGAR: 'pagar'
};

const STATUS_LABELS = {
  pendente: 'Pendente',
  compensado: 'Compensado',
  devolvido: 'Devolvido',
  cancelado: 'Cancelado',
  parcial: 'Parcial'
};

const OPERACAO_LABELS = {
  receber: 'A Receber',
  pagar: 'A Pagar'
};

// Elementos DOM
const empresaAtivaDisplay = document.getElementById('empresa-ativa-display');
const filtroStatus = document.getElementById('status-filter');
const filtroDataInicio = document.getElementById('date-from');
const filtroDataFim = document.getElementById('date-to');
const filtroEmitente = document.getElementById('search');
const btnAplicarFiltros = document.getElementById('apply-filters');
const btnLimparFiltros = document.getElementById('clear-filters');
const btnNovoCheck = document.getElementById('btn-novo-cheque');
const btnExportarExcel = document.getElementById('export-btn');
const btnExportarPdf = document.getElementById('btn-exportar-pdf');
const btnPrimeiroCheque = document.getElementById('btn-primeiro-cheque');
const chequesList = document.getElementById('cheques-tbody');
const loadingElement = document.getElementById('loading-overlay');
const emptyState = document.getElementById('empty-state');
const totalGeral = document.getElementById('total-geral');
const totalReceber = document.getElementById('total-receber');
const totalPagar = document.getElementById('total-pagar');

// Elementos de resumo
const totalCount = document.getElementById('total-count');
const totalValue = document.getElementById('total-value');
const pendingCount = document.getElementById('pending-count');
const clearedCount = document.getElementById('cleared-count');

// Modal elementos
const modalAcoes = document.getElementById('modal-acoes');
const modalClose = document.getElementById('modal-close');
const detalheNumero = document.getElementById('detalhe-numero');
const detalheEmitente = document.getElementById('detalhe-emitente');
const detalheValor = document.getElementById('detalhe-valor');
const detalheVencimento = document.getElementById('detalhe-vencimento');
const detalheStatus = document.getElementById('detalhe-status');
const detalheOperacao = document.getElementById('detalhe-operacao');
const valorPagamento = document.getElementById('valor-pagamento');
const dataOperacao = document.getElementById('data-operacao');
const observacoes = document.getElementById('observacoes');
const btnCompensar = document.getElementById('btn-compensar');
const btnParcial = document.getElementById('btn-parcial');
const btnDevolver = document.getElementById('btn-devolver');
const btnEditar = document.getElementById('btn-editar');

// Variáveis globais
let chequesData = [];
let chequeAtualModal = null;
let selectedCompanies = [];
let currentUser = null;

/**
 * Inicializar página
 */
async function inicializar() {
  console.log('🔄 Inicializando página de cheques...');
  
  // Aguardar shared components
  await waitForSharedComponents();
  
  // Verificar autenticação
  verificarAutenticacao();
  
  // Configurar event listeners
  configurarEventListeners();
  
  console.log('✅ Página de cheques inicializada');
}

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
    
    // Verificar empresas selecionadas
    selectedCompanies = window.sharedComponents.getSelectedCompanies() || [];
    console.log('🏢 Empresas selecionadas:', selectedCompanies);
    
    // Escutar mudanças nas empresas
    window.addEventListener('companiesChanged', (event) => {
      console.log('🔄 Empresas alteradas:', event.detail.companies);
      selectedCompanies = event.detail.companies || [];
      
      if (selectedCompanies.length > 0) {
        hideCompanyWarning();
        carregarCheques();
      } else {
        showCompanyWarning();
      }
    });
  } else {
    console.warn('⚠️ Shared components não disponível');
  }
}

/**
 * Verificar autenticação
 */
function verificarAutenticacao() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.log('❌ Usuário não autenticado');
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    console.log('✅ Usuário autenticado:', user.email);
    
    // Verificar se há empresas selecionadas
    if (selectedCompanies.length === 0) {
      console.warn('❌ Nenhuma empresa selecionada');
      showCompanyWarning();
      return;
    }
    
    // Carregar cheques
    await carregarCheques();
  });
}

/**
 * Mostrar aviso de empresa não selecionada
 */
function showCompanyWarning() {
  const warning = document.getElementById('company-warning');
  const filtersSection = document.querySelector('.filters-section');
  const tableSection = document.querySelector('.table-section');
  const summaryCards = document.querySelector('.summary-cards');
  
  if (warning) warning.style.display = 'flex';
  if (filtersSection) filtersSection.style.display = 'none';
  if (tableSection) tableSection.style.display = 'none';
  if (summaryCards) summaryCards.style.display = 'none';
  
  console.log('⚠️ Exibindo aviso de empresa não selecionada');
}

/**
 * Ocultar aviso de empresa
 */
function hideCompanyWarning() {
  const warning = document.getElementById('company-warning');
  const filtersSection = document.querySelector('.filters-section');
  const tableSection = document.querySelector('.table-section');
  const summaryCards = document.querySelector('.summary-cards');
  
  if (warning) warning.style.display = 'none';
  if (filtersSection) filtersSection.style.display = 'block';
  if (tableSection) tableSection.style.display = 'block';
  if (summaryCards) summaryCards.style.display = 'flex';
  
  console.log('✅ Ocultando aviso de empresa');
}

/**
 * Configurar event listeners
 */
function configurarEventListeners() {
  console.log('🔧 Configurando event listeners...');
  
  // Filtros
  btnAplicarFiltros?.addEventListener('click', aplicarFiltros);
  btnLimparFiltros?.addEventListener('click', limparFiltros);
  btnNovoCheck?.addEventListener('click', () => window.location.href = 'incluirCheque.html');
  btnPrimeiroCheque?.addEventListener('click', () => window.location.href = 'incluirCheque.html');
  btnExportarExcel?.addEventListener('click', exportarExcel);
  btnExportarPdf?.addEventListener('click', exportarPdf);
  
  // Modais - fechar
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', fecharModais);
  });
  
  // Fechar modal clicando fora
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        fecharModais();
      }
    });
  });
  
  // Seleção de cheques
  const selectAll = document.getElementById('select-all');
  selectAll?.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('input[name="cheque-select"]');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    updateBulkActions();
  });
  
  // Ações do modal
  btnCompensar?.addEventListener('click', () => processarAcao('compensar'));
  btnParcial?.addEventListener('click', () => processarAcao('parcial'));
  btnDevolver?.addEventListener('click', () => processarAcao('devolver'));
  btnEditar?.addEventListener('click', editarCheque);
  
  // Tabela - delegação de eventos
  chequesList?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const chequeId = btn.dataset.chequeId;
    const action = btn.dataset.action;
    const cheque = chequesData.find(c => c.id === chequeId);
    
    if (!cheque) return;
    
    if (action === 'actions') {
      abrirModalAcoes(cheque);
    }
  });
  
  console.log('✅ Event listeners configurados');
}

/**
 * Carregar cheques das empresas selecionadas
 */
async function carregarCheques() {
  if (!currentUser || selectedCompanies.length === 0) {
    console.warn('❌ Usuário não autenticado ou nenhuma empresa selecionada');
    return;
  }
  
  console.log('🔄 Carregando cheques...');
  mostrarLoading(true);
  
  try {
    chequesData = [];
    
    // Carregar cheques de todas as empresas selecionadas
    for (const company of selectedCompanies) {
      const companyId = company.id || company.cnpj;
      
      const q = query(
        collection(db, 'cheques'),
        where('empresaId', '==', companyId),
        orderBy('vencimento', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const cheque = { 
          id: doc.id, 
          ...doc.data(),
          empresaNome: company.nome
        };
        chequesData.push(cheque);
      });
    }
    
    // Ordenar por vencimento
    chequesData.sort((a, b) => {
      const dateA = new Date(a.vencimento);
      const dateB = new Date(b.vencimento);
      return dateB - dateA;
    });
    
    console.log(`✅ ${chequesData.length} cheques carregados`);
    
    renderizarCheques(chequesData);
    atualizarTotalizadores(chequesData);
    hideCompanyWarning();
    
  } catch (error) {
    console.error('❌ Erro ao carregar cheques:', error);
    mostrarErro('Erro ao carregar cheques: ' + error.message);
  } finally {
    mostrarLoading(false);
  }
}

/**
 * Renderizar tabela de cheques
 */
function renderizarCheques(cheques) {
  if (!cheques || cheques.length === 0) {
    mostrarEstadoVazio(true);
    return;
  }
  
  mostrarEstadoVazio(false);
  
  const html = cheques.map(cheque => `
    <tr class="cheque-row" data-cheque-id="${cheque.id}">
      <td>
        <input type="checkbox" name="cheque-select" value="${cheque.id}" onchange="updateBulkActions()">
      </td>
      <td>${cheque.numero || 'N/A'}</td>
      <td>${cheque.emitente || 'N/A'}</td>
      <td>${formatarMoeda(cheque.valor)}</td>
      <td>${formatarData(cheque.dataEmissao)}</td>
      <td>${formatarData(cheque.vencimento)}</td>
      <td>
        <span class="status-badge status-${cheque.status}">
          ${STATUS_LABELS[cheque.status] || cheque.status}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-outline" onclick="viewDetails('${cheque.id}')" title="Ver detalhes">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline" onclick="editCheque('${cheque.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteCheque('${cheque.id}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  if (chequesList) {
    chequesList.innerHTML = html;
  }
}

/**
 * Atualizar totalizadores
 */
function atualizarTotalizadores(cheques) {
  const totais = cheques.reduce((acc, cheque) => {
    acc.total += 1;
    acc.valor += cheque.valor || 0;
    
    if (cheque.status === STATUS_CHEQUE.PENDENTE) {
      acc.pendentes += 1;
    } else if (cheque.status === STATUS_CHEQUE.COMPENSADO) {
      acc.compensados += 1;
    }
    
    return acc;
  }, { total: 0, valor: 0, pendentes: 0, compensados: 0 });
  
  if (totalCount) totalCount.textContent = totais.total;
  if (totalValue) totalValue.textContent = formatarMoeda(totais.valor);
  if (pendingCount) pendingCount.textContent = totais.pendentes;
  if (clearedCount) clearedCount.textContent = totais.compensados;
}

/**
 * Aplicar filtros
 */
function aplicarFiltros() {
  const filtros = {
    status: filtroStatus?.value || '',
    dataInicio: filtroDataInicio?.value || '',
    dataFim: filtroDataFim?.value || '',
    emitente: filtroEmitente?.value.toLowerCase() || ''
  };
  
  const chequesFiltrados = chequesData.filter(cheque => {
    if (filtros.status && cheque.status !== filtros.status) return false;
    if (filtros.emitente && !cheque.emitente.toLowerCase().includes(filtros.emitente)) return false;
    
    const vencimento = new Date(cheque.vencimento);
    if (filtros.dataInicio && vencimento < new Date(filtros.dataInicio)) return false;
    if (filtros.dataFim && vencimento > new Date(filtros.dataFim)) return false;
    
    return true;
  });
  
  renderizarCheques(chequesFiltrados);
  atualizarTotalizadores(chequesFiltrados);
}

/**
 * Limpar filtros
 */
function limparFiltros() {
  if (filtroStatus) filtroStatus.value = '';
  if (filtroDataInicio) filtroDataInicio.value = '';
  if (filtroDataFim) filtroDataFim.value = '';
  if (filtroEmitente) filtroEmitente.value = '';
  
  renderizarCheques(chequesData);
  atualizarTotalizadores(chequesData);
}

/**
 * Abrir modal de ações
 */
function abrirModalAcoes(cheque) {
  chequeAtualModal = cheque;
  
  if (detalheNumero) detalheNumero.textContent = cheque.numero;
  if (detalheEmitente) detalheEmitente.textContent = cheque.emitente;
  if (detalheValor) detalheValor.textContent = formatarMoeda(cheque.valor);
  if (detalheVencimento) detalheVencimento.textContent = formatarData(cheque.vencimento);
  if (detalheStatus) detalheStatus.textContent = STATUS_LABELS[cheque.status] || cheque.status;
  if (detalheOperacao) detalheOperacao.textContent = OPERACAO_LABELS[cheque.tipoOperacao] || cheque.tipoOperacao;
  
  // Definir valor padrão
  if (valorPagamento) {
    valorPagamento.value = formatarMoeda(cheque.totalComJuros);
  }
  
  modalAcoes?.classList.remove('hidden');
}

/**
 * Fechar modal
 */
function fecharModal() {
  modalAcoes?.classList.add('hidden');
  chequeAtualModal = null;
  
  // Limpar campos
  if (valorPagamento) valorPagamento.value = '';
  if (observacoes) observacoes.value = '';
}

/**
 * Processar ação do cheque
 */
async function processarAcao(acao) {
  if (!chequeAtualModal) return;
  
  const valor = extrairValorMonetario(valorPagamento?.value || '');
  const data = dataOperacao?.value || new Date().toISOString().split('T')[0];
  const obs = observacoes?.value || '';
  
  if (acao === 'parcial' && (!valor || valor <= 0)) {
    alert('Informe um valor válido para o pagamento parcial.');
    return;
  }
  
  try {
    let novoStatus = chequeAtualModal.status;
    let valorRestante = chequeAtualModal.valorRestante || chequeAtualModal.valor;
    
    switch (acao) {
      case 'compensar':
        novoStatus = STATUS_CHEQUE.COMPENSADO;
        valorRestante = 0;
        break;
        
      case 'parcial':
        valorRestante = Math.max(0, valorRestante - valor);
        novoStatus = valorRestante > 0 ? STATUS_CHEQUE.PARCIAL : STATUS_CHEQUE.COMPENSADO;
        break;
        
      case 'devolver':
        novoStatus = STATUS_CHEQUE.DEVOLVIDO;
        break;
    }
    
    const dadosAtualizacao = {
      status: novoStatus,
      valorRestante: valorRestante,
      ultimaOperacao: {
        tipo: acao,
        valor: valor || chequeAtualModal.totalComJuros,
        data: data,
        observacoes: obs,
        timestamp: new Date()
      }
    };
    
    const resultado = await atualizarDocumento(COLLECTIONS.CHEQUES, chequeAtualModal.id, dadosAtualizacao);
    
    if (resultado.success) {
      fecharModal();
      await carregarCheques();
      mostrarSucesso(`Cheque ${acao === 'compensar' ? 'compensado' : acao === 'parcial' ? 'parcialmente pago' : 'devolvido'} com sucesso!`);
    } else {
      mostrarErro('Erro ao processar ação. Tente novamente.');
    }
  } catch (error) {
    console.error('Erro ao processar ação:', error);
    mostrarErro('Erro inesperado. Tente novamente.');
  }
}

/**
 * Editar cheque
 */
function editarCheque() {
  if (chequeAtualModal) {
    localStorage.setItem('chequeEditando', JSON.stringify(chequeAtualModal));
    window.location.href = 'incluirCheque.html';
  }
}

/**
 * Exportar para Excel
 */
function exportarExcel() {
  console.log('Exportar para Excel - funcionalidade a ser implementada');
  mostrarSucesso('Funcionalidade de exportação será implementada em breve');
}

/**
 * Exportar para PDF
 */
function exportarPdf() {
  // Implementação futura com biblioteca de PDF
  alert('Funcionalidade de exportação para PDF será implementada em breve.');
}

/**
 * Extrair valor monetário de string formatada
 */
function extrairValorMonetario(str) {
  const numero = str.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(numero) || 0;
}

/**
 * Mostrar/ocultar loading
 */
function mostrarLoading(mostrar) {
  if (loadingElement) {
    if (mostrar) {
      loadingElement.classList.remove('hidden');
    } else {
      loadingElement.classList.add('hidden');
    }
  }
}

/**
 * Mostrar/ocultar estado vazio
 */
function mostrarEstadoVazio(mostrar) {
  const tableSection = document.querySelector('.table-section');
  const summaryCards = document.querySelector('.summary-cards');
  
  if (mostrar) {
    if (chequesList) chequesList.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum cheque encontrado</td></tr>';
    if (summaryCards) summaryCards.style.display = 'none';
  } else {
    if (summaryCards) summaryCards.style.display = 'flex';
  }
}

/**
 * Mostrar mensagem de sucesso
 */
function mostrarSucesso(mensagem) {
  console.log('✅ Sucesso:', mensagem);
  // Implementar toast ou notificação
  alert(mensagem);
}

/**
 * Mostrar mensagem de erro
 */
function mostrarErro(mensagem) {
  console.error('❌ Erro:', mensagem);
  // Implementar toast ou notificação
  alert(mensagem);
}

/**
 * Fechar todos os modais
 */
function fecharModais() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.add('hidden');
  });
}

/**
 * Atualizar ações em lote
 */
function updateBulkActions() {
  const selectedCheckboxes = document.querySelectorAll('input[name="cheque-select"]:checked');
  const bulkActionsBtn = document.getElementById('bulk-actions-btn');
  const selectedCountSpan = document.getElementById('selected-count');
  
  if (bulkActionsBtn) {
    bulkActionsBtn.disabled = selectedCheckboxes.length === 0;
  }
  
  if (selectedCountSpan) {
    selectedCountSpan.textContent = selectedCheckboxes.length;
  }
}

/**
 * Ver detalhes do cheque
 */
function viewDetails(chequeId) {
  const cheque = chequesData.find(c => c.id === chequeId);
  if (!cheque) return;
  
  // Implementar modal de detalhes
  console.log('Ver detalhes:', cheque);
}

/**
 * Editar cheque
 */
function editCheque(chequeId) {
  const cheque = chequesData.find(c => c.id === chequeId);
  if (!cheque) return;
  
  // Redirecionar para página de edição
  window.location.href = `incluirCheque.html?edit=${chequeId}`;
}

/**
 * Excluir cheque
 */
async function deleteCheque(chequeId) {
  const cheque = chequesData.find(c => c.id === chequeId);
  if (!cheque) return;
  
  if (!confirm(`Tem certeza que deseja excluir o cheque ${cheque.numero}?`)) {
    return;
  }
  
  try {
    mostrarLoading(true);
    await deleteDoc(doc(db, 'cheques', chequeId));
    mostrarSucesso('Cheque excluído com sucesso!');
    await carregarCheques(); // Recarregar lista
  } catch (error) {
    console.error('Erro ao excluir cheque:', error);
    mostrarErro('Erro ao excluir cheque: ' + error.message);
  } finally {
    mostrarLoading(false);
  }
}

// Tornar funções globais para uso nos event handlers inline
window.updateBulkActions = updateBulkActions;
window.viewDetails = viewDetails;
window.editCheque = editCheque;
window.deleteCheque = deleteCheque;

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', inicializar); 