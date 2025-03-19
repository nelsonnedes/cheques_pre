// Formata um valor para moeda brasileira
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Formata CPF (###.###.###-##) ou CNPJ (##.###.###/####-##)
export function formatCPFCNPJ(value) {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        return numbers
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
}

// Formata número de telefone ((##) ####-#### ou (##) #####-####)
export function formatPhone(value) {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length === 11) {
        return numbers
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2');
    } else {
        return numbers
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }
}

// Formata uma data para o padrão brasileiro (dd/mm/yyyy)
export function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(date);
}

// Formata uma data para o formato ISO (yyyy-mm-dd)
export function formatDateISO(date) {
    return date.toISOString().split('T')[0];
}

// Valida CPF
export function validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

// Valida CNPJ
export function validateCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    
    if (cnpj.length !== 14) return false;
    
    if (/^(\d)\1+$/.test(cnpj)) return false;
    
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
}

// Gera um ID único
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Calcula a diferença entre duas datas em dias
export function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
}

// Retorna o status formatado do cheque
export function formatStatus(status) {
    const statusMap = {
        pendente: 'Pendente',
        compensado: 'Compensado',
        devolvido: 'Devolvido',
        cancelado: 'Cancelado'
    };
    return statusMap[status] || status;
}

// Retorna a classe CSS para o status do cheque
export function getStatusClass(status) {
    const classMap = {
        pendente: 'warning',
        compensado: 'success',
        devolvido: 'danger',
        cancelado: 'secondary'
    };
    return classMap[status] || 'default';
}

// Formata um número de cheque (adiciona zeros à esquerda)
export function formatChequeNumber(number, length = 6) {
    return String(number).padStart(length, '0');
}

// Valida um endereço de e-mail
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Formata um valor numérico com separador de milhares
export function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(value);
}

// Converte uma string de data brasileira para objeto Date
export function parseDate(dateString) {
    const [day, month, year] = dateString.split('/');
    return new Date(year, month - 1, day);
}

// Retorna o nome do mês em português
export function getMonthName(month) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month];
}

// Retorna o nome do dia da semana em português
export function getWeekdayName(day) {
    const weekdays = [
        'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
        'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];
    return weekdays[day];
}

// Formata bytes para uma string legível (KB, MB, GB)
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remove acentos de uma string
export function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Gera uma cor aleatória em formato hexadecimal
export function randomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

// Trunca um texto com reticências
export function truncateText(text, length = 50) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

// Formata um número de agência/conta bancária
export function formatBankAccount(agency, account) {
    return `${agency}-${account}`;
}

// Valida uma senha forte
export function validateStrongPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength &&
           hasUpperCase &&
           hasLowerCase &&
           hasNumbers &&
           hasSpecialChars;
}

// Retorna o tempo decorrido em formato legível
export function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + ' anos atrás';
    }
    
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + ' meses atrás';
    }
    
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + ' dias atrás';
    }
    
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + ' horas atrás';
    }
    
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + ' minutos atrás';
    }
    
    return Math.floor(seconds) + ' segundos atrás';
} 