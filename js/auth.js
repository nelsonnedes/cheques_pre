import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

class AuthManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.resetForm = document.getElementById('resetForm');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.setupEventListeners();
        this.setupPasswordToggles();
    }

    setupEventListeners() {
        // Form submissions
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        this.resetForm.addEventListener('submit', (e) => this.handlePasswordReset(e));

        // Navigation between forms
        document.getElementById('showRegister').addEventListener('click', (e) => this.showForm(e, 'register'));
        document.getElementById('showLogin').addEventListener('click', (e) => this.showForm(e, 'login'));
        document.getElementById('forgotPassword').addEventListener('click', (e) => this.showForm(e, 'reset'));
        document.getElementById('backToLogin').addEventListener('click', (e) => this.showForm(e, 'login'));

        // Social login
        document.getElementById('googleLogin').addEventListener('click', () => this.handleGoogleLogin());

        // Remember me
        document.getElementById('remember').addEventListener('change', (e) => this.handleRememberMe(e));
    }

    setupPasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', (e) => {
                const input = e.target.closest('.input-icon').querySelector('input');
                const icon = e.target.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    showForm(e, form) {
        e.preventDefault();
        document.querySelector('.auth-card:not(.hidden)').classList.add('hidden');
        document.querySelector(`.${form}-card`).classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        this.showLoading();

        const email = this.loginForm.email.value;
        const password = this.loginForm.password.value;
        const remember = document.getElementById('remember').checked;

        try {
            // Set persistence based on remember me checkbox
            await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
            
            // Sign in
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'index.html';
        } catch (error) {
            this.hideLoading();
            this.showError('Login falhou. Verifique suas credenciais.');
            console.error('Erro no login:', error);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading();

        const name = this.registerForm.name.value;
        const email = this.registerForm.email.value;
        const password = this.registerForm.password.value;
        const confirmPassword = this.registerForm.confirmPassword.value;

        if (password !== confirmPassword) {
            this.hideLoading();
            this.showError('As senhas não coincidem.');
            return;
        }

        try {
            // Create user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Create user profile
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                name,
                email,
                createdAt: serverTimestamp(),
                configuracoes: {
                    notificacoes: true,
                    diasAntecedencia: 3,
                    somNotificacao: true
                }
            });

            window.location.href = 'index.html';
        } catch (error) {
            this.hideLoading();
            this.showError('Registro falhou. Tente novamente.');
            console.error('Erro no registro:', error);
        }
    }

    async handlePasswordReset(e) {
        e.preventDefault();
        this.showLoading();

        const email = this.resetForm.email.value;

        try {
            await sendPasswordResetEmail(auth, email);
            this.hideLoading();
            this.showSuccess('Instruções de recuperação enviadas para seu e-mail.');
            setTimeout(() => this.showForm({ preventDefault: () => {} }, 'login'), 3000);
        } catch (error) {
            this.hideLoading();
            this.showError('Falha ao enviar e-mail de recuperação.');
            console.error('Erro na recuperação de senha:', error);
        }
    }

    async handleGoogleLogin() {
        this.showLoading();
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            
            // Check if user profile exists
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            
            if (!userDoc.exists()) {
                // Create user profile if it doesn't exist
                await setDoc(doc(db, 'users', result.user.uid), {
                    name: result.user.displayName,
                    email: result.user.email,
                    createdAt: serverTimestamp(),
                    configuracoes: {
                        notificacoes: true,
                        diasAntecedencia: 3,
                        somNotificacao: true
                    }
                });
            }

            window.location.href = 'index.html';
        } catch (error) {
            this.hideLoading();
            this.showError('Login com Google falhou.');
            console.error('Erro no login com Google:', error);
        }
    }

    async handleRememberMe(e) {
        const persistence = e.target.checked ? browserLocalPersistence : browserSessionPersistence;
        try {
            await setPersistence(auth, persistence);
        } catch (error) {
            console.error('Erro ao configurar persistência:', error);
        }
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-error';
        alert.textContent = message;
        this.insertAlert(alert);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = message;
        this.insertAlert(alert);
    }

    insertAlert(alert) {
        const container = document.querySelector('.auth-container');
        container.insertBefore(alert, container.firstChild);
        setTimeout(() => alert.remove(), 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
}); 