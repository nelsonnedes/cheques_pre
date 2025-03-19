import { auth, db } from './firebase-config.js';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    loadCompanies();
    setupEventListeners();
});

// Load user profile
function loadUserProfile() {
    const user = auth.currentUser;
    if (user) {
        document.getElementById('userName').value = user.displayName || '';
        document.getElementById('userEmail').value = user.email || '';
    }
}

// Load companies
async function loadCompanies() {
    try {
        const companiesRef = collection(db, 'empresas');
        const snapshot = await getDocs(companiesRef);
        const companiesList = document.getElementById('companiesList');
        companiesList.innerHTML = '';

        snapshot.forEach(doc => {
            const company = doc.data();
            const companyElement = createCompanyElement(doc.id, company);
            companiesList.appendChild(companyElement);
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        alert('Erro ao carregar lista de empresas');
    }
}

// Create company element
function createCompanyElement(id, company) {
    const div = document.createElement('div');
    div.className = 'company-item';
    div.innerHTML = `
        <div class="company-info">
            <span class="company-name">${company.nome}</span>
            <span class="company-cnpj">${company.cnpj || ''}</span>
        </div>
        <div class="company-actions">
            <button class="icon-button edit-company" data-id="${id}">
                <span class="material-icons">edit</span>
            </button>
            <button class="icon-button delete-company" data-id="${id}">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `;

    // Add event listeners
    div.querySelector('.edit-company').addEventListener('click', () => editCompany(id, company));
    div.querySelector('.delete-company').addEventListener('click', () => deleteCompany(id, company.nome));

    return div;
}

// Setup event listeners
function setupEventListeners() {
    // Profile update
    document.getElementById('updateProfileBtn').addEventListener('click', updateUserProfile);

    // Company management
    document.getElementById('addCompanyBtn').addEventListener('click', addCompany);

    // Data management
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importData);

    // Security
    document.getElementById('changePasswordBtn').addEventListener('click', changePassword);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Update user profile
async function updateUserProfile() {
    try {
        const user = auth.currentUser;
        const newName = document.getElementById('userName').value.trim();

        if (user && newName) {
            await updateProfile(user, { displayName: newName });
            alert('Perfil atualizado com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        alert('Erro ao atualizar perfil');
    }
}

// Add new company
async function addCompany() {
    const nome = prompt('Nome da empresa:');
    if (!nome) return;

    const cnpj = prompt('CNPJ da empresa (opcional):');

    try {
        await addDoc(collection(db, 'empresas'), {
            nome,
            cnpj: cnpj || ''
        });
        loadCompanies();
    } catch (error) {
        console.error('Erro ao adicionar empresa:', error);
        alert('Erro ao adicionar empresa');
    }
}

// Edit company
async function editCompany(id, company) {
    const nome = prompt('Nome da empresa:', company.nome);
    if (!nome) return;

    const cnpj = prompt('CNPJ da empresa:', company.cnpj || '');

    try {
        await updateDoc(doc(db, 'empresas', id), {
            nome,
            cnpj: cnpj || ''
        });
        loadCompanies();
    } catch (error) {
        console.error('Erro ao editar empresa:', error);
        alert('Erro ao editar empresa');
    }
}

// Delete company
async function deleteCompany(id, nome) {
    if (!confirm(`Deseja realmente excluir a empresa "${nome}"?`)) return;

    try {
        // Check if company has checks
        const chequesRef = collection(db, 'cheques');
        const q = query(chequesRef, where('empresaId', '==', id));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            alert('Não é possível excluir esta empresa pois existem cheques vinculados a ela.');
            return;
        }

        await deleteDoc(doc(db, 'empresas', id));
        loadCompanies();
    } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        alert('Erro ao excluir empresa');
    }
}

// Export data
async function exportData() {
    try {
        const data = {
            empresas: [],
            cheques: []
        };

        // Get companies
        const empresasSnapshot = await getDocs(collection(db, 'empresas'));
        empresasSnapshot.forEach(doc => {
            data.empresas.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Get checks
        const chequesSnapshot = await getDocs(collection(db, 'cheques'));
        chequesSnapshot.forEach(doc => {
            data.cheques.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Create and download file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-cheques-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        alert('Erro ao exportar dados');
    }
}

// Import data
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!confirm('Esta operação irá substituir todos os dados existentes. Deseja continuar?')) {
                    return;
                }

                // Delete existing data
                const empresasSnapshot = await getDocs(collection(db, 'empresas'));
                const chequesSnapshot = await getDocs(collection(db, 'cheques'));

                for (const doc of empresasSnapshot.docs) {
                    await deleteDoc(doc.ref);
                }
                for (const doc of chequesSnapshot.docs) {
                    await deleteDoc(doc.ref);
                }

                // Import new data
                for (const empresa of data.empresas) {
                    const { id, ...empresaData } = empresa;
                    await addDoc(collection(db, 'empresas'), empresaData);
                }
                for (const cheque of data.cheques) {
                    const { id, ...chequeData } = cheque;
                    await addDoc(collection(db, 'cheques'), chequeData);
                }

                alert('Dados importados com sucesso!');
                loadCompanies();
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                alert('Erro ao processar arquivo de importação');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Erro ao importar dados:', error);
        alert('Erro ao importar dados');
    }
}

// Change password
async function changePassword() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const currentPassword = prompt('Digite sua senha atual:');
        if (!currentPassword) return;

        const newPassword = prompt('Digite a nova senha:');
        if (!newPassword) return;

        const confirmPassword = prompt('Confirme a nova senha:');
        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem');
            return;
        }

        // Reauthenticate user
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, newPassword);
        alert('Senha alterada com sucesso!');
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        alert('Erro ao alterar senha. Verifique se a senha atual está correta.');
    }
}

// Logout
async function logout() {
    if (!confirm('Deseja realmente sair?')) return;

    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout');
    }
}