// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    updateProfile 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD-KfA6ZwWJ9E_rl6QjytrDSzWboiWeIos",
    authDomain: "dbcheques.firebaseapp.com",
    projectId: "dbcheques",
    storageBucket: "dbcheques.firebasestorage.app",
    messagingSenderId: "417151486713",
    appId: "1:417151486713:web:036af07778be521d447028"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// DOM elements
const registerForm = document.getElementById('register-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const cpfInput = document.getElementById('cpf');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const termsCheckbox = document.getElementById('terms');
const registerBtn = document.getElementById('register-btn');
const googleBtn = document.getElementById('google-btn');
const passwordToggle = document.getElementById('password-toggle');
const confirmPasswordToggle = document.getElementById('confirm-password-toggle');
const successMessage = document.getElementById('success-message');

// Validation functions
function validateName(name) {
    return name.trim().length >= 3 && /^[a-zA-ZÀ-ÿ\s]+$/.test(name);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
}

function validateCPF(cpf) {
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(cpf)) return false;
    
    // Remove formatting
    const numbers = cpf.replace(/\D/g, '');
    
    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(numbers)) return false;
    
    // Validate CPF algorithm
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(numbers[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(numbers[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return digit1 === parseInt(numbers[9]) && digit2 === parseInt(numbers[10]);
}

function validatePassword(password) {
    return password.length >= 6 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /\d/.test(password);
}

// Utility functions
function showLoading(show = true) {
    registerBtn.disabled = show;
    registerBtn.classList.toggle('loading', show);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <svg class="lucide lucide-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>' : 
                  type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : 
                  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    const successElement = document.getElementById(`${fieldId}-success`);
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = message ? 'block' : 'none';
    }
    
    if (successElement) {
        successElement.style.display = 'none';
    }
    
    if (inputElement) {
        inputElement.classList.toggle('error', !!message);
        inputElement.classList.remove('success');
    }
}

function showFieldSuccess(fieldId, message = '') {
    const errorElement = document.getElementById(`${fieldId}-error`);
    const successElement = document.getElementById(`${fieldId}-success`);
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = message ? 'block' : 'none';
    }
    
    if (inputElement) {
        inputElement.classList.remove('error');
        inputElement.classList.add('success');
    }
}

// Input formatting
function formatPhone(value) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
}

function formatCPF(value) {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Password toggle functionality
function togglePasswordVisibility(inputId, toggleBtn) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';
    
    toggleBtn.innerHTML = isPassword ? 
        `<svg class="lucide lucide-eye-off" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 8 11 8a9.74 9.74 0 0 0 5-1.17"/>
            <line x1="2" y1="2" x2="22" y2="22"/>
        </svg>` :
        `<svg class="lucide lucide-eye" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`;
}

// Registration function
async function handleRegister(formData) {
    try {
        showLoading(true);
        
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            formData.email, 
            formData.password
        );
        
        // Update user profile with name
        await updateProfile(userCredential.user, {
            displayName: formData.name
        });
        
        // Show success message
        registerForm.style.display = 'none';
        successMessage.classList.remove('hidden');
        
        showToast('Conta criada com sucesso!', 'success');
        
        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Erro ao criar conta. Tente novamente.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Este e-mail já está cadastrado.';
                showFieldError('email', errorMessage);
                break;
            case 'auth/weak-password':
                errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
                showFieldError('password', errorMessage);
                break;
            case 'auth/invalid-email':
                errorMessage = 'E-mail inválido.';
                showFieldError('email', errorMessage);
                break;
            default:
                showToast(errorMessage, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Google registration
async function handleGoogleRegister() {
    try {
        showLoading(true);
        
        const result = await signInWithPopup(auth, googleProvider);
        
        showToast('Conta criada com Google!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Google registration error:', error);
        
        let errorMessage = 'Erro ao criar conta com Google.';
        
        switch (error.code) {
            case 'auth/account-exists-with-different-credential':
                errorMessage = 'Já existe uma conta com este e-mail.';
                break;
            case 'auth/popup-closed-by-user':
                errorMessage = 'Login cancelado pelo usuário.';
                break;
            default:
                errorMessage = 'Erro ao conectar com Google. Tente novamente.';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Form submission
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            cpf: cpfInput.value.trim(),
            password: passwordInput.value,
            confirmPassword: confirmPasswordInput.value,
            terms: termsCheckbox.checked
        };
        
        // Validate all fields
        let isValid = true;
        
        if (!validateName(formData.name)) {
            showFieldError('name', 'Nome deve ter pelo menos 3 caracteres e conter apenas letras.');
            isValid = false;
        } else {
            showFieldSuccess('name');
        }
        
        if (!validateEmail(formData.email)) {
            showFieldError('email', 'E-mail inválido.');
            isValid = false;
        } else {
            showFieldSuccess('email');
        }
        
        if (!validatePhone(formData.phone)) {
            showFieldError('phone', 'Telefone inválido. Use o formato (11) 99999-9999.');
            isValid = false;
        } else {
            showFieldSuccess('phone');
        }
        
        if (!validateCPF(formData.cpf)) {
            showFieldError('cpf', 'CPF inválido.');
            isValid = false;
        } else {
            showFieldSuccess('cpf');
        }
        
        if (!validatePassword(formData.password)) {
            showFieldError('password', 'Senha deve ter pelo menos 6 caracteres, incluindo maiúscula, minúscula e número.');
            isValid = false;
        } else {
            showFieldSuccess('password');
        }
        
        if (formData.password !== formData.confirmPassword) {
            showFieldError('confirm-password', 'Senhas não coincidem.');
            isValid = false;
        } else if (formData.confirmPassword) {
            showFieldSuccess('confirm-password');
        }
        
        if (!formData.terms) {
            showFieldError('terms', 'Você deve aceitar os termos de uso.');
            isValid = false;
        }
        
        if (isValid) {
            handleRegister(formData);
        }
    });
    
    // Real-time validation
    nameInput.addEventListener('input', function() {
        const value = this.value.trim();
        if (value && !validateName(value)) {
            showFieldError('name', 'Nome deve ter pelo menos 3 caracteres e conter apenas letras.');
        } else if (value) {
            showFieldSuccess('name');
        } else {
            showFieldError('name', '');
        }
    });
    
    emailInput.addEventListener('input', function() {
        const value = this.value.trim();
        if (value && !validateEmail(value)) {
            showFieldError('email', 'E-mail inválido.');
        } else if (value) {
            showFieldSuccess('email');
        } else {
            showFieldError('email', '');
        }
    });
    
    phoneInput.addEventListener('input', function() {
        this.value = formatPhone(this.value);
        const value = this.value.trim();
        if (value && !validatePhone(value)) {
            showFieldError('phone', 'Telefone inválido.');
        } else if (value) {
            showFieldSuccess('phone');
        } else {
            showFieldError('phone', '');
        }
    });
    
    cpfInput.addEventListener('input', function() {
        this.value = formatCPF(this.value);
        const value = this.value.trim();
        if (value && !validateCPF(value)) {
            showFieldError('cpf', 'CPF inválido.');
        } else if (value) {
            showFieldSuccess('cpf');
        } else {
            showFieldError('cpf', '');
        }
    });
    
    passwordInput.addEventListener('input', function() {
        const value = this.value;
        if (value && !validatePassword(value)) {
            showFieldError('password', 'Senha deve ter pelo menos 6 caracteres, incluindo maiúscula, minúscula e número.');
        } else if (value) {
            showFieldSuccess('password');
        } else {
            showFieldError('password', '');
        }
        
        // Check confirm password if it has value
        if (confirmPasswordInput.value) {
            if (value !== confirmPasswordInput.value) {
                showFieldError('confirm-password', 'Senhas não coincidem.');
            } else {
                showFieldSuccess('confirm-password');
            }
        }
    });
    
    confirmPasswordInput.addEventListener('input', function() {
        const value = this.value;
        if (value && value !== passwordInput.value) {
            showFieldError('confirm-password', 'Senhas não coincidem.');
        } else if (value) {
            showFieldSuccess('confirm-password');
        } else {
            showFieldError('confirm-password', '');
        }
    });
    
    // Password toggle
    passwordToggle.addEventListener('click', function() {
        togglePasswordVisibility('password', this);
    });
    
    confirmPasswordToggle.addEventListener('click', function() {
        togglePasswordVisibility('confirm-password', this);
    });
    
    // Google registration
    googleBtn.addEventListener('click', handleGoogleRegister);
    
    // Terms checkbox
    termsCheckbox.addEventListener('change', function() {
        if (this.checked) {
            showFieldError('terms', '');
        }
    });
});
