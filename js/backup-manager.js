import { auth, db } from './firebase-config.js';
import { 
    collection, 
    query, 
    getDocs, 
    doc, 
    setDoc,
    where 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatDate, formatBytes } from './utils.js';

export class BackupManager {
    constructor() {
        this.collections = ['empresas', 'cheques', 'userSettings'];
    }

    async createBackup() {
        try {
            const userId = auth.currentUser.uid;
            const timestamp = new Date();
            const backupData = {
                timestamp,
                userId,
                data: {},
                metadata: {
                    version: '1.0',
                    collections: this.collections,
                    totalDocuments: 0,
                    size: 0
                }
            };

            // Coletar dados de todas as coleções
            for (const collectionName of this.collections) {
                const q = query(
                    collection(db, collectionName),
                    where('userId', '==', userId)
                );
                
                const querySnapshot = await getDocs(q);
                backupData.data[collectionName] = {};
                
                querySnapshot.forEach(doc => {
                    backupData.data[collectionName][doc.id] = doc.data();
                    backupData.metadata.totalDocuments++;
                });
            }

            // Calcular tamanho aproximado do backup
            const backupString = JSON.stringify(backupData);
            backupData.metadata.size = new Blob([backupString]).size;

            // Salvar registro do backup
            const backupId = `backup_${timestamp.getTime()}`;
            await setDoc(doc(db, 'backups', backupId), {
                userId,
                timestamp,
                metadata: backupData.metadata
            });

            // Preparar arquivo para download
            const blob = new Blob([backupString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${formatDate(timestamp).replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return {
                success: true,
                metadata: backupData.metadata,
                timestamp
            };
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            throw error;
        }
    }

    async restoreBackup(file) {
        try {
            const userId = auth.currentUser.uid;
            const fileContent = await this.readFile(file);
            const backupData = JSON.parse(fileContent);

            // Validar backup
            if (!this.validateBackup(backupData)) {
                throw new Error('Arquivo de backup inválido ou corrompido.');
            }

            // Verificar se o backup pertence ao usuário
            if (backupData.userId !== userId) {
                throw new Error('Este backup pertence a outro usuário.');
            }

            // Restaurar dados
            for (const collectionName of this.collections) {
                if (backupData.data[collectionName]) {
                    for (const [docId, docData] of Object.entries(backupData.data[collectionName])) {
                        await setDoc(doc(db, collectionName, docId), docData);
                    }
                }
            }

            // Registrar restauração
            await setDoc(doc(db, 'backupRestores', `restore_${Date.now()}`), {
                userId,
                timestamp: new Date(),
                backupTimestamp: backupData.timestamp,
                metadata: backupData.metadata
            });

            return {
                success: true,
                metadata: backupData.metadata
            };
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            throw error;
        }
    }

    validateBackup(backupData) {
        return (
            backupData &&
            backupData.timestamp &&
            backupData.userId &&
            backupData.data &&
            backupData.metadata &&
            backupData.metadata.version === '1.0' &&
            Array.isArray(backupData.metadata.collections)
        );
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    async getBackupHistory() {
        try {
            const userId = auth.currentUser.uid;
            const q = query(
                collection(db, 'backups'),
                where('userId', '==', userId)
            );
            
            const querySnapshot = await getDocs(q);
            const backups = [];
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                backups.push({
                    id: doc.id,
                    ...data,
                    formattedSize: formatBytes(data.metadata.size),
                    formattedDate: formatDate(data.timestamp.toDate())
                });
            });
            
            return backups.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Erro ao obter histórico de backups:', error);
            throw error;
        }
    }

    async scheduleAutomaticBackup(frequency) {
        const userId = auth.currentUser.uid;
        await setDoc(doc(db, 'backupSchedules', userId), {
            userId,
            frequency,
            lastBackup: new Date(),
            nextBackup: this.calculateNextBackup(frequency),
            active: true
        });
    }

    calculateNextBackup(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                return new Date(now.setDate(now.getDate() + 1));
            case 'weekly':
                return new Date(now.setDate(now.getDate() + 7));
            case 'monthly':
                return new Date(now.setMonth(now.getMonth() + 1));
            default:
                return new Date(now.setDate(now.getDate() + 1));
        }
    }
} 