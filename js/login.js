import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class LoginManager {
    constructor() {
        this.auth = getAuth();
        this.db = getFirestore();
        this.googleProvider = new GoogleAuthProvider();
        
        // Forms
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.resetForm = document.getElementById('resetForm');
        
        // Navigation links
        this.showRegisterLink = document.getElementById('showRegister');
        this.showLoginLink = document.getElementById('showLogin');
        this.forgotPasswordLink = document.getElementById('forgotPasswordLink');
        this.backToLoginLink = document.getElementById('backToLogin');
        this.showTermsLink = document.getElementById('showTerms');
        
        // Google login
        this.googleLoginBtn = document.getElementById('googleLogin');
        
        // Password visibility toggles
        this.passwordToggles = document.querySelectorAll('.toggle-password');
        
        // Terms modal
        this.termsModal = document.getElementById('termsModal');
        this.closeModalBtns = document.querySelectorAll('.close-modal');
        
        // Loading overlay
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.init();
    }

    init() {
        // Check if user is already logged in
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                window.location.href = 'dashboard.html';
            }
        });
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Form submissions
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        this.resetForm.addEventListener('submit', (e) => this.handlePasswordReset(e));
        
        // Form navigation
        this.showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('register');
        });
        
        this.showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });
        
        this.forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('reset');
        });
        
        this.backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });
        
        // Google login
        this.googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
        
        // Password visibility toggles
        this.passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });
        
        // Terms modal
        this.showTermsLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.termsModal.style.display = 'flex';
        });
        
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.termsModal.style.display = 'none';
            });
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === this.termsModal) {
                this.termsModal.style.display = 'none';
            }
        });
    }

    showForm(formType) {
        // Hide all forms
        this.loginForm.classList.remove('active');
        this.registerForm.classList.remove('active');
        this.resetForm.classList.remove('active');
        
        // Show selected form
        switch (formType) {
            case 'register':
                this.registerForm.classList.add('active');
                break;
            case 'reset':
                this.resetForm.classList.add('active');
                break;
            default:
                this.loginForm.classList.add('active');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        try {
            this.showLoading();
            
            // Sign in user
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            
            // Set persistence if remember me is checked
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Erro no login:', error);
            let message = 'Erro ao fazer login. Por favor, tente novamente.';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    message = 'Email inválido.';
                    break;
                case 'auth/user-disabled':
                    message = 'Esta conta foi desativada.';
                    break;
                case 'auth/user-not-found':
                    message = 'Usuário não encontrado.';
                    break;
                case 'auth/wrong-password':
                    message = 'Senha incorreta.';
                    break;
            }
            
            alert(message);
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAccept = document.getElementById('termsAccept').checked;
        
        // Validations
        if (password !== confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }
        
        if (!termsAccept) {
            alert('Você precisa aceitar os termos de uso para criar uma conta.');
            return;
        }
        
        try {
            this.showLoading();
            
            // Create user
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            
            // Save additional user data
            await setDoc(doc(this.db, 'usuarios', userCredential.user.uid), {
                nome: name,
                email: email,
                dataCriacao: new Date(),
                configuracoes: {
                    tema: 'light',
                    notificacoes: true
                }
            });
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Erro no registro:', error);
            let message = 'Erro ao criar conta. Por favor, tente novamente.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    message = 'Este email já está em uso.';
                    break;
                case 'auth/invalid-email':
                    message = 'Email inválido.';
                    break;
                case 'auth/operation-not-allowed':
                    message = 'O registro com email e senha está desativado.';
                    break;
                case 'auth/weak-password':
                    message = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                    break;
            }
            
            alert(message);
        } finally {
            this.hideLoading();
        }
    }

    async handlePasswordReset(event) {
        event.preventDefault();
        
        const email = document.getElementById('resetEmail').value;
        
        try {
            this.showLoading();
            
            await sendPasswordResetEmail(this.auth, email);
            alert('Email de recuperação enviado. Verifique sua caixa de entrada.');
            this.showForm('login');
        } catch (error) {
            console.error('Erro na recuperação de senha:', error);
            let message = 'Erro ao enviar email de recuperação. Por favor, tente novamente.';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    message = 'Email inválido.';
                    break;
                case 'auth/user-not-found':
                    message = 'Não existe conta com este email.';
                    break;
            }
            
            alert(message);
        } finally {
            this.hideLoading();
        }
    }

    async handleGoogleLogin() {
        try {
            this.showLoading();
            
            const result = await signInWithPopup(this.auth, this.googleProvider);
            const user = result.user;
            
            // Check if user exists in database
            const userDoc = doc(this.db, 'usuarios', user.uid);
            await setDoc(userDoc, {
                nome: user.displayName,
                email: user.email,
                dataCriacao: new Date(),
                configuracoes: {
                    tema: 'light',
                    notificacoes: true
                }
            }, { merge: true });
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Erro no login com Google:', error);
            alert('Erro ao fazer login com Google. Por favor, tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    togglePasswordVisibility(event) {
        const button = event.currentTarget;
        const input = button.parentElement.querySelector('input');
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Initialize the login manager
window.loginManager = new LoginManager(); 