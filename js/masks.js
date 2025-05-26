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
