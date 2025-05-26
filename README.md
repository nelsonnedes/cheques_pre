# Sistema de Gestão e Operações Financeiras

Um sistema web moderno e completo para gestão financeira multi-empresa, focado no controle de cheques e operações bancárias.

## 🚀 Características

### Funcionalidades Principais
- **Gestão Multi-Empresa**: Suporte para múltiplas empresas em uma única instalação
- **Controle de Cheques**: Cadastro, listagem, compensação e controle de vencimentos
- **Agenda Financeira**: Calendário integrado com eventos e lembretes
- **Relatórios**: Dashboards e relatórios financeiros detalhados
- **PWA**: Aplicativo web progressivo com funcionamento offline
- **Autenticação Segura**: Sistema de login com Firebase Authentication

### Tecnologias Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **PWA**: Service Workers, Cache API, Web App Manifest
- **UI/UX**: Design responsivo e moderno
- **Segurança**: Autenticação Firebase, validação de dados

## 📋 Pré-requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexão com internet para configuração inicial
- Conta no Firebase (gratuita)

## 🛠️ Instalação

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/sistema-financeiro.git
cd sistema-financeiro
```

### 2. Configuração do Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative os seguintes serviços:
   - **Authentication** (Email/Password)
   - **Firestore Database**
   - **Storage**

### 3. Configuração das Credenciais

1. No console do Firebase, vá em **Configurações do Projeto**
2. Na aba **Geral**, role até **Seus apps**
3. Clique em **Adicionar app** e selecione **Web**
4. Copie as credenciais e cole no arquivo `js/config.js`:

```javascript
// js/config.js
const firebaseConfig = {
    apiKey: "sua-api-key",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "sua-app-id"
};
```

### 4. Configuração do Firestore

1. No console do Firebase, vá em **Firestore Database**
2. Clique em **Criar banco de dados**
3. Escolha **Iniciar no modo de teste**
4. Configure as regras de segurança:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso apenas para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas para cheques
    match /cheques/{chequeId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Regras específicas para eventos
    match /events/{eventId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Regras específicas para empresas
    match /companies/{companyId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.users;
    }
  }
}
```

### 5. Configuração do Storage

1. No console do Firebase, vá em **Storage**
2. Clique em **Começar**
3. Configure as regras de segurança:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Execução

### Desenvolvimento Local

1. **Servidor Local**: Use um servidor HTTP local para desenvolvimento:
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

2. **Acesse**: Abra `http://localhost:8000` no navegador

### Deploy em Produção

#### Firebase Hosting (Recomendado)
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar projeto
firebase init hosting

# Deploy
firebase deploy
```

#### Outros Serviços
- **Netlify**: Arraste a pasta do projeto para netlify.com
- **Vercel**: Conecte o repositório GitHub
- **GitHub Pages**: Configure nas configurações do repositório

## 📱 Funcionalidades

### Autenticação
- Login com email e senha
- Registro de novos usuários
- Recuperação de senha
- Logout seguro

### Gestão de Cheques
- **Cadastro**: Incluir novos cheques com validação
- **Listagem**: Visualizar todos os cheques com filtros
- **Edição**: Modificar dados dos cheques
- **Status**: Controlar status (pendente, compensado, devolvido)
- **Imagens**: Upload de fotos dos cheques
- **Juros**: Cálculo automático de juros em atraso

### Agenda
- **Calendário**: Visualização mensal e em lista
- **Eventos**: Criar eventos personalizados
- **Lembretes**: Notificações automáticas
- **Integração**: Eventos automáticos de vencimento de cheques

### Configurações
- **Perfil**: Gerenciar dados pessoais
- **Segurança**: Alterar senha, 2FA
- **Notificações**: Configurar preferências
- **Aparência**: Tema claro/escuro
- **Dados**: Exportar e gerenciar dados

### Suporte
- **Chat Online**: Assistente virtual
- **FAQ**: Perguntas frequentes
- **Tickets**: Sistema de suporte
- **Documentação**: Guias e tutoriais

## 🔧 Configuração Avançada

### Personalização de Cores
Edite as variáveis CSS em `css/global.css`:
```css
:root {
    --primary-500: #3b82f6;    /* Cor principal */
    --primary-600: #2563eb;    /* Cor principal escura */
    --success-500: #10b981;    /* Cor de sucesso */
    --error-500: #ef4444;      /* Cor de erro */
    --warning-500: #f59e0b;    /* Cor de aviso */
}
```

### Configuração de Juros
Modifique as taxas em `js/listarCheques.js`:
```javascript
const TAXA_JUROS_DIARIA = 0.0033; // 0.33% ao dia
const MULTA_ATRASO = 0.02;         // 2% de multa
```

### Notificações Push
Para ativar notificações push:
1. Configure Firebase Cloud Messaging
2. Adicione as credenciais em `js/config.js`
3. Implemente o service worker para notificações

## 📊 Estrutura do Projeto

```
sistema-financeiro/
├── index.html              # Dashboard principal
├── login.html              # Página de login
├── listarCheques.html      # Listagem de cheques
├── incluirCheque.html      # Cadastro/edição de cheques
├── agenda.html             # Agenda e calendário
├── configuracoes.html      # Configurações do usuário
├── suporte.html            # Página de suporte
├── offline.html            # Página offline (PWA)
├── manifest.json           # Manifesto PWA
├── sw.js                   # Service Worker
├── css/
│   └── global.css          # Estilos globais
├── js/
│   ├── config.js           # Configurações Firebase
│   ├── auth.js             # Autenticação
│   ├── utils.js            # Funções utilitárias
│   ├── masks.js            # Máscaras de input
│   ├── listarCheques.js    # Lógica da listagem
│   ├── incluirCheque.js    # Lógica do cadastro
│   ├── agenda.js           # Lógica da agenda
│   ├── configuracoes.js    # Lógica das configurações
│   └── suporte.js          # Lógica do suporte
└── icons/                  # Ícones PWA
```

## 🔒 Segurança

### Boas Práticas Implementadas
- Autenticação obrigatória para todas as operações
- Validação de dados no frontend e backend
- Regras de segurança do Firestore
- Sanitização de inputs
- Proteção contra XSS e CSRF

### Configurações Recomendadas
- Use HTTPS em produção
- Configure CSP (Content Security Policy)
- Mantenha as dependências atualizadas
- Monitore logs de acesso

## 🐛 Solução de Problemas

### Problemas Comuns

**Erro de Autenticação**
- Verifique as credenciais do Firebase
- Confirme se o Authentication está ativado
- Verifique as regras do Firestore

**Dados não Carregam**
- Verifique a conexão com internet
- Confirme se o Firestore está configurado
- Verifique as regras de segurança

**PWA não Funciona**
- Confirme se está usando HTTPS
- Verifique se o Service Worker está registrado
- Limpe o cache do navegador

### Logs e Debug
- Abra o Console do Desenvolvedor (F12)
- Verifique a aba Network para requisições
- Monitore a aba Application para PWA

## 📈 Roadmap

### Próximas Funcionalidades
- [ ] Relatórios avançados com gráficos
- [ ] Integração com bancos (Open Banking)
- [ ] App mobile nativo
- [ ] Sistema de backup automático
- [ ] Integração com contabilidade
- [ ] API REST para integrações

### Melhorias Planejadas
- [ ] Performance otimizada
- [ ] Testes automatizados
- [ ] Documentação da API
- [ ] Suporte a múltiplos idiomas
- [ ] Tema escuro completo

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

- **Email**: suporte@sistemafinanceiro.com
- **Documentação**: [docs.sistemafinanceiro.com](https://docs.sistemafinanceiro.com)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/sistema-financeiro/issues)

## 🙏 Agradecimentos

- Firebase pela infraestrutura
- Font Awesome pelos ícones
- Google Fonts pelas fontes
- Comunidade open source

---

**Desenvolvido com ❤️ para gestão financeira eficiente**
