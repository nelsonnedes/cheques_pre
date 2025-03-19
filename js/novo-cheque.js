import { auth, db, storage } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { formatCurrency, formatCPFCNPJ, formatPhone } from './utils.js';

class NovoChequeManager {
    constructor() {
        this.auth = auth;
        this.db = db;
        this.storage = storage;
        this.userId = null;
        
        // Form Elements
        this.form = document.getElementById('novoChequeForm');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.imageInput = document.getElementById('imagemCheque');
        this.previewContainer = document.getElementById('previewContainer');
        this.imagePreview = document.getElementById('imagePreview');
        this.removeImageBtn = document.getElementById('removeImage');
        this.cancelarBtn = document.getElementById('cancelarBtn');
        this.salvarRascunhoBtn = document.getElementById('salvarRascunhoBtn');
        this.empresaInput = document.getElementById('empresa');
        this.cnpjInput = document.getElementById('cnpj');
        this.valorInput = document.getElementById('valor');
        this.anexosInput = document.getElementById('anexos');
        this.filePreview = document.getElementById('filePreview');
        
        // Buttons
        this.backButton = document.getElementById('backButton');
        this.helpButton = document.getElementById('helpButton');
        this.novaEmpresaBtn = document.getElementById('novaEmpresaBtn');
        
        // Modal Elements
        this.novaEmpresaModal = document.getElementById('novaEmpresaModal');
        this.novaEmpresaForm = document.getElementById('novaEmpresaForm');
        
        this.rascunhoTimeout = null;
        this.rascunhoKey = 'cheque_rascunho';
        this.imageFile = null;
        
        this.init();
    }

    async init() {
        // Check authentication
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.userId = user.uid;
                this.loadEmpresas();
            } else {
                window.location.href = 'login.html';
            }
        });
        
        this.setupEventListeners();
        this.setupInputMasks();
        this.setDefaultDates();
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Navigation buttons
        this.backButton.addEventListener('click', () => window.history.back());
        this.cancelarBtn.addEventListener('click', () => this.handleCancel());
        
        // Help button
        this.helpButton.addEventListener('click', () => this.showHelp());
        
        // Empresa selection and creation
        this.empresaInput.addEventListener('change', () => this.handleEmpresaChange());
        this.novaEmpresaBtn.addEventListener('click', () => this.showNovaEmpresaModal());
        
        // Modal events
        this.novaEmpresaForm.addEventListener('submit', (e) => this.handleNovaEmpresa(e));
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => this.hideNovaEmpresaModal());
        });
        
        // File input
        this.anexosInput.addEventListener('change', () => this.handleFileSelection());
        
        // Valor input formatting
        this.valorInput.addEventListener('input', (e) => this.formatCurrencyInput(e));
        
        // Image handling
        this.imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
        this.removeImageBtn.addEventListener('click', () => this.removeImage());
        
        // Auto-save draft
        this.form.addEventListener('input', () => {
            if (this.rascunhoTimeout) {
                clearTimeout(this.rascunhoTimeout);
            }
            this.rascunhoTimeout = setTimeout(() => this.salvarRascunho(), 2000);
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            auth.signOut();
        });
    }

    setupInputMasks() {
        // CNPJ mask for nova empresa form
        const cnpjEmpresa = document.getElementById('cnpjEmpresa');
        cnpjEmpresa.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 14) {
                value = value.replace(/(\d{2})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });

        // Telefone mask
        const telefoneEmpresa = document.getElementById('telefoneEmpresa');
        telefoneEmpresa.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });
    }

    setDefaultDates() {
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('dataEmissao').value = hoje;
        document.getElementById('dataVencimento').value = hoje;
    }

    async loadEmpresas() {
        try {
            const empresasRef = collection(this.db, 'empresas');
            const q = query(empresasRef, where('userId', '==', this.userId), orderBy('nome'));
            const snapshot = await getDocs(q);
            
            const empresasList = document.getElementById('empresasList');
            empresasList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const empresa = doc.data();
                const option = document.createElement('option');
                option.value = empresa.nome;
                option.dataset.cnpj = empresa.cnpj;
                empresasList.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            alert('Erro ao carregar lista de empresas');
        }
    }

    handleEmpresaChange() {
        const empresasList = document.getElementById('empresasList');
        const selectedOption = Array.from(empresasList.options)
            .find(option => option.value === this.empresaInput.value);
        
        if (selectedOption) {
            this.cnpjInput.value = selectedOption.dataset.cnpj;
        } else {
            this.cnpjInput.value = '';
        }
    }

    showNovaEmpresaModal() {
        this.novaEmpresaModal.classList.add('visible');
    }

    hideNovaEmpresaModal() {
        this.novaEmpresaModal.classList.remove('visible');
        this.novaEmpresaForm.reset();
    }

    async handleNovaEmpresa(e) {
        e.preventDefault();
        
        try {
            this.showLoading();
            
            const empresaData = {
                nome: document.getElementById('nomeEmpresa').value,
                cnpj: document.getElementById('cnpjEmpresa').value,
                telefone: document.getElementById('telefoneEmpresa').value,
                email: document.getElementById('emailEmpresa').value,
                userId: this.userId,
                dataCadastro: new Date()
            };
            
            const empresasRef = collection(this.db, 'empresas');
            await addDoc(empresasRef, empresaData);
            
            await this.loadEmpresas();
            this.empresaInput.value = empresaData.nome;
            this.cnpjInput.value = empresaData.cnpj;
            
            this.hideNovaEmpresaModal();
            
        } catch (error) {
            console.error('Erro ao cadastrar empresa:', error);
            alert('Erro ao cadastrar empresa');
        } finally {
            this.hideLoading();
        }
    }

    handleFileSelection() {
        this.filePreview.innerHTML = '';
        const files = this.anexosInput.files;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const div = document.createElement('div');
            div.className = 'file-preview-item';
            
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.onload = () => URL.revokeObjectURL(img.src);
                div.appendChild(img);
            } else {
                const icon = document.createElement('i');
                icon.className = 'fas fa-file-pdf';
                div.appendChild(icon);
            }
            
            const name = document.createElement('span');
            name.textContent = file.name;
            div.appendChild(name);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-icon remove-file';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = () => this.removeFile(i);
            div.appendChild(removeBtn);
            
            this.filePreview.appendChild(div);
        }
    }

    removeFile(index) {
        const dt = new DataTransfer();
        const files = this.anexosInput.files;
        
        for (let i = 0; i < files.length; i++) {
            if (i !== index) {
                dt.items.add(files[i]);
            }
        }
        
        this.anexosInput.files = dt.files;
        this.handleFileSelection();
    }

    formatCurrencyInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = (parseInt(value) / 100).toFixed(2);
        e.target.value = value.replace('.', ',');
    }

    handleImageSelect(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                this.imageFile = file;
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    this.imagePreview.src = e.target.result;
                    this.previewContainer.classList.remove('hidden');
                };
                
                reader.readAsDataURL(file);
            } else {
                alert('Por favor, selecione apenas arquivos de imagem.');
                this.imageInput.value = '';
            }
        }
    }

    removeImage() {
        this.imageFile = null;
        this.imageInput.value = '';
        this.previewContainer.classList.add('hidden');
        this.imagePreview.src = '#';
    }

    handleCancel() {
        if (confirm('Deseja realmente cancelar? Todas as informações não salvas serão perdidas.')) {
            localStorage.removeItem(this.rascunhoKey);
            window.location.href = 'dashboard.html';
        }
    }

    salvarRascunho(showMessage = false) {
        const formData = {
            numeroCheque: this.form.numeroCheque.value,
            valor: this.form.valor.value,
            dataVencimento: this.form.dataVencimento.value,
            nomeEmissor: this.form.nomeEmissor.value,
            cpfCnpj: this.form.cpfCnpj.value,
            telefone: this.form.telefone.value,
            email: this.form.email.value,
            empresa: this.form.empresa.value,
            banco: this.form.banco.value,
            agencia: this.form.agencia.value,
            conta: this.form.conta.value,
            observacoes: this.form.observacoes.value
        };
        
        localStorage.setItem(this.rascunhoKey, JSON.stringify(formData));
        
        if (showMessage) {
            alert('Rascunho salvo com sucesso!');
        }
    }

    loadRascunho() {
        const rascunho = localStorage.getItem(this.rascunhoKey);
        if (rascunho) {
            const formData = JSON.parse(rascunho);
            Object.keys(formData).forEach(key => {
                if (this.form[key]) {
                    this.form[key].value = formData[key];
                }
            });
        }
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showHelp() {
        alert(`Ajuda - Novo Cheque

1. Preencha todos os campos obrigatórios (marcados com *)
2. O número do cheque deve conter apenas números
3. O valor deve ser informado usando vírgula como separador decimal
4. Selecione uma empresa existente ou cadastre uma nova
5. Você pode anexar imagens e PDFs relacionados ao cheque
6. O status padrão é "Pendente"
7. As observações são opcionais mas úteis para registro`);
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        try {
            this.showLoading();
            
            // Collect form data
            const formData = new FormData(this.form);
            const chequeData = {
                numero: formData.get('numero'),
                valor: parseFloat(formData.get('valor').replace(',', '.')),
                dataEmissao: new Date(formData.get('dataEmissao')),
                dataVencimento: new Date(formData.get('dataVencimento')),
                empresa: formData.get('empresa'),
                cnpj: formData.get('cnpj'),
                banco: formData.get('banco'),
                agencia: formData.get('agencia'),
                conta: formData.get('conta'),
                status: formData.get('status'),
                categoria: formData.get('categoria') || null,
                observacoes: formData.get('observacoes') || null,
                userId: this.userId,
                dataCadastro: new Date()
            };
            
            // Upload files if any
            const files = this.anexosInput.files;
            if (files.length > 0) {
                chequeData.anexos = await this.uploadFiles(files);
            }
            
            // Save to Firestore
            const chequesRef = collection(this.db, 'cheques');
            await addDoc(chequesRef, chequeData);
            
            // Redirect to list
            window.location.href = 'listar-cheques.html';
            
        } catch (error) {
            console.error('Erro ao cadastrar cheque:', error);
            alert('Erro ao cadastrar cheque');
        } finally {
            this.hideLoading();
        }
    }

    async uploadFiles(files) {
        const anexos = [];
        
        for (const file of files) {
            const fileName = `cheques/${this.userId}/${Date.now()}_${file.name}`;
            const fileRef = ref(this.storage, fileName);
            
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            
            anexos.push({
                nome: file.name,
                tipo: file.type,
                url: url,
                path: fileName
            });
        }
        
        return anexos;
    }
}

// Initialize the form manager
window.novoChequeManager = new NovoChequeManager(); 