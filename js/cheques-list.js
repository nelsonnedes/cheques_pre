// Importações do Firebase
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
    doc,
    updateDoc,
    deleteDoc 
} from 'firebase/firestore';
import { auth } from './firebase-config.js';

class ChequesListManager {
    constructor() {
        this.db = getFirestore();
        this.cheques = [];
        this.filteredCheques = [];
        
        // Elementos do DOM
        this.filterForm = document.getElementById('filterForm');
        this.filterPanel = document.getElementById('filterPanel');
        this.toggleFilters = document.getElementById('toggleFilters');
        this.searchInput = document.getElementById('searchInput');
        this.tableBody = document.getElementById('chequesTableBody');
        this.emptyState = document.getElementById('emptyState');
        this.loadingState = document.getElementById('loadingState');
        this.detailsModal = document.getElementById('detailsModal');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        // Elementos de resumo
        this.totalChequesElement = document.getElementById('totalCheques');
        this.valorTotalElement = document.getElementById('valorTotal');
        this.totalPendentesElement = document.getElementById('totalPendentes');
        this.totalCompensadosElement = document.getElementById('totalCompensados');

        this.setupEventListeners();
        this.carregarCheques();
        this.carregarEmpresas();
    }

    // Configuração de Event Listeners
    setupEventListeners() {
        // Toggle do painel de filtros
        this.toggleFilters.addEventListener('click', () => {
            this.filterPanel.classList.toggle('hidden');
        });

        // Formulário de filtros
        this.filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.aplicarFiltros();
        });

        // Busca em tempo real
        this.searchInput.addEventListener('input', () => {
            this.aplicarFiltros();
        });

        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === this.detailsModal) {
                this.fecharModal();
            }
        });
    }

    // Carregar cheques do Firestore
    async carregarCheques() {
        try {
            this.mostrarLoading();
            
            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error('Usuário não autenticado');

            const chequesRef = collection(this.db, 'cheques');
            const q = query(
                chequesRef,
                where('userId', '==', userId),
                orderBy('dataVencimento', 'desc')
            );

            const querySnapshot = await getDocs(q);
            this.cheques = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.filteredCheques = [...this.cheques];
            this.renderizarCheques();
            this.atualizarResumo();

        } catch (error) {
            console.error('Erro ao carregar cheques:', error);
            alert('Erro ao carregar cheques. Por favor, tente novamente.');
        } finally {
            this.ocultarLoading();
        }
    }

    // Carregar empresas para o filtro
    async carregarEmpresas() {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const empresasRef = collection(this.db, 'empresas');
            const q = query(
                empresasRef,
                where('userId', '==', userId),
                orderBy('nome', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const selectEmpresa = document.getElementById('filterEmpresa');

            querySnapshot.forEach((doc) => {
                const empresa = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = empresa.nome;
                selectEmpresa.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
        }
    }

    // Aplicar filtros
    aplicarFiltros() {
        const status = document.getElementById('filterStatus').value;
        const empresa = document.getElementById('filterEmpresa').value;
        const dataInicio = document.getElementById('filterDataInicio').value;
        const dataFim = document.getElementById('filterDataFim').value;
        const searchTerm = this.searchInput.value.toLowerCase();

        this.filteredCheques = this.cheques.filter(cheque => {
            // Filtro por status
            if (status && cheque.status !== status) return false;

            // Filtro por empresa
            if (empresa && cheque.empresa !== empresa) return false;

            // Filtro por data
            if (dataInicio) {
                const dataVencimento = new Date(cheque.dataVencimento.seconds * 1000);
                const dataInicioObj = new Date(dataInicio);
                if (dataVencimento < dataInicioObj) return false;
            }

            if (dataFim) {
                const dataVencimento = new Date(cheque.dataVencimento.seconds * 1000);
                const dataFimObj = new Date(dataFim);
                if (dataVencimento > dataFimObj) return false;
            }

            // Filtro por termo de busca
            if (searchTerm) {
                const searchFields = [
                    cheque.numeroCheque,
                    cheque.nomeEmitente,
                    cheque.cpfCnpjEmitente,
                    cheque.banco,
                    cheque.agencia,
                    cheque.conta
                ].map(field => field?.toLowerCase() || '');

                return searchFields.some(field => field.includes(searchTerm));
            }

            return true;
        });

        this.renderizarCheques();
        this.atualizarResumo();
    }

    // Limpar filtros
    limparFiltros() {
        this.filterForm.reset();
        this.searchInput.value = '';
        this.filteredCheques = [...this.cheques];
        this.renderizarCheques();
        this.atualizarResumo();
    }

    // Renderizar cheques na tabela
    renderizarCheques() {
        if (this.filteredCheques.length === 0) {
            this.tableBody.innerHTML = '';
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');
        this.tableBody.innerHTML = this.filteredCheques.map(cheque => `
            <tr>
                <td>${cheque.numeroCheque}</td>
                <td>R$ ${this.formatarValor(cheque.valor)}</td>
                <td>${this.formatarData(cheque.dataVencimento)}</td>
                <td>${cheque.nomeEmitente}</td>
                <td>${cheque.empresa || '-'}</td>
                <td>
                    <span class="status-badge ${cheque.status}">
                        ${this.formatarStatus(cheque.status)}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon" onclick="window.chequesList.verDetalhes('${cheque.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="window.chequesList.editarCheque('${cheque.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.chequesList.excluirCheque('${cheque.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Atualizar resumo
    atualizarResumo() {
        const total = this.filteredCheques.length;
        const valorTotal = this.filteredCheques.reduce((acc, cheque) => acc + cheque.valor, 0);
        const pendentes = this.filteredCheques.filter(cheque => cheque.status === 'pendente').length;
        const compensados = this.filteredCheques.filter(cheque => cheque.status === 'compensado').length;

        this.totalChequesElement.textContent = total;
        this.valorTotalElement.textContent = `R$ ${this.formatarValor(valorTotal)}`;
        this.totalPendentesElement.textContent = pendentes;
        this.totalCompensadosElement.textContent = compensados;
    }

    // Ver detalhes do cheque
    async verDetalhes(chequeId) {
        try {
            this.mostrarLoading();
            const cheque = this.cheques.find(c => c.id === chequeId);
            if (!cheque) throw new Error('Cheque não encontrado');

            const modalBody = this.detailsModal.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="details-grid">
                    <div class="details-section">
                        <h3>Informações do Cheque</h3>
                        <p><strong>Número:</strong> ${cheque.numeroCheque}</p>
                        <p><strong>Valor:</strong> R$ ${this.formatarValor(cheque.valor)}</p>
                        <p><strong>Data de Emissão:</strong> ${this.formatarData(cheque.dataEmissao)}</p>
                        <p><strong>Data de Vencimento:</strong> ${this.formatarData(cheque.dataVencimento)}</p>
                        <p><strong>Status:</strong> ${this.formatarStatus(cheque.status)}</p>
                    </div>
                    
                    <div class="details-section">
                        <h3>Informações do Emitente</h3>
                        <p><strong>Nome:</strong> ${cheque.nomeEmitente}</p>
                        <p><strong>CPF/CNPJ:</strong> ${cheque.cpfCnpjEmitente}</p>
                        <p><strong>Telefone:</strong> ${cheque.telefoneEmitente || '-'}</p>
                        <p><strong>Email:</strong> ${cheque.emailEmitente || '-'}</p>
                    </div>
                    
                    <div class="details-section">
                        <h3>Informações Bancárias</h3>
                        <p><strong>Banco:</strong> ${cheque.banco}</p>
                        <p><strong>Agência:</strong> ${cheque.agencia}</p>
                        <p><strong>Conta:</strong> ${cheque.conta}</p>
                    </div>

                    ${cheque.observacoes ? `
                        <div class="details-section">
                            <h3>Observações</h3>
                            <p>${cheque.observacoes}</p>
                        </div>
                    ` : ''}

                    ${cheque.imagemUrl ? `
                        <div class="details-section">
                            <h3>Imagem do Cheque</h3>
                            <img src="${cheque.imagemUrl}" alt="Imagem do cheque" class="cheque-image">
                        </div>
                    ` : ''}
                </div>
            `;

            this.detailsModal.classList.add('visible');
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            alert('Erro ao carregar detalhes do cheque. Por favor, tente novamente.');
        } finally {
            this.ocultarLoading();
        }
    }

    // Editar cheque
    editarCheque(chequeId) {
        window.location.href = `editar_cheque.html?id=${chequeId}`;
    }

    // Excluir cheque
    async excluirCheque(chequeId) {
        if (!confirm('Tem certeza que deseja excluir este cheque?')) return;

        try {
            this.mostrarLoading();
            await deleteDoc(doc(this.db, 'cheques', chequeId));
            
            this.cheques = this.cheques.filter(c => c.id !== chequeId);
            this.filteredCheques = this.filteredCheques.filter(c => c.id !== chequeId);
            
            this.renderizarCheques();
            this.atualizarResumo();
            
            alert('Cheque excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir cheque:', error);
            alert('Erro ao excluir cheque. Por favor, tente novamente.');
        } finally {
            this.ocultarLoading();
        }
    }

    // Exportar para PDF
    async exportarPDF() {
        try {
            this.mostrarLoading();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Título
            doc.setFontSize(16);
            doc.text('Relatório de Cheques', 14, 15);

            // Informações do relatório
            doc.setFontSize(10);
            doc.text(`Data do relatório: ${new Date().toLocaleDateString()}`, 14, 25);
            doc.text(`Total de cheques: ${this.filteredCheques.length}`, 14, 30);
            doc.text(`Valor total: R$ ${this.formatarValor(this.filteredCheques.reduce((acc, c) => acc + c.valor, 0))}`, 14, 35);

            // Tabela de cheques
            const headers = ['Número', 'Valor', 'Vencimento', 'Emitente', 'Status'];
            const data = this.filteredCheques.map(cheque => [
                cheque.numeroCheque,
                `R$ ${this.formatarValor(cheque.valor)}`,
                this.formatarData(cheque.dataVencimento),
                cheque.nomeEmitente,
                this.formatarStatus(cheque.status)
            ]);

            doc.autoTable({
                head: [headers],
                body: data,
                startY: 45,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: 255
                }
            });

            // Salvar o PDF
            doc.save('relatorio-cheques.pdf');
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            alert('Erro ao exportar PDF. Por favor, tente novamente.');
        } finally {
            this.ocultarLoading();
        }
    }

    // Exportar para Excel
    async exportarExcel() {
        try {
            this.mostrarLoading();
            const data = this.filteredCheques.map(cheque => ({
                'Número do Cheque': cheque.numeroCheque,
                'Valor': cheque.valor,
                'Data de Emissão': this.formatarData(cheque.dataEmissao),
                'Data de Vencimento': this.formatarData(cheque.dataVencimento),
                'Nome do Emitente': cheque.nomeEmitente,
                'CPF/CNPJ': cheque.cpfCnpjEmitente,
                'Banco': cheque.banco,
                'Agência': cheque.agencia,
                'Conta': cheque.conta,
                'Status': this.formatarStatus(cheque.status),
                'Observações': cheque.observacoes || ''
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Cheques');
            XLSX.writeFile(wb, 'relatorio-cheques.xlsx');
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            alert('Erro ao exportar Excel. Por favor, tente novamente.');
        } finally {
            this.ocultarLoading();
        }
    }

    // Utilitários
    formatarValor(valor) {
        return valor.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    formatarData(data) {
        if (!data) return '-';
        const date = data.seconds ? new Date(data.seconds * 1000) : new Date(data);
        return date.toLocaleDateString('pt-BR');
    }

    formatarStatus(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'depositado': 'Depositado',
            'compensado': 'Compensado',
            'devolvido': 'Devolvido'
        };
        return statusMap[status] || status;
    }

    fecharModal() {
        this.detailsModal.classList.remove('visible');
    }

    mostrarLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    ocultarLoading() {
        this.loadingOverlay.style.display = 'none';
    }
}

// Inicializar o gerenciador quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.chequesList = new ChequesListManager();
}); 