import { auth } from './auth.js';

/**
 * Manipulação da página de empresas: listagem, cadastro, seleção de empresa ativa.
 * Agora integrando com Firebase Auth para associar `createdBy`.
 */

const empresaListElement = document.getElementById('empresa-list');
const formSection = document.getElementById('form-empresa-section');
const empresaForm = document.getElementById('empresa-form');
const btnAddEmpresa = document.getElementById('btn-add-empresa');
const btnCancel = document.getElementById('btn-cancel');
const formTitle = document.getElementById('form-empresa-title');

/**
 * Lista simulada empresas - substituir por fetch Firestore
 * @returns {Array} array de empresas
 */
function buscarEmpresasSimulado() {
  const dados = localStorage.getItem('empresas');
  if (!dados) return [];
  try {
    return JSON.parse(dados);
  } catch {
    return [];
  }
}

/**
 * Salvar empresas localStorage simulado
 * @param {Array} empresas
 */
function salvarEmpresasSimulado(empresas) {
  localStorage.setItem('empresas', JSON.stringify(empresas));
}

/**
 * Renderiza a tabela de empresas
 * @param {Array} empresas
 */
function renderizarEmpresas(empresas) {
  empresaListElement.innerHTML = '';

  if (empresas.length === 0) {
    empresaListElement.innerHTML = '<tr><td colspan="4">Nenhuma empresa cadastrada.</td></tr>';
    return;
  }

  empresas.forEach((empresa, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${empresa.nome}</td>
      <td>${empresa.cnpj}</td>
      <td>${parseFloat(empresa.taxaJuros).toFixed(2)}%</td>
      <td>
        <button data-index="${index}" class="btn btn-select">Selecionar</button>
        <button data-index="${index}" class="btn btn-edit">Editar</button>
        <button data-index="${index}" class="btn btn-delete">Excluir</button>
      </td>
    `;
    empresaListElement.appendChild(tr);
  });
}

/**
 * Validação simples do formulário de empresa
 * @param {Object} dados
 * @returns {string|null} mensagem de erro ou null
 */
function validarDadosEmpresa(dados) {
  if (!dados.nome.trim()) return 'Nome é obrigatório.';
  if (!dados.cnpj.trim()) return 'CNPJ é obrigatório.';
  if (dados.cnpj.replace(/\D/g, '').length !== 14) return 'CNPJ inválido.';
  if (isNaN(dados.taxaJuros) || dados.taxaJuros < 0) return 'Taxa de juros inválida.';
  return null;
}

/**
 * Manipula envio do form empresa - adicionar ou editar
 * @param {Event} e
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!auth.currentUser) {
    alert('Usuário não autenticado, faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  const formData = new FormData(empresaForm);
  const nome = formData.get('nome').trim();
  const cnpj = formData.get('cnpj').trim();
  const taxaJuros = parseFloat(formData.get('taxa-juros').replace(',', '.')) || 0;

  const novoDado = { nome, cnpj, taxaJuros, createdBy: auth.currentUser.uid };

  const erro = validarDadosEmpresa(novoDado);
  if (erro) {
    alert(erro);
    return;
  }

  let empresas = buscarEmpresasSimulado();

  if (empresaForm.dataset.editIndex !== undefined) {
    const idx = parseInt(empresaForm.dataset.editIndex, 10);
    empresas[idx] = novoDado;
    delete empresaForm.dataset.editIndex;
  } else {
    empresas.push(novoDado);
  }

  salvarEmpresasSimulado(empresas);
  renderizarEmpresas(empresas);
  esconderFormulario();
}

function mostrarFormulario(empresa = null, index = null) {
  formSection.classList.remove('hidden');
  if (empresa) {
    formTitle.textContent = 'Editar Empresa';
    empresaForm.nome.value = empresa.nome;
    empresaForm.cnpj.value = empresa.cnpj;
    empresaForm['taxa-juros'].value = empresa.taxaJuros;
    empresaForm.dataset.editIndex = index;
  } else {
    formTitle.textContent = 'Nova Empresa';
    empresaForm.reset();
    delete empresaForm.dataset.editIndex;
  }
  btnAddEmpresa.disabled = true;
}

function esconderFormulario() {
  formSection.classList.add('hidden');
  btnAddEmpresa.disabled = false;
  empresaForm.reset();
  delete empresaForm.dataset.editIndex;
}

function handleEdit(e) {
  if (!e.target.classList.contains('btn-edit')) return;
  const idx = parseInt(e.target.dataset.index, 10);
  const empresas = buscarEmpresasSimulado();
  mostrarFormulario(empresas[idx], idx);
}

function handleDelete(e) {
  if (!e.target.classList.contains('btn-delete')) return;
  const idx = parseInt(e.target.dataset.index, 10);
  let empresas = buscarEmpresasSimulado();
  if (confirm(`Confirma a exclusão da empresa ${empresas[idx].nome}?`)) {
    empresas.splice(idx, 1);
    salvarEmpresasSimulado(empresas);
    renderizarEmpresas(empresas);

    const empresaAtiva = localStorage.getItem('empresaAtiva');
    if (empresaAtiva) {
      const ativa = JSON.parse(empresaAtiva);
      if (ativa.cnpj === empresas[idx]?.cnpj) {
        localStorage.removeItem('empresaAtiva');
      }
    }
  }
}

function handleSelect(e) {
  if (!e.target.classList.contains('btn-select')) return;
  const idx = parseInt(e.target.dataset.index, 10);
  const empresas = buscarEmpresasSimulado();
  const empresaSelecionada = empresas[idx];
  if (empresaSelecionada) {
    localStorage.setItem('empresaAtiva', JSON.stringify(empresaSelecionada));
    alert(`Empresa "${empresaSelecionada.nome}" selecionada.`);
  }
}

function initEmpresas() {
  btnAddEmpresa.addEventListener('click', () => mostrarFormulario());
  btnCancel.addEventListener('click', esconderFormulario);
  empresaForm.addEventListener('submit', handleFormSubmit);
  empresaListElement.addEventListener('click', e => {
    handleEdit(e);
    handleDelete(e);
    handleSelect(e);
  });
  const empresas = buscarEmpresasSimulado();
  renderizarEmpresas(empresas);
}

window.addEventListener('DOMContentLoaded', initEmpresas);
