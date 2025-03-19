# Documentação Técnica - Sistema de Cheques

## Visão Geral
O Sistema de Cheques é uma aplicação web desenvolvida para gerenciar cheques e empresas, oferecendo funcionalidades como cadastro, controle de vencimentos, relatórios e notificações.

## Arquitetura

### Frontend
- HTML5, CSS3 e JavaScript puro
- Design responsivo com CSS Grid e Flexbox
- Componentes modulares e reutilizáveis

### Backend
- Firebase como backend-as-a-service
- Firestore para banco de dados
- Firebase Authentication para autenticação
- Firebase Cloud Messaging para notificações push

## Estrutura do Projeto

```
sistema-cheques/
├── css/
│   └── style.css          # Estilos globais
├── js/
│   ├── firebase-config.js # Configuração do Firebase
│   ├── auth-manager.js    # Gerenciamento de autenticação
│   ├── chat-manager.js    # Gerenciamento do chat de suporte
│   ├── export-manager.js  # Exportação de dados
│   └── utils.js          # Funções utilitárias
├── tests/
│   ├── setup.js          # Configuração dos testes
│   └── *.test.js         # Arquivos de teste
└── *.html                # Páginas da aplicação
```

## Módulos Principais

### AuthManager
Responsável pelo gerenciamento de autenticação de usuários.

```javascript
class AuthManager {
    async login(email, password)
    async register(email, password)
    async logout()
    onAuthStateChanged(callback)
}
```

### ChatManager
Gerencia o chat de suporte em tempo real.

```javascript
class ChatManager {
    async initChat()
    async sendMessage(text)
    async closeChat()
    checkSupportStatus()
}
```

### ExportManager
Gerencia a exportação de dados para Excel e PDF.

```javascript
class ExportManager {
    async exportToExcel(data, filename)
    async exportToPDF(data, filename)
    async getChequeData(filters)
}
```

## Banco de Dados

### Coleções do Firestore

#### users
```javascript
{
    uid: string,
    email: string,
    settings: {
        notifications: boolean,
        theme: string,
        alertDays: number
    }
}
```

#### empresas
```javascript
{
    id: string,
    userId: string,
    nome: string,
    cnpj: string,
    telefone: string,
    email: string,
    endereco: {
        rua: string,
        numero: string,
        complemento: string,
        bairro: string,
        cidade: string,
        estado: string,
        cep: string
    }
}
```

#### cheques
```javascript
{
    id: string,
    userId: string,
    empresaId: string,
    numero: string,
    valor: number,
    dataEmissao: timestamp,
    dataVencimento: timestamp,
    status: 'pendente' | 'compensado' | 'devolvido',
    observacoes: string
}
```

#### chats
```javascript
{
    id: string,
    userId: string,
    userEmail: string,
    status: 'active' | 'closed',
    createdAt: timestamp,
    lastMessage: string,
    lastMessageTime: timestamp,
    unreadCount: number
}
```

#### messages
```javascript
{
    id: string,
    chatId: string,
    userId: string,
    text: string,
    timestamp: timestamp,
    type: 'user' | 'support'
}
```

## Segurança

### Regras do Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuário autenticado pode ler/escrever seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Empresas e cheques são acessíveis apenas pelo proprietário
    match /empresas/{empresaId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /cheques/{chequeId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // Chat e mensagens são acessíveis pelos participantes
    match /chats/{chatId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    match /messages/{messageId} {
      allow read: if request.auth.uid == get(/databases/$(database)/documents/chats/$(resource.data.chatId)).data.userId;
      allow create: if request.auth.uid != null;
    }
  }
}
```

## Testes

### Unitários
- Testes de componentes individuais
- Mocks para Firebase e DOM
- Cobertura de código

### Integração
- Fluxos completos de funcionalidades
- Simulação de interações do usuário
- Testes de edge cases

## Deploy

### Requisitos
- Node.js >= 14.x
- NPM >= 6.x
- Conta no Firebase

### Configuração
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis do Firebase em `js/firebase-config.js`
4. Execute os testes: `npm test`
5. Deploy para produção: `firebase deploy`

## Manutenção

### Logs
- Logs de erro são enviados para o Firebase Analytics
- Monitoramento de performance via Firebase Performance
- Rastreamento de crashes via Firebase Crashlytics

### Backup
- Backup automático diário do Firestore
- Exportação manual de dados via interface
- Retenção de 30 dias para backups

## Roadmap

### Versão 1.1
- [ ] Implementação de PWA
- [ ] Melhorias de performance
- [ ] Audit logging
- [ ] Recuperação de senha

### Versão 1.2
- [ ] Dashboard personalizado
- [ ] Integração com APIs bancárias
- [ ] Relatórios avançados
- [ ] Multi-idioma 