# Sistema de Gestão de Cheques

Sistema web progressivo (PWA) para gestão e controle de cheques pré-datados, desenvolvido com HTML, CSS e JavaScript puro, utilizando Firebase como backend.

## Funcionalidades

- 📝 Cadastro e autenticação de usuários
- 💰 Cadastro e gestão de cheques pré-datados
- 🏢 Cadastro e gestão de empresas de fomento
- 📅 Agenda de vencimentos
- 📊 Relatórios e gráficos
- 🔔 Sistema de notificações
- 💾 Backup e restauração de dados
- 📱 Funciona offline (PWA)
- 🔄 Sincronização automática
- 🎨 Interface moderna e responsiva

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase
  - Authentication
  - Firestore
  - Storage
  - Hosting
- Service Workers
- IndexedDB
- PWA

## Pré-requisitos

- Node.js (v14 ou superior)
- NPM ou Yarn
- Conta no Firebase
- Firebase CLI

## Configuração

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/sistema-cheques.git
cd sistema-cheques
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure o Firebase:
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com)
   - Ative o Authentication, Firestore e Storage
   - Copie as configurações do seu projeto para o arquivo `js/firebase-config.js`

4. Inicie o servidor de desenvolvimento:
```bash
firebase serve
```

5. Acesse o sistema em `http://localhost:5000`

## Deploy

1. Faça login no Firebase:
```bash
firebase login
```

2. Inicialize o projeto Firebase (se ainda não inicializado):
```bash
firebase init
```

3. Deploy para o Firebase Hosting:
```bash
firebase deploy
```

## Estrutura do Projeto

```
sistema-cheques/
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── firebase-config.js
│   ├── register-sw.js
│   └── settings-menu.js
├── icons/
│   └── [ícones do app]
├── index.html
├── login.html
├── offline.html
├── manifest.json
├── sw.js
├── firebase.json
├── firestore.rules
├── storage.rules
└── README.md
```

## Segurança

- Autenticação de usuários
- Regras de segurança no Firestore e Storage
- HTTPS forçado
- Headers de segurança configurados
- Validação de dados
- Proteção contra XSS e CSRF
- Backup automático

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das mudanças (`git commit -am 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Suporte

Para suporte, envie um email para suporte@sistemacheques.com ou abra uma issue no GitHub.
