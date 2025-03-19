import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatCurrency, formatDate, formatChequeNumber } from './utils.js';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { getFirestore } from 'firebase/firestore';

export class ExportManager {
    constructor() {
        this.collections = ['empresas', 'cheques'];
        this.userId = auth.currentUser?.uid;
        this.db = getFirestore();
    }

    async exportToExcel(collectionName, filters = {}) {
        try {
            // Carregar a biblioteca SheetJS dinamicamente
            await this.loadExcelLibrary();
            
            // Buscar dados
            const data = await this.getData(collectionName, filters);
            
            // Criar workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            
            // Adicionar worksheet ao workbook
            XLSX.utils.book_append_sheet(wb, ws, collectionName);
            
            // Gerar arquivo Excel
            const fileName = `${collectionName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            return { success: true, message: 'Arquivo Excel gerado com sucesso!' };
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            return { success: false, message: 'Erro ao gerar arquivo Excel.' };
        }
    }

    async exportToPDF(collectionName, filters = {}) {
        try {
            // Carregar a biblioteca jsPDF dinamicamente
            await this.loadPDFLibrary();
            
            // Buscar dados
            const data = await this.getData(collectionName, filters);
            
            // Criar documento PDF
            const doc = new jsPDF();
            
            // Adicionar cabeçalho
            doc.setFontSize(16);
            doc.text(`Relatório - ${this.formatCollectionName(collectionName)}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
            
            // Configurar colunas
            const columns = this.getColumnsForCollection(collectionName);
            
            // Converter dados para formato da tabela
            const tableData = data.map(item => columns.map(col => item[col.key] || ''));
            
            // Adicionar tabela
            doc.autoTable({
                startY: 35,
                head: [columns.map(col => col.label)],
                body: tableData,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 'auto' }
                }
            });
            
            // Gerar arquivo PDF
            const fileName = `${collectionName}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            return { success: true, message: 'Arquivo PDF gerado com sucesso!' };
        } catch (error) {
            console.error('Erro ao exportar para PDF:', error);
            return { success: false, message: 'Erro ao gerar arquivo PDF.' };
        }
    }

    async getData(collectionName, filters = {}) {
        try {
            // Construir query com filtros
            let q = collection(this.db, collectionName);
            
            if (filters.startDate && filters.endDate) {
                q = query(q, 
                    where('data', '>=', filters.startDate),
                    where('data', '<=', filters.endDate)
                );
            }
            
            if (filters.status) {
                q = query(q, where('status', '==', filters.status));
            }
            
            if (filters.empresa) {
                q = query(q, where('empresa', '==', filters.empresa));
            }
            
            // Ordenar por data
            q = query(q, orderBy('data', 'desc'));
            
            // Buscar documentos
            const querySnapshot = await getDocs(q);
            const data = [];
            
            querySnapshot.forEach((doc) => {
                data.push({
                    id: doc.id,
                    ...doc.data(),
                    data: doc.data().data?.toDate().toLocaleDateString('pt-BR') || ''
                });
            });
            
            return data;
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            throw error;
        }
    }

    getColumnsForCollection(collectionName) {
        const columns = {
            cheques: [
                { key: 'numero', label: 'Número' },
                { key: 'valor', label: 'Valor' },
                { key: 'data', label: 'Data' },
                { key: 'empresa', label: 'Empresa' },
                { key: 'status', label: 'Status' }
            ],
            empresas: [
                { key: 'nome', label: 'Nome' },
                { key: 'cnpj', label: 'CNPJ' },
                { key: 'telefone', label: 'Telefone' },
                { key: 'email', label: 'E-mail' }
            ]
        };
        
        return columns[collectionName] || [];
    }

    formatCollectionName(name) {
        const formats = {
            cheques: 'Cheques',
            empresas: 'Empresas'
        };
        
        return formats[name] || name;
    }

    async loadExcelLibrary() {
        if (window.XLSX) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadPDFLibrary() {
        if (window.jsPDF) return;
        
        // Carregar jsPDF
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        // Carregar jsPDF-AutoTable
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    formatEmpresasData(empresas) {
        return empresas.map(empresa => ({
            'Nome': empresa.nome,
            'CNPJ': empresa.cnpj,
            'Telefone': empresa.telefone,
            'Email': empresa.email,
            'Endereço': empresa.endereco,
            'Cidade': empresa.cidade,
            'Estado': empresa.estado,
            'Status': empresa.ativo ? 'Ativo' : 'Inativo'
        }));
    }

    formatChequesData(cheques) {
        return cheques.map(cheque => ({
            'Número': formatChequeNumber(cheque.numero),
            'Valor': formatCurrency(cheque.valor),
            'Data de Emissão': formatDate(cheque.dataEmissao.toDate()),
            'Data de Vencimento': formatDate(cheque.dataVencimento.toDate()),
            'Empresa': cheque.empresaNome,
            'Status': cheque.status,
            'Banco': cheque.banco,
            'Agência': cheque.agencia,
            'Conta': cheque.conta,
            'Observações': cheque.observacoes || ''
        }));
    }

    async getChequeData(filters = {}) {
        try {
            if (!this.userId) throw new Error('Usuário não autenticado');

            let q = query(
                collection(db, 'cheques'),
                where('userId', '==', this.userId)
            );

            // Aplicar filtros
            if (filters.status) {
                q = query(q, where('status', '==', filters.status));
            }
            if (filters.startDate && filters.endDate) {
                q = query(
                    q,
                    where('dataVencimento', '>=', filters.startDate),
                    where('dataVencimento', '<=', filters.endDate)
                );
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            throw error;
        }
    }
} 