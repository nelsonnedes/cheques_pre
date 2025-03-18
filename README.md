# Sistema de Gestão de Cheques

Um aplicativo web progressivo (PWA) para gerenciamento de cheques e empresas de fomento, com suporte offline e notificações.

## 🚀 Funcionalidades

- Dashboard com visão geral dos cheques
- Cadastro e gerenciamento de empresas de fomento
- Registro e acompanhamento de cheques
- Cálculo automático de juros e impostos
- Notificações de vencimentos
- Exportação de relatórios para PDF
- Compartilhamento via WhatsApp
- Funciona offline (PWA)
- Interface responsiva otimizada para iPhone

## 📋 Pré-requisitos

- Conta no Firebase
- Navegador moderno (preferencialmente Safari para iOS)
- Servidor web para hospedagem (ex: GitHub Pages)

## 🔧 Configuração

1. Clone este repositório
```bash
git clone [URL_DO_REPOSITÓRIO]
cd [NOME_DO_DIRETÓRIO]
```

2. Configure o Firebase:
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com)
   - Ative Authentication, Firestore e Storage
   - Copie as credenciais do projeto

3. Atualize o arquivo `js/firebase-config.js` com suas credenciais:
```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "seu-app.firebaseapp.com",
    projectId: "seu-project-id",
    storageBucket: "seu-app.appspot.com",
    messagingSenderId: "seu-messaging-sender-id",
    appId: "seu-app-id"
};
```

4. Configure as regras do Firestore:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📱 Instalação no iPhone

1. Abra o aplicativo no Safari
2. Toque no ícone de compartilhamento
3. Selecione "Adicionar à Tela de Início"
4. Escolha um nome e confirme

## 🗂️ Estrutura do Projeto

```
/
├── index.html          # Página principal (Dashboard)
├── css/
│   └── style.css      # Estilos globais
├── js/
│   ├── app.js         # Funcionalidades comuns
│   ├── dashboard.js   # Lógica do dashboard
│   └── firebase-config.js # Configuração do Firebase
├── icons/             # Ícones do PWA
└── sw.js             # Service Worker
```

## 🔐 Segurança

- Autenticação via Firebase
- Dados criptografados em trânsito
- Regras de segurança no Firestore
- Validação de dados no cliente e servidor

## 📦 Desenvolvimento

Para desenvolver localmente:

1. Instale um servidor local (ex: Live Server no VS Code)
2. Execute o servidor
3. Acesse via `http://localhost:5500`

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes

## ✨ Contribuindo

1. Faça o fork do projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 🤝 Suporte

Para suporte, envie um email para [seu-email@exemplo.com]

## 🔍 Status do Projeto

Em desenvolvimento ativo. Veja a aba [Issues](../../issues) para acompanhar o progresso. 