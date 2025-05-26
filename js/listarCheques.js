import { auth, onAuthChange } from './auth.js';
import { 
  db, 
  COLLECTIONS, 
  STATUS_CHEQUE, 
  TIPO_OPERACAO, 
  buscarDocumentos, 
  atualizarDocumento, 
  calcularJuros, 
  formatarMoeda, 
  formatarData, 
  calcularDiasEntreDatas, 
  obterEmpresaAtiva 
} from './config.js';
import { where, orderBy } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Elementos DOM
const empresaAtivaDisplay = document.getElementById('empresa-ativa-display');
const filtroStatus = document.getElementById('filtro-status');
const filtroOperacao = document.getElementById('filtro-operacao');
const filtroDataInicio = document.getElementById('filtro-data-inicio');
const filtroDataFim = document.getElementById('filtro-data-fim');
const filtroEmitente = document.getElementById('filtro-emitente');
const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
const btnNovoCheck = document.getElementById('btn-novo-cheque');
const btnExportarExcel = document.getElementById('btn-exportar-excel');
const btnExportarPdf = document.getElementById('btn-exportar-pdf');
const btnPrimeiroCheque = document.getElementById('btn-primeiro-cheque');
const chequesList = document.getElementById('cheques-list');
const loadingElement = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const totalGeral = document.getElementById('total-geral');
const totalReceber = document.getElementById('total-receber');
const totalPagar = document.getElementById('total-pagar');

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
let empresaAtiva = null;

/**
 * Inicializar página
 */
function inicializar() {
  verificarAutenticacao();
  configurarEventListeners();
  aplicarMascaraMonetaria();
  definirDataOperacao();
}

/**
 * Verificar autenticação
 */
function verificarAutenticacao() {
  onAuthChange(async (user) => {
    if (!user) {
      alert('Você precisa estar logado para acessar esta página.');
      window.location.href = 'login.html';
      return;
    }
    
    empresaAtiva = obterEmpresaAtiva();
    if (!empresaAtiva) {
      alert('Nenhuma empresa selecionada. Selecione uma empresa primeiro.');
      window.location.href = 'empresas.html';
      return;
    }
    
    exibirEmpresaAtiva();
    await carregarCheques();
  });
}

/**
 * Exibir empresa ativa no header
 */
function exibirEmpresaAtiva() {
  if (empresaAtiva && empresaAtivaDisplay) {
    empresaAtivaDisplay.textContent = empresaAtiva.nome;
  }
}

/**
 * Configurar event listeners
 */
function configurarEventListeners() {
  btnAplicarFiltros?.addEventListener('click', aplicarFiltros);
  btnLimparFiltros?.addEventListener('click', limparFiltros);
  btnNovoCheck?.addEventListener('click', () => window.location.href = 'incluir-cheque.html');
  btnPrimeiroCheque?.addEventListener('click', () => window.location.href = 'incluir-cheque.html');
  btnExportarExcel?.addEventListener('click', exportarExcel);
  btnExportarPdf?.addEventListener('click', exportarPdf);
  
  // Modal
  modalClose?.addEventListener('click', fecharModal);
  modalAcoes?.addEventListener('click', (e) => {
    if (e.target === modalAcoes) fecharModal();
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
}

/**
 * Aplicar máscara monetária
 */
function aplicarMascaraMonetaria() {
  valorPagamento?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = (value / 100).toFixed(2);
    value = value.replace('.', ',');
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    e.target.value = 'R$ ' + value;
  });
}

/**
 * Definir data padrão para hoje
 */
function definirDataOperacao() {
  if (dataOperacao) {
    dataOperacao.value = new Date().toISOString().split('T')[0];
  }
}

/**
 * Carregar cheques da empresa ativa
 */
async function carregarCheques() {
  if (!empresaAtiva) return;
  
  mostrarLoading(true);
  
  try {
    const filtros = [
      where('empresaId', '==', empresaAtiva.id || empresaAtiva.cnpj),
      orderBy('vencimento', 'desc')
    ];
    
    const resultado = await buscarDocumentos(COLLECTIONS.CHEQUES, filtros);
    
    if (resultado.success) {
      chequesData = resultado.data.map(cheque => ({
        ...cheque,
        jurosCalculados: calcularJurosVencimento(cheque),
        totalComJuros: calcularTotalComJuros(cheque)
      }));
      
      renderizarCheques(chequesData);
      atualizarTotalizadores(chequesData);
    } else {
      console.error('Erro ao carregar cheques:', resultado.error);
      mostrarErro('Erro ao carregar cheques. Tente novamente.');
    }
  } catch (error) {
    console.error('Erro:', error);
    mostrarErro('Erro inesperado ao carregar cheques.');
  }
  
  mostrarLoading(false);
}

/**
 * Calcular juros por vencimento
 */
function calcularJurosVencimento(cheque) {
  if (cheque.status === STATUS_CHEQUE.COMPENSADO) return 0;
  
  const hoje = new Date();
  const vencimento = new Date(cheque.vencimento);
  
  if (hoje <= vencimento) return 0;
  
  const diasAtraso = calcularDiasEntreDatas(vencimento, hoje);
  return calcularJuros(cheque.valor, cheque.taxaJuros || empresaAtiva.taxaJuros, diasAtraso);
}

/**
 * Calcular total com juros
 */
function calcularTotalComJuros(cheque) {
  return cheque.valor + calcularJurosVencimento(cheque);
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
      <td>${cheque.numero}</td>
      <td>${cheque.emitente}</td>
      <td>${formatarMoeda(cheque.valor)}</td>
      <td>${formatarData(cheque.vencimento)}</td>
      <td>
        <span class="status-badge status-${cheque.status}">
          ${STATUS_LABELS[cheque.status] || cheque.status}
        </span>
      </td>
      <td>
        <span class="operacao-badge operacao-${cheque.tipoOperacao}">
          ${OPERACAO_LABELS[cheque.tipoOperacao] || cheque.tipoOperacao}
        </span>
      </td>
      <td class="${cheque.jurosCalculados > 0 ? 'text-warning' : ''}">
        ${formatarMoeda(cheque.jurosCalculados)}
      </td>
      <td class="font-weight-bold">
        ${formatarMoeda(cheque.totalComJuros)}
      </td>
      <td>
        <button class="btn btn-sm" data-action="actions" data-cheque-id="${cheque.id}">
          <i class="fas fa-cog"></i>
        </button>
      </td>
    </tr>
  `).join('');
  
  chequesList.innerHTML = html;
}

/**
 * Atualizar totalizadores
 */
function atualizarTotalizadores(cheques) {
  const totais = cheques.reduce((acc, cheque) => {
    acc.geral += cheque.totalComJuros;
    
    if (cheque.tipoOperacao === TIPO_OPERACAO.RECEBER) {
      acc.receber += cheque.totalComJuros;
    } else {
      acc.pagar += cheque.totalComJuros;
    }
    
    return acc;
  }, { geral: 0, receber: 0, pagar: 0 });
  
  if (totalGeral) totalGeral.textContent = formatarMoeda(totais.geral);
  if (totalReceber) totalReceber.textContent = formatarMoeda(totais.receber);
  if (totalPagar) totalPagar.textContent = formatarMoeda(totais.pagar);
}

/**
 * Aplicar filtros
 */
function aplicarFiltros() {
  const filtros = {
    status: filtroStatus?.value || '',
    operacao: filtroOperacao?.value || '',
    dataInicio: filtroDataInicio?.value || '',
    dataFim: filtroDataFim?.value || '',
    emitente: filtroEmitente?.value.toLowerCase() || ''
  };
  
  const chequesFiltrados = chequesData.filter(cheque => {
    if (filtros.status && cheque.status !== filtros.status) return false;
    if (filtros.operacao && cheque.tipoOperacao !== filtros.operacao) return false;
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
  if (filtroOperacao) filtroOperacao.value = '';
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
    window.location.href = 'incluir-cheque.html';
  }
}

/**
 * Exportar para Excel
 */
function exportarExcel() {
  // Implementação futura com biblioteca de export
  alert('Funcionalidade de exportação para Excel será implementada em breve.');
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
    loadingElement.classList.toggle('hidden', !mostrar);
  }
}

/**
 * Mostrar/ocultar estado vazio
 */
function mostrarEstadoVazio(mostrar) {
  if (emptyState) {
    emptyState.classList.toggle('hidden', !mostrar);
  }
  if (document.querySelector('.cheques-section .table-container')) {
    document.querySelector('.cheques-section .table-container').classList.toggle('hidden', mostrar);
  }
}

/**
 * Mostrar mensagem de sucesso
 */
function mostrarSucesso(mensagem) {
  // Implementação simples - pode ser melhorada com toast/notification
  alert(mensagem);
}

/**
 * Mostrar mensagem de erro
 */
function mostrarErro(mensagem) {
  // Implementação simples - pode ser melhorada com toast/notification
  alert(mensagem);
}

// Labels para exibição
const STATUS_LABELS = {
  [STATUS_CHEQUE.PENDENTE]: 'Pendente',
  [STATUS_CHEQUE.COMPENSADO]: 'Compensado',
  [STATUS_CHEQUE.DEVOLVIDO]: 'Devolvido',
  [STATUS_CHEQUE.PARCIAL]: 'Parcial'
};

const OPERACAO_LABELS = {
  [TIPO_OPERACAO.RECEBER]: 'A Receber',
  [TIPO_OPERACAO.PAGAR]: 'A Pagar'
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', inicializar); 