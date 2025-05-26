# Sistema de Gestão e Operações Financeiras

## Visão Geral

Este projeto é um Sistema de Gestão e Operações Financeiras construído com HTML puro, JavaScript modularizado (ES Modules) e CSS minimalista, visando alta performance, responsividade e usabilidade tanto em desktop quanto em mobile (PWA).

Funcionalidades principais:

- Autenticação segura com Firebase Auth (email+senha e Google OAuth)
- Gestão multi-empresa: cada usuário pode cadastrar várias empresas e gerenciar cheques e operações específicas por empresa.
- Controle detalhado de cheques com geração, edição, baixa parcial, cálculo automático de juros.
- Dashboard com métricas e gráficos de status dos cheques.
- Páginas: login, registro, recuperação senha, listar/incluir/editar cheques, gestão de empresas, relatórios, agenda, suporte.
- Proteção de rotas para dados sensíveis usando Firebase onAuthStateChanged.
- PWA com manifest.json e service-worker.js para instalação e offline básico.

## Requisitos

- Node.js e npm para servidor local (opcional, pode usar qualquer servidor estático)
- Conta Firebase ativa com projeto configurado (Firestore, Auth, Storage)

## Setup

1. Clone este repositório.
2. Configure o Firebase:
   - Crie um projeto no Firebase Console.
   - Ative Authentication (email/senha e Google).
   - Crie Firestore Database com regras de segurança.
   - Configure Storage para upload de imagens.
   - Copie as credenciais do firebaseConfig e cole no arquivo `js/auth.js`.
3. (Opcional) Use servidor local para rodar, por exemplo:

```sh
npx http-server .
```

## Uso

- Acesse `login.html` para entrar.
- Registre-se em `register.html` se não tiver conta.
- Após login, selecione/registre sua empresa em `empresas.html`.
- Gerencie cheques em `listar-cheques.html` e `incluir-cheque.html`.
- Use o dashboard para visão geral dos status de cheques.

## Scripts

- Todos os scripts estão modularizados em `/js` e importados como módulos ES.
- Use `js/auth.js` para autenticação.
- Use `js/routeGuard.js` para proteção de rotas.

## Deploy

- Hospede em servidor HTTPS para que Firebase Auth funcione corretamente.
- Otimize imagens e recursos.
- Configure `manifest.json` e `service-worker.js` para PWA.

## Segurança

- Valide dados tanto no frontend quanto regras Firestore Realtime Database.
- Proteja rotas com autenticação Firebase.
- Nunca exponha chaves sensíveis publicamente.

## Contato

Para suporte, use a página `suporte.html` implementada no projeto.

---

Este projeto foi desenvolvido seguindo boas práticas, para oferecer uma solução leve, responsiva, segura e sustentável para gestão financeira multiempresa.
