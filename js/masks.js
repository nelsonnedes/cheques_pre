/* js/masks.js */

/**
 * Mascara para campos de data no formato DD/MM/YYYY
 * Uso: adicionar evento input nos inputs desejados
 * @param {HTMLInputElement} input
 */
function mascaraData(input) {
  input.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    let parts = [];
    if (v.length > 2) {
      parts.push(v.slice(0, 2));
      if (v.length > 4) {
        parts.push(v.slice(2, 4));
        parts.push(v.slice(4));
      } else {
        parts.push(v.slice(2));
      }
    } else {
      parts.push(v);
    }
    e.target.value = parts.join('/');
  });
}

/**
 * Mascara para campo horário HH:MM 24h
 * @param {HTMLInputElement} input
 */
function mascaraHora(input) {
  input.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 4) v = v.slice(0, 4);
    let parts = [];
    if (v.length > 2) {
      parts.push(v.slice(0, 2));
      parts.push(v.slice(2));
    } else {
      parts.push(v);
    }
    e.target.value = parts.join(':');
  });
}

/**
 * Mascara para campo moeda em R$ pt-BR
 * Formato: R$ 1.234,56
 * @param {HTMLInputElement} input
 */
function mascaraMoeda(input) {
  input.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '');
    if (v === '') {
      e.target.value = '';
      return;
    }
    v = (parseInt(v) / 100).toFixed(2);
    let parts = v.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    e.target.value = 'R$ ' + parts.join(',');
  });
}

/**
 * Mascara adaptativa para CPF ou CNPJ
 * @param {HTMLInputElement} input
 */
function mascaraCpfCnpj(input) {
  input.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length <= 11) {
      // CPF 000.000.000-00
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ 00.000.000/0000-00
      v = v.replace(/(\d{2})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1/$2');
      v = v.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    e.target.value = v;
  });
}

// Export functions for usage in other scripts if needed
if (typeof exports !== 'undefined') {
  exports.mascaraData = mascaraData;
  exports.mascaraHora = mascaraHora;
  exports.mascaraMoeda = mascaraMoeda;
  exports.mascaraCpfCnpj = mascaraCpfCnpj;
}

// Máscaras para formatação de campos
document.addEventListener('DOMContentLoaded', () => {
  setupMasks();
});

function setupMasks() {
  // Máscara para valores monetários
  const moneyInputs = document.querySelectorAll('.money-mask, input[name="valor"]');
  moneyInputs.forEach(input => {
    input.addEventListener('input', applyMoneyMask);
    input.addEventListener('blur', formatMoneyOnBlur);
  });

  // Máscara para CPF/CNPJ
  const cpfCnpjInputs = document.querySelectorAll('.cpf-cnpj-mask, input[name="cpfCnpj"]');
  cpfCnpjInputs.forEach(input => {
    input.addEventListener('input', applyCpfCnpjMask);
  });

  // Máscara para telefone
  const phoneInputs = document.querySelectorAll('.phone-mask, input[name="telefone"]');
  phoneInputs.forEach(input => {
    input.addEventListener('input', applyPhoneMask);
  });

  // Máscara para CEP
  const cepInputs = document.querySelectorAll('.cep-mask, input[name="cep"]');
  cepInputs.forEach(input => {
    input.addEventListener('input', applyCepMask);
  });

  // Máscara para números apenas
  const numberInputs = document.querySelectorAll('.number-only');
  numberInputs.forEach(input => {
    input.addEventListener('input', applyNumberOnlyMask);
  });
}

// Máscara para valores monetários
function applyMoneyMask(e) {
  let value = e.target.value;
  
  // Remove tudo que não é dígito
  value = value.replace(/\D/g, '');
  
  // Converte para centavos
  value = (parseInt(value) / 100).toFixed(2);
  
  // Formata como moeda
  value = value.replace('.', ',');
  value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  
  // Adiciona o símbolo R$
  e.target.value = value ? `R$ ${value}` : '';
}

function formatMoneyOnBlur(e) {
  let value = e.target.value;
  
  if (!value || value === 'R$ ') {
    e.target.value = '';
    return;
  }
  
  // Remove R$ e espaços
  value = value.replace(/R\$\s?/g, '');
  
  // Remove pontos de milhares
  value = value.replace(/\./g, '');
  
  // Substitui vírgula por ponto
  value = value.replace(',', '.');
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    e.target.value = '';
    return;
  }
  
  // Formata novamente
  const formatted = numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  
  e.target.value = formatted;
}

// Máscara para CPF/CNPJ
function applyCpfCnpjMask(e) {
  let value = e.target.value;
  
  // Remove tudo que não é dígito
  value = value.replace(/\D/g, '');
  
  if (value.length <= 11) {
    // CPF: 000.000.000-00
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
  }
  
  e.target.value = value;
}

// Máscara para telefone
function applyPhoneMask(e) {
  let value = e.target.value;
  
  // Remove tudo que não é dígito
  value = value.replace(/\D/g, '');
  
  if (value.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    value = value.replace(/^(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    // Celular: (00) 00000-0000
    value = value.replace(/^(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
  }
  
  e.target.value = value;
}

// Máscara para CEP
function applyCepMask(e) {
  let value = e.target.value;
  
  // Remove tudo que não é dígito
  value = value.replace(/\D/g, '');
  
  // Aplica máscara: 00000-000
  value = value.replace(/^(\d{5})(\d)/, '$1-$2');
  
  e.target.value = value;
}

// Máscara para apenas números
function applyNumberOnlyMask(e) {
  let value = e.target.value;
  
  // Remove tudo que não é dígito
  value = value.replace(/\D/g, '');
  
  e.target.value = value;
}

// Funções utilitárias para conversão
export function parseCurrency(value) {
  if (!value) return 0;
  
  // Remove R$, espaços e pontos de milhares
  let cleanValue = value.toString()
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(cleanValue) || 0;
}

export function formatCurrency(value) {
  if (!value && value !== 0) return '';
  
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function formatCurrencyInput(value) {
  if (!value && value !== 0) return '';
  
  const numValue = typeof value === 'string' ? parseCurrency(value) : value;
  
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Validações
export function isValidCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  return remainder === parseInt(cpf.charAt(10));
}

export function isValidCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights1[i];
  }
  
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(cnpj.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights2[i];
  }
  
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return digit2 === parseInt(cnpj.charAt(13));
}

export function isValidCpfCnpj(value) {
  if (!value) return true; // Campo opcional
  
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length === 11) {
    return isValidCPF(cleanValue);
  } else if (cleanValue.length === 14) {
    return isValidCNPJ(cleanValue);
  }
  
  return false;
}

// Formatação de datas
export function formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'MM/dd/yyyy':
      return `${month}/${day}/${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

// Formatação de números
export function formatNumber(value, decimals = 0) {
  if (!value && value !== 0) return '';
  
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Formatação de porcentagem
export function formatPercentage(value, decimals = 2) {
  if (!value && value !== 0) return '';
  
  return value.toLocaleString('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
