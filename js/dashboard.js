/* js/dashboard.js */

const totalChequesElem = document.getElementById('total-cheques');
const chequesPendentesElem = document.getElementById('cheques-pendentes');
const chequesCompensadosElem = document.getElementById('cheques-compensados');
const recentChequesBody = document.getElementById('recent-cheques-body');

let chartStatus = null;

// Utilitário para formatar moeda pt-BR
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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

// Inicializa eventos da página
function initDashboard() {
  atualizarDashboard();

  const profileBtn = document.getElementById('profile-btn');
  const profileDropdown = document.getElementById('profile-dropdown');

  profileBtn.addEventListener('click', () => {
    profileDropdown.classList.toggle('hidden');
  });

  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', () => {
    alert('Logout ainda não implementado.');
  });
}


import { protegerRota } from './routeGuard.js';

window.addEventListener('DOMContentLoaded', () => {
  protegerRota();
  initDashboard();
});