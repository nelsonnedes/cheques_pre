// Funções utilitárias para o sistema
import { auth, db } from './config.js';

// Formatação de valores
export function formatCurrency(value) {
  if (!value && value !== 0) return 'R$ 0,00';
  
  const numValue = typeof value === 'string' ? 
    parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) : value;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue || 0);
}

// Parse de valor monetário
export function parseCurrency(value) {
  if (!value) return 0;
  return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
}

// Formatação de data
export function formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'MM/yyyy':
      return `${month}/${year}`;
    default:
      return d.toLocaleDateString('pt-BR');
  }
}

// Parse de data
export function parseDate(dateString) {
  if (!dateString) return null;
  
  // Se já é um objeto Date
  if (dateString instanceof Date) return dateString;
  
  // Se é timestamp do Firestore
  if (dateString.seconds) {
    return new Date(dateString.seconds * 1000);
  }
  
  // Se é string no formato ISO ou brasileiro
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

// Validação de CPF
export function validateCPF(cpf) {
  if (!cpf) return false;
  
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  
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

// Validação de CNPJ
export function validateCNPJ(cnpj) {
  if (!cnpj) return false;
  
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  let digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  
  return result === parseInt(digits.charAt(1));
}

// Validação de email
export function validateEmail(email) {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Debounce para otimizar buscas
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle para otimizar eventos
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Gerar ID único
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Capitalizar primeira letra
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Truncar texto
export function truncate(str, length = 50) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Remover acentos
export function removeAccents(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Sanitizar string para busca
export function sanitizeSearch(str) {
  if (!str) return '';
  return removeAccents(str.toLowerCase().trim());
}

// Calcular diferença em dias
export function daysDifference(date1, date2) {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) return 0;
  
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Verificar se data está vencida
export function isOverdue(date) {
  const d = parseDate(date);
  if (!d) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  
  return d < today;
}

// Calcular juros simples
export function calculateSimpleInterest(principal, rate, days) {
  if (!principal || !rate || !days) return 0;
  return (principal * rate * days) / 100;
}

// Calcular juros compostos
export function calculateCompoundInterest(principal, rate, days) {
  if (!principal || !rate || !days) return 0;
  const dailyRate = rate / 100 / 30; // Taxa diária
  return principal * Math.pow(1 + dailyRate, days) - principal;
}

// Exportar dados para CSV
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || !data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Exportar dados para JSON
export function exportToJSON(data, filename = 'export.json') {
  if (!data) return;
  
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Copiar texto para clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback para navegadores mais antigos
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

// Detectar dispositivo móvel
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Detectar modo escuro
export function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Scroll suave para elemento
export function scrollToElement(element, offset = 0) {
  if (!element) return;
  
  const elementPosition = element.offsetTop - offset;
  window.scrollTo({
    top: elementPosition,
    behavior: 'smooth'
  });
}

// Aguardar tempo específico
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry com backoff exponencial
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
}

// Verificar conexão com internet
export function isOnline() {
  return navigator.onLine;
}

// Monitorar conexão
export function onConnectionChange(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}

// Comprimir imagem
export function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Validar arquivo
export function validateFile(file, maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) {
  const errors = [];
  
  if (file.size > maxSize) {
    errors.push(`Arquivo muito grande. Máximo: ${formatFileSize(maxSize)}`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Tipo de arquivo não permitido. Permitidos: ${allowedTypes.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Formatar tamanho de arquivo
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Gerar cores aleatórias
export function generateRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Obter iniciais do nome
export function getInitials(name) {
  if (!name) return '';
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// Verificar se é fim de semana
export function isWeekend(date) {
  const d = parseDate(date);
  if (!d) return false;
  const day = d.getDay();
  return day === 0 || day === 6; // Domingo ou Sábado
}

// Próximo dia útil
export function getNextBusinessDay(date) {
  const d = parseDate(date);
  if (!d) return null;
  
  const nextDay = new Date(d);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (isWeekend(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

// Exportar todas as funções como default
export default {
  formatCurrency,
  parseCurrency,
  formatDate,
  parseDate,
  validateCPF,
  validateCNPJ,
  validateEmail,
  debounce,
  throttle,
  generateId,
  capitalize,
  truncate,
  removeAccents,
  sanitizeSearch,
  daysDifference,
  isOverdue,
  calculateSimpleInterest,
  calculateCompoundInterest,
  exportToCSV,
  exportToJSON,
  copyToClipboard,
  isMobile,
  isDarkMode,
  scrollToElement,
  sleep,
  retryWithBackoff,
  isOnline,
  onConnectionChange,
  compressImage,
  validateFile,
  formatFileSize,
  generateRandomColor,
  getInitials,
  isWeekend,
  getNextBusinessDay
}; 