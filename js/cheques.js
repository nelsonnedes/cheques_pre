// Importações do Firebase
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    getDocs 
} from 'firebase/firestore';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from 'firebase/storage';
import { auth } from './firebase-config.js';

class ChequeManager {
    constructor() {
        this.db = getFirestore();
        this.storage = getStorage();
        this.form = document.getElementById('chequeForm');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.previewContainer = document.getElementById('previewContainer');

        // Inicialização
        this.setupEventListeners();
        this.setupMasks();
        this.carregarBancos();
        this.carregarEmpresas();
    }

    // Configuração de Event Listeners
    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            
            // Listener para preview de imagem
            const imagemInput = document.getElementById('imagemCheque');
            if (imagemInput) {
                imagemInput.addEventListener('change', (e) => this.handleImagePreview(e));
            }

            // Listener para cálculo automático
            const valorInput = document.getElementById('valor');
            if (valorInput) {
                valorInput.addEventListener('input', () => this.calcularValores());
            }
        }
    }

    // Configuração de máscaras para inputs
    setupMasks() {
        if (typeof VMasker !== 'undefined') {
            // Máscara para valor monetário
            VMasker(document.querySelector('#valor')).maskMoney({
                precision: 2,
                separator: ',',
                delimiter: '.',
                unit: 'R$'
            });

            // Máscara para CPF/CNPJ
            VMasker(document.querySelector('#cpfCnpjEmitente')).maskPattern('999.999.999-99');

            // Máscara para telefone
            VMasker(document.querySelector('#telefoneEmitente')).maskPattern('(99) 99999-9999');
        }
    }

    // Carregar lista de bancos
    async carregarBancos() {
        const bancos = [
            { codigo: '001', nome: 'Banco do Brasil' },
            { codigo: '104', nome: 'Caixa Econômica Federal' },
            { codigo: '033', nome: 'Banco Santander' },
            { codigo: '341', nome: 'Banco Itaú' },
            { codigo: '237', nome: 'Banco Bradesco' },
            // Adicione mais bancos conforme necessário
        ];

        const selectBanco = document.getElementById('banco');
        if (selectBanco) {
            bancos.forEach(banco => {
                const option = document.createElement('option');
                option.value = banco.codigo;
                option.textContent = `${banco.codigo} - ${banco.nome}`;
                selectBanco.appendChild(option);
            });
        }
    }

    // Carregar empresas de fomento do usuário
    async carregarEmpresas() {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const empresasRef = collection(this.db, 'empresas');
            const q = query(empresasRef, 
                where('userId', '==', userId),
                orderBy('nome', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const selectEmpresa = document.getElementById('empresa');
            
            if (selectEmpresa) {
                querySnapshot.forEach((doc) => {
                    const empresa = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = empresa.nome;
                    selectEmpresa.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            alert('Erro ao carregar empresas. Por favor, tente novamente.');
        }
    }

    // Preview de imagem
    handleImagePreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewContainer.innerHTML = `
                <img src="${e.target.result}" alt="Preview do cheque" class="image-preview">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.innerHTML = ''">
                    <i class="fas fa-times"></i>
                </button>
            `;
        };
        reader.readAsDataURL(file);
    }

    // Upload de imagem
    async uploadImagem(file, chequeId) {
        if (!file) return null;

        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('Usuário não autenticado');

        const fileExt = file.name.split('.').pop();
        const fileName = `cheques/${userId}/${chequeId}.${fileExt}`;
        const storageRef = ref(this.storage, fileName);

        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    }

    // Formatar valor para número
    formatarValor(valor) {
        return parseFloat(valor.replace('R$', '').replace('.', '').replace(',', '.').trim());
    }

    // Validar formulário
    validarFormulario() {
        // Validar data de vencimento
        const dataVencimento = new Date(this.form.dataVencimento.value);
        const hoje = new Date();
        if (dataVencimento < hoje) {
            alert('A data de vencimento não pode ser anterior à data atual.');
            return false;
        }

        // Validar valor
        const valor = this.formatarValor(this.form.valor.value);
        if (valor <= 0) {
            alert('O valor do cheque deve ser maior que zero.');
            return false;
        }

        return true;
    }

    // Manipular envio do formulário
    async handleSubmit(event) {
        event.preventDefault();

        if (!this.validarFormulario()) return;

        try {
            this.loadingOverlay.style.display = 'flex';

            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error('Usuário não autenticado');

            // Preparar dados do cheque
            const chequeData = {
                userId,
                numeroCheque: this.form.numeroCheque.value,
                valor: this.formatarValor(this.form.valor.value),
                dataEmissao: new Date(this.form.dataEmissao.value),
                dataVencimento: new Date(this.form.dataVencimento.value),
                nomeEmitente: this.form.nomeEmitente.value,
                cpfCnpjEmitente: this.form.cpfCnpjEmitente.value,
                telefoneEmitente: this.form.telefoneEmitente.value,
                emailEmitente: this.form.emailEmitente.value,
                banco: this.form.banco.value,
                agencia: this.form.agencia.value,
                conta: this.form.conta.value,
                empresa: this.form.empresa.value || null,
                status: this.form.status.value,
                observacoes: this.form.observacoes.value,
                dataCadastro: new Date(),
                dataAtualizacao: new Date()
            };

            // Salvar cheque no Firestore
            const docRef = await addDoc(collection(this.db, 'cheques'), chequeData);

            // Upload da imagem se existir
            const imagemFile = this.form.imagemCheque.files[0];
            if (imagemFile) {
                const imageUrl = await this.uploadImagem(imagemFile, docRef.id);
                await updateDoc(doc(this.db, 'cheques', docRef.id), {
                    imagemUrl: imageUrl
                });
            }

            alert('Cheque cadastrado com sucesso!');
            window.location.href = 'listar_cheques.html';

        } catch (error) {
            console.error('Erro ao salvar cheque:', error);
            alert('Erro ao salvar cheque. Por favor, tente novamente.');
        } finally {
            this.loadingOverlay.style.display = 'none';
        }
    }
}

// Inicializar o gerenciador quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new ChequeManager();
}); 