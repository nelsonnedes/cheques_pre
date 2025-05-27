// Importações do Firebase
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

import { db, storage } from './config.js';
import { getCurrentUser, checkAuth } from './auth.js';
import { showToast, formatCurrency, parseCurrency, formatDate } from './utils.js';

// Elementos DOM
const form = document.getElementById('cheque-form');
const formTitle = document.getElementById('form-title');
const breadcrumbTitle = document.getElementById('breadcrumb-title');
const empresaDisplay = document.getElementById('empresa-ativa-display');
const taxaEmpresaDisplay = document.getElementById('taxa-empresa-display');
const empresaSelectorGroup = document.getElementById('empresa-selector-group');
const empresaSelecionadaSelect = document.getElementById('empresa-selecionada');

// Campos do formulário
const numeroInput = document.getElementById('numero');
const emitenteInput = document.getElementById('emitente');
const bancoInput = document.getElementById('banco');
const agenciaInput = document.getElementById('agencia');
const contaInput = document.getElementById('conta');
const cpfCnpjInput = document.getElementById('cpf-cnpj');
const valorInput = document.getElementById('valor');
const vencimentoInput = document.getElementById('vencimento');
const dataEmissaoInput = document.getElementById('data-emissao');
const tipoOperacaoInputs = document.querySelectorAll('input[name="tipoOperacao"]');
const taxaJurosInput = document.getElementById('taxa-juros');
const carenciaInput = document.getElementById('carencia');
const imagemInput = document.getElementById('imagem-cheque');
const observacoesInput = document.getElementById('observacoes');

// Upload de imagem
const uploadArea = document.getElementById('upload-area');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const removeImageBtn = document.getElementById('remove-image');

// Botões
const btnSalvar = document.getElementById('btn-salvar');
const btnCancelar = document.getElementById('btn-cancelar');
const btnExcluir = document.getElementById('btn-excluir');

// Variáveis globais
let currentUser = null;
let empresaAtiva = null;
let selectedCompanies = [];
let editingChequeId = null;
let currentImageFile = null;
let currentImageUrl = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await checkAuth();
    currentUser = getCurrentUser();
    
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    await loadSelectedCompanies();
    setupEventListeners();
    setupMasks();
    checkEditMode();
    setDefaultValues();
    
  } catch (error) {
    console.error('Erro na inicialização:', error);
    showToast('Erro ao carregar a página', 'error');
  }
});

// Carregar empresas selecionadas
async function loadSelectedCompanies() {
  try {
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

    if (selectedCompanies.length === 1) {
      // Uma empresa selecionada - usar como empresa ativa
      empresaAtiva = selectedCompanies[0];
      empresaDisplay.textContent = empresaAtiva.nome;
      
      // Exibir taxa padrão da empresa
      const taxaPadrao = empresaAtiva.taxaJuros || 0;
      taxaEmpresaDisplay.textContent = `${taxaPadrao}%`;
      taxaJurosInput.value = taxaPadrao;
      
    } else {
      // Múltiplas empresas - mostrar seletor
      empresaSelectorGroup.style.display = 'block';
      empresaDisplay.textContent = `${selectedCompanies.length} empresas selecionadas`;
      
      // Preencher select com empresas
      empresaSelecionadaSelect.innerHTML = '<option value="">Selecione a empresa</option>';
      selectedCompanies.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa.id;
        option.textContent = empresa.nome;
        option.dataset.taxaJuros = empresa.taxaJuros || 0;
        empresaSelecionadaSelect.appendChild(option);
      });
      
      // Event listener para mudança de empresa
      empresaSelecionadaSelect.addEventListener('change', handleEmpresaChange);
    }
    
  } catch (error) {
    console.error('Erro ao carregar empresas:', error);
    showToast('Erro ao carregar dados das empresas', 'error');
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Formulário
  form.addEventListener('submit', handleSubmit);
  
  // Botões
  btnCancelar.addEventListener('click', handleCancel);
  btnExcluir.addEventListener('click', handleDelete);
  
  // Upload de imagem
  uploadArea.addEventListener('click', () => imagemInput.click());
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('drop', handleDrop);
  imagemInput.addEventListener('change', handleImageSelect);
  removeImageBtn.addEventListener('click', removeImage);
  
  // Validação em tempo real
  numeroInput.addEventListener('blur', validateNumero);
  emitenteInput.addEventListener('blur', validateEmitente);
  valorInput.addEventListener('blur', validateValor);
  vencimentoInput.addEventListener('blur', validateVencimento);
  
  // Tipo de operação
  tipoOperacaoInputs.forEach(input => {
    input.addEventListener('change', handleTipoOperacaoChange);
  });
}

// Configurar máscaras
function setupMasks() {
  // Máscara de CPF/CNPJ será aplicada pelo masks.js
  // Máscara de valor monetário será aplicada pelo masks.js
}

// Verificar modo de edição
function checkEditMode() {
  const urlParams = new URLSearchParams(window.location.search);
  editingChequeId = urlParams.get('id');
  
  if (editingChequeId) {
    formTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Cheque';
    breadcrumbTitle.textContent = 'Editar Cheque';
    btnExcluir.classList.remove('hidden');
    btnSalvar.innerHTML = '<i class="fas fa-save"></i> Atualizar Cheque';
    
    loadChequeData();
  }
}

// Carregar dados do cheque para edição
async function loadChequeData() {
  try {
    form.classList.add('form-loading');
    
    const chequeDoc = await getDoc(doc(db, 'cheques', editingChequeId));
    if (!chequeDoc.exists()) {
      throw new Error('Cheque não encontrado');
    }
    
    const cheque = chequeDoc.data();
    
    // Preencher campos
    numeroInput.value = cheque.numero || '';
    emitenteInput.value = cheque.emitente || '';
    bancoInput.value = cheque.banco || '';
    agenciaInput.value = cheque.agencia || '';
    contaInput.value = cheque.conta || '';
    cpfCnpjInput.value = cheque.cpfCnpj || '';
    valorInput.value = formatCurrency(cheque.valor || 0);
    
    if (cheque.vencimento) {
      vencimentoInput.value = formatDate(cheque.vencimento.toDate(), 'yyyy-MM-dd');
    }
    
    if (cheque.dataEmissao) {
      dataEmissaoInput.value = formatDate(cheque.dataEmissao.toDate(), 'yyyy-MM-dd');
    }
    
    // Tipo de operação
    const tipoOperacao = cheque.tipoOperacao || 'receber';
    document.getElementById(`operacao-${tipoOperacao}`).checked = true;
    
    taxaJurosInput.value = cheque.taxaJuros || '';
    carenciaInput.value = cheque.carencia || 0;
    observacoesInput.value = cheque.observacoes || '';
    
    // Imagem
    if (cheque.imagemUrl) {
      currentImageUrl = cheque.imagemUrl;
      showImagePreview(cheque.imagemUrl);
    }
    
  } catch (error) {
    console.error('Erro ao carregar cheque:', error);
    showToast('Erro ao carregar dados do cheque', 'error');
  } finally {
    form.classList.remove('form-loading');
  }
}

// Definir valores padrão
function setDefaultValues() {
  if (!editingChequeId) {
    // Data de emissão padrão: hoje
    const hoje = new Date().toISOString().split('T')[0];
    dataEmissaoInput.value = hoje;
    
    // Data de vencimento padrão: 30 dias a partir de hoje
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 30);
    vencimentoInput.value = vencimento.toISOString().split('T')[0];
  }
}

// Manipular envio do formulário
async function handleSubmit(e) {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  try {
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    const chequeData = await buildChequeData();
    
    if (editingChequeId) {
      await updateCheque(editingChequeId, chequeData);
      showToast('Cheque atualizado com sucesso!', 'success');
    } else {
      await createCheque(chequeData);
      showToast('Cheque criado com sucesso!', 'success');
    }
    
    // Redirecionar para listagem
    setTimeout(() => {
      window.location.href = 'listar-cheques.html';
    }, 1500);
    
  } catch (error) {
    console.error('Erro ao salvar cheque:', error);
    showToast('Erro ao salvar cheque: ' + error.message, 'error');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = editingChequeId ? 
      '<i class="fas fa-save"></i> Atualizar Cheque' : 
      '<i class="fas fa-save"></i> Salvar Cheque';
  }
}

// Construir dados do cheque
async function buildChequeData() {
  const tipoOperacao = document.querySelector('input[name="tipoOperacao"]:checked').value;
  
  const chequeData = {
    numero: numeroInput.value.trim(),
    emitente: emitenteInput.value.trim(),
    banco: bancoInput.value.trim(),
    agencia: agenciaInput.value.trim(),
    conta: contaInput.value.trim(),
    cpfCnpj: cpfCnpjInput.value.trim(),
    valor: parseCurrency(valorInput.value),
    vencimento: new Date(vencimentoInput.value),
    dataEmissao: dataEmissaoInput.value ? new Date(dataEmissaoInput.value) : null,
    tipoOperacao,
    taxaJuros: parseFloat(taxaJurosInput.value) || 0,
    carencia: parseInt(carenciaInput.value) || 0,
    observacoes: observacoesInput.value.trim(),
    empresaId: empresaAtiva.id,
    empresaNome: empresaAtiva.nome,
    status: 'pendente',
    updatedAt: serverTimestamp()
  };
  
  // Upload da imagem se houver
  if (currentImageFile) {
    chequeData.imagemUrl = await uploadImage(currentImageFile);
  } else if (currentImageUrl) {
    chequeData.imagemUrl = currentImageUrl;
  }
  
  // Adicionar campos específicos para novo cheque
  if (!editingChequeId) {
    chequeData.createdAt = serverTimestamp();
    chequeData.userId = currentUser.uid;
  }
  
  return chequeData;
}

// Criar novo cheque
async function createCheque(chequeData) {
  // Verificar se número já existe
  const existingQuery = query(
    collection(db, 'cheques'),
    where('numero', '==', chequeData.numero),
    where('empresaId', '==', empresaAtiva.id)
  );
  
  const existingDocs = await getDocs(existingQuery);
  if (!existingDocs.empty) {
    throw new Error('Já existe um cheque com este número nesta empresa');
  }
  
  await addDoc(collection(db, 'cheques'), chequeData);
}

// Atualizar cheque existente
async function updateCheque(chequeId, chequeData) {
  // Verificar se número já existe em outro cheque
  const existingQuery = query(
    collection(db, 'cheques'),
    where('numero', '==', chequeData.numero),
    where('empresaId', '==', empresaAtiva.id)
  );
  
  const existingDocs = await getDocs(existingQuery);
  const conflictingDoc = existingDocs.docs.find(doc => doc.id !== chequeId);
  
  if (conflictingDoc) {
    throw new Error('Já existe outro cheque com este número nesta empresa');
  }
  
  await updateDoc(doc(db, 'cheques', chequeId), chequeData);
}

// Upload de imagem
async function uploadImage(file) {
  const fileName = `cheques/${empresaAtiva.id}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, fileName);
  
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

// Validar formulário
function validateForm() {
  let isValid = true;
  
  // Limpar erros anteriores
  clearValidationErrors();
  
  // Validar empresa (quando múltiplas estão selecionadas)
  if (selectedCompanies.length > 1 && !empresaSelecionadaSelect.value) {
    showFieldError(empresaSelecionadaSelect, 'Selecione a empresa para este cheque');
    isValid = false;
  }
  
  // Validar se há empresa ativa
  if (!empresaAtiva) {
    showToast('Selecione uma empresa antes de continuar', 'warning');
    isValid = false;
  }
  
  // Validar campos obrigatórios
  if (!numeroInput.value.trim()) {
    showFieldError(numeroInput, 'Número do cheque é obrigatório');
    isValid = false;
  }
  
  if (!emitenteInput.value.trim()) {
    showFieldError(emitenteInput, 'Nome do emitente é obrigatório');
    isValid = false;
  }
  
  if (!valorInput.value.trim() || parseCurrency(valorInput.value) <= 0) {
    showFieldError(valorInput, 'Valor deve ser maior que zero');
    isValid = false;
  }
  
  if (!vencimentoInput.value) {
    showFieldError(vencimentoInput, 'Data de vencimento é obrigatória');
    isValid = false;
  }
  
  // Validar data de vencimento
  if (vencimentoInput.value) {
    const vencimento = new Date(vencimentoInput.value);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (vencimento < hoje) {
      showFieldError(vencimentoInput, 'Data de vencimento não pode ser anterior a hoje');
      isValid = false;
    }
  }
  
  // Validar taxa de juros
  const taxaJuros = parseFloat(taxaJurosInput.value);
  if (taxaJuros < 0 || taxaJuros > 100) {
    showFieldError(taxaJurosInput, 'Taxa de juros deve estar entre 0% e 100%');
    isValid = false;
  }
  
  return isValid;
}

// Validações individuais
function validateNumero() {
  const numero = numeroInput.value.trim();
  if (!numero) {
    showFieldError(numeroInput, 'Número do cheque é obrigatório');
    return false;
  }
  clearFieldError(numeroInput);
  return true;
}

function validateEmitente() {
  const emitente = emitenteInput.value.trim();
  if (!emitente) {
    showFieldError(emitenteInput, 'Nome do emitente é obrigatório');
    return false;
  }
  clearFieldError(emitenteInput);
  return true;
}

function validateValor() {
  const valor = parseCurrency(valorInput.value);
  if (!valor || valor <= 0) {
    showFieldError(valorInput, 'Valor deve ser maior que zero');
    return false;
  }
  clearFieldError(valorInput);
  return true;
}

function validateVencimento() {
  if (!vencimentoInput.value) {
    showFieldError(vencimentoInput, 'Data de vencimento é obrigatória');
    return false;
  }
  
  const vencimento = new Date(vencimentoInput.value);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  if (vencimento < hoje) {
    showFieldError(vencimentoInput, 'Data de vencimento não pode ser anterior a hoje');
    return false;
  }
  
  clearFieldError(vencimentoInput);
  return true;
}

// Mostrar erro de campo
function showFieldError(field, message) {
  field.classList.add('error');
  
  // Remover mensagem de erro anterior
  const existingError = field.parentNode.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  // Adicionar nova mensagem de erro
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  field.parentNode.appendChild(errorDiv);
}

// Limpar erro de campo
function clearFieldError(field) {
  field.classList.remove('error');
  const errorMessage = field.parentNode.querySelector('.error-message');
  if (errorMessage) {
    errorMessage.remove();
  }
}

// Limpar todos os erros de validação
function clearValidationErrors() {
  const errorFields = document.querySelectorAll('.error');
  errorFields.forEach(field => field.classList.remove('error'));
  
  const errorMessages = document.querySelectorAll('.error-message');
  errorMessages.forEach(message => message.remove());
}

// Manipular mudança de tipo de operação
function handleTipoOperacaoChange() {
  // Aqui podemos adicionar lógica específica para cada tipo de operação
  // Por exemplo, ajustar a taxa de juros padrão
}

// Manipular upload de imagem
function handleImageSelect(e) {
  const file = e.target.files[0];
  if (file) {
    processImageFile(file);
  }
}

function handleDragOver(e) {
  e.preventDefault();
  uploadArea.classList.add('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processImageFile(files[0]);
  }
}

function processImageFile(file) {
  // Validar tipo de arquivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Tipo de arquivo não suportado. Use JPG, PNG, GIF ou PDF.', 'error');
    return;
  }
  
  // Validar tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Arquivo muito grande. Máximo 5MB.', 'error');
    return;
  }
  
  currentImageFile = file;
  
  // Mostrar preview para imagens
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      showImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    // Para PDFs, mostrar ícone
    showImagePreview(null, file.name);
  }
}

function showImagePreview(src, fileName = null) {
  if (src) {
    previewImage.src = src;
    previewImage.style.display = 'block';
  } else {
    previewImage.style.display = 'none';
  }
  
  if (fileName) {
    // Mostrar nome do arquivo PDF
    let fileNameDiv = previewContainer.querySelector('.file-name');
    if (!fileNameDiv) {
      fileNameDiv = document.createElement('div');
      fileNameDiv.className = 'file-name';
      previewContainer.appendChild(fileNameDiv);
    }
    fileNameDiv.textContent = fileName;
  }
  
  previewContainer.classList.remove('hidden');
  uploadArea.style.display = 'none';
}

function removeImage() {
  currentImageFile = null;
  currentImageUrl = null;
  previewContainer.classList.add('hidden');
  uploadArea.style.display = 'block';
  imagemInput.value = '';
  
  // Remover nome do arquivo se existir
  const fileNameDiv = previewContainer.querySelector('.file-name');
  if (fileNameDiv) {
    fileNameDiv.remove();
  }
}

// Manipular cancelamento
function handleCancel() {
  if (confirm('Tem certeza que deseja cancelar? Todas as alterações serão perdidas.')) {
    window.location.href = 'listar-cheques.html';
  }
}

// Manipular exclusão
async function handleDelete() {
  if (!editingChequeId) return;
  
  const confirmMessage = 'Tem certeza que deseja excluir este cheque? Esta ação não pode ser desfeita.';
  if (!confirm(confirmMessage)) return;
  
  try {
    btnExcluir.disabled = true;
    btnExcluir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
    
    // Excluir imagem do storage se existir
    if (currentImageUrl) {
      try {
        const imageRef = ref(storage, currentImageUrl);
        await deleteObject(imageRef);
      } catch (error) {
        console.warn('Erro ao excluir imagem:', error);
      }
    }
    
    // Excluir documento
    await deleteDoc(doc(db, 'cheques', editingChequeId));
    
    showToast('Cheque excluído com sucesso!', 'success');
    
    setTimeout(() => {
      window.location.href = 'listar-cheques.html';
    }, 1500);
    
  } catch (error) {
    console.error('Erro ao excluir cheque:', error);
    showToast('Erro ao excluir cheque: ' + error.message, 'error');
  } finally {
    btnExcluir.disabled = false;
    btnExcluir.innerHTML = '<i class="fas fa-trash"></i> Excluir';
  }
}

// Manipular mudança de empresa selecionada
function handleEmpresaChange() {
  const selectedEmpresaId = empresaSelecionadaSelect.value;
  
  if (selectedEmpresaId) {
    empresaAtiva = selectedCompanies.find(empresa => empresa.id === selectedEmpresaId);
    
    if (empresaAtiva) {
      const taxaPadrao = empresaAtiva.taxaJuros || 0;
      taxaEmpresaDisplay.textContent = `${taxaPadrao}%`;
      taxaJurosInput.value = taxaPadrao;
    }
  } else {
    empresaAtiva = null;
    taxaEmpresaDisplay.textContent = '0%';
    taxaJurosInput.value = '';
  }
} 