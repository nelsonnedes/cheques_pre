import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { formatCurrency, daysBetweenDates, calculateInterest } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    // Form elements
    const form = document.getElementById('chequeForm');
    const empresaSelect = document.getElementById('empresaFomento');
    const dataInicial = document.getElementById('dataInicial');
    const dataFinal = document.getElementById('dataFinal');
    const valorCheque = document.getElementById('valorCheque');
    const taxaJuros = document.getElementById('taxaJuros');
    const taxaImpostos = document.getElementById('taxaImpostos');
    const valorTotal = document.getElementById('valorTotal');
    const tipoCalculoInputs = document.getElementsByName('tipoCalculo');

    // Set minimum date as today for dataInicial
    const today = new Date().toISOString().split('T')[0];
    dataInicial.min = today;
    dataInicial.value = today;

    // Load empresas fomento
    const loadEmpresas = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'empresas_fomento'));
            empresaSelect.innerHTML = '<option value="">Selecione uma empresa</option>';
            
            querySnapshot.forEach((doc) => {
                const empresa = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = empresa.nome;
                empresaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading empresas:', error);
            alert('Erro ao carregar empresas. Por favor, tente novamente.');
        }
    };

    // Calculate total value
    const calculateTotal = () => {
        const valor = parseFloat(valorCheque.value) || 0;
        const juros = parseFloat(taxaJuros.value) || 0;
        const impostos = parseFloat(taxaImpostos.value) || 0;
        const dataInicialValue = new Date(dataInicial.value);
        const dataFinalValue = new Date(dataFinal.value);
        
        if (!dataInicialValue || !dataFinalValue || dataFinalValue < dataInicialValue) {
            valorTotal.value = formatCurrency(0);
            return;
        }

        const dias = daysBetweenDates(dataInicialValue, dataFinalValue);
        const valorJuros = calculateInterest(valor, juros, dias);
        const valorImpostos = (valor * (impostos / 100));

        const tipoCalculo = document.querySelector('input[name="tipoCalculo"]:checked').value;
        let total;

        if (tipoCalculo === 'incluir') {
            total = valor + valorJuros + valorImpostos;
        } else {
            total = valor - valorJuros - valorImpostos;
        }

        valorTotal.value = formatCurrency(total);
        return total;
    };

    // Event listeners for calculation
    [dataInicial, dataFinal, valorCheque, taxaJuros, taxaImpostos].forEach(input => {
        input.addEventListener('input', calculateTotal);
    });

    tipoCalculoInputs.forEach(input => {
        input.addEventListener('change', calculateTotal);
    });

    // Handle date changes
    dataInicial.addEventListener('change', () => {
        dataFinal.min = dataInicial.value;
        if (dataFinal.value && new Date(dataFinal.value) < new Date(dataInicial.value)) {
            dataFinal.value = dataInicial.value;
        }
        calculateTotal();
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!auth.currentUser) {
            alert('Você precisa estar logado para adicionar um cheque.');
            return;
        }

        const chequeData = {
            userId: auth.currentUser.uid,
            empresaFomentoId: empresaSelect.value,
            empresaFomento: empresaSelect.options[empresaSelect.selectedIndex].text,
            dataInicial: new Date(dataInicial.value),
            dataFinal: new Date(dataFinal.value),
            valor: parseFloat(valorCheque.value),
            taxaJuros: parseFloat(taxaJuros.value),
            taxaImpostos: parseFloat(taxaImpostos.value),
            tipoCalculo: document.querySelector('input[name="tipoCalculo"]:checked').value,
            valorTotal: calculateTotal(),
            status: 'pendente',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        try {
            await addDoc(collection(db, 'cheques'), chequeData);
            alert('Cheque adicionado com sucesso!');
            form.reset();
            dataInicial.value = today;
            valorTotal.value = '';
        } catch (error) {
            console.error('Error adding cheque:', error);
            alert('Erro ao adicionar cheque. Por favor, tente novamente.');
        }
    });

    // Initialize
    loadEmpresas();
}); 