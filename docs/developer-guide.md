# Guia do Desenvolvedor - Sistema de Cheques

## Configuração do Ambiente

### Requisitos
- Node.js >= 14.x
- NPM >= 6.x
- Git
- Editor de código (recomendado: VS Code)
- Firebase CLI

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/sistema-cheques.git
cd sistema-cheques
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o Firebase:
```bash
npm install -g firebase-tools
firebase login
firebase init
```

4. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

## Estrutura do Código

### Organização de Arquivos
```
sistema-cheques/
├── css/                    # Estilos
│   └── style.css          # Estilos globais
├── js/                    # JavaScript
│   ├── modules/           # Módulos reutilizáveis
│   ├── pages/            # Lógica específica de páginas
│   └── utils/            # Funções utilitárias
├── tests/                # Testes
│   ├── unit/            # Testes unitários
│   └── integration/     # Testes de integração
└── docs/                # Documentação
```

### Convenções de Código

#### Nomenclatura
- Classes: PascalCase (ex: `ChatManager`)
- Funções/Métodos: camelCase (ex: `sendMessage`)
- Variáveis: camelCase (ex: `userEmail`)
- Constantes: SNAKE_CASE (ex: `MAX_RETRY_ATTEMPTS`)
- Arquivos: kebab-case (ex: `chat-manager.js`)

#### Estilo
```javascript
// Classes
class ExampleClass {
    constructor() {
        this.property = value;
    }

    method() {
        // ...
    }
}

// Funções
async function doSomething() {
    try {
        await someAsyncOperation();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Constantes
const CONFIG = {
    maxRetries: 3,
    timeout: 5000
};
```

## Fluxo de Desenvolvimento

### 1. Branches
- `main`: Código em produção
- `develop`: Branch de desenvolvimento
- `feature/*`: Novas funcionalidades
- `bugfix/*`: Correções de bugs
- `release/*`: Preparação para release

### 2. Commits
```bash
# Formato
<tipo>(<escopo>): <descrição>

# Exemplos
feat(auth): adiciona autenticação com Google
fix(chat): corrige erro no envio de mensagens
docs(api): atualiza documentação de endpoints
```

### 3. Pull Requests
- Título descritivo
- Descrição detalhada das mudanças
- Testes incluídos
- Code review obrigatório

## Testes

### Unitários
```javascript
// Exemplo de teste unitário
describe('ChatManager', () => {
    let chatManager;

    beforeEach(() => {
        chatManager = new ChatManager();
    });

    it('should send message', async () => {
        const result = await chatManager.sendMessage('Hello');
        expect(result.success).toBeTruthy();
    });
});
```

### Integração
```javascript
// Exemplo de teste de integração
describe('Chat Flow', () => {
    it('should complete chat session', async () => {
        // Setup
        const user = await auth.login();
        const chat = new ChatManager(user);

        // Actions
        await chat.initiate();
        await chat.sendMessage('Hello');
        const messages = await chat.getMessages();

        // Assertions
        expect(messages).toHaveLength(1);
        expect(messages[0].text).toBe('Hello');
    });
});
```

## Debug

### Console
```javascript
// Níveis de log
console.debug('Informação detalhada');
console.info('Informação geral');
console.warn('Aviso');
console.error('Erro');

// Grupos
console.group('Operação');
console.log('Passo 1');
console.log('Passo 2');
console.groupEnd();

// Performance
console.time('operação');
// ... código ...
console.timeEnd('operação');
```

### Firebase Debug
```javascript
// Ativar logs do Firebase
firebase.database.enableLogging(true);

// Debug do Authentication
firebase.auth().onAuthStateChanged(user => {
    console.log('Auth State:', user);
});

// Debug do Firestore
db.collection('cheques')
    .onSnapshot(snapshot => {
        console.log('Snapshot:', snapshot.docs);
    }, error => {
        console.error('Error:', error);
    });
```

## Deploy

### 1. Preparação
```bash
# Verificar código
npm run lint
npm test

# Build
npm run build
```

### 2. Firebase Deploy
```bash
# Deploy completo
firebase deploy

# Deploy parcial
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

### 3. Monitoramento
```javascript
// Analytics
firebase.analytics().logEvent('page_view', {
    page_title: 'Home',
    page_location: '/'
});

// Performance
const trace = firebase.performance().trace('data_load');
trace.start();
// ... operação ...
trace.stop();
```

## Boas Práticas

### Segurança
- Sempre use HTTPS
- Implemente rate limiting
- Valide inputs do usuário
- Use tokens JWT para autenticação
- Implemente timeout em operações assíncronas

### Performance
- Minimize requisições HTTP
- Use lazy loading para módulos
- Implemente caching
- Otimize imagens e assets
- Use compressão gzip

### Manutenibilidade
- Documente código complexo
- Mantenha funções pequenas e focadas
- Use TypeScript para projetos grandes
- Implemente logging adequado
- Faça revisões de código regulares

## Troubleshooting

### Problemas Comuns

1. **Erro de CORS**
```javascript
// Adicione ao firebase.json
{
  "hosting": {
    "headers": [{
      "source": "**",
      "headers": [{
        "key": "Access-Control-Allow-Origin",
        "value": "*"
      }]
    }]
  }
}
```

2. **Limite de Requisições**
```javascript
// Implementar retry com backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fetch(url, options);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
}
```

3. **Memory Leaks**
```javascript
// Limpar listeners
class Component {
    constructor() {
        this.unsubscribe = null;
    }

    init() {
        this.unsubscribe = db.collection('data')
            .onSnapshot(snapshot => {
                // ...
            });
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
```

## Recursos

### Documentação
- [Firebase Docs](https://firebase.google.com/docs)
- [Jest Docs](https://jestjs.io/docs)
- [MDN Web Docs](https://developer.mozilla.org)

### Ferramentas
- [Firebase Console](https://console.firebase.google.com)
- [VS Code Extensions](https://marketplace.visualstudio.com)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)

### Comunidade
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
- [GitHub Issues](https://github.com/firebase/firebase-js-sdk/issues)
- [Firebase Blog](https://firebase.blog) 