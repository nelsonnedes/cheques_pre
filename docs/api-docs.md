# Documentação da API - Sistema de Cheques

## Autenticação

### Login
```javascript
POST /auth/login
{
    "email": string,
    "password": string
}

Resposta:
{
    "token": string,
    "user": {
        "uid": string,
        "email": string
    }
}
```

### Registro
```javascript
POST /auth/register
{
    "email": string,
    "password": string
}

Resposta:
{
    "token": string,
    "user": {
        "uid": string,
        "email": string
    }
}
```

## Empresas

### Listar Empresas
```javascript
GET /empresas
Headers: {
    "Authorization": "Bearer ${token}"
}

Resposta:
{
    "empresas": [
        {
            "id": string,
            "nome": string,
            "cnpj": string,
            "telefone": string,
            "email": string,
            "endereco": {
                "rua": string,
                "numero": string,
                "complemento": string,
                "bairro": string,
                "cidade": string,
                "estado": string,
                "cep": string
            }
        }
    ]
}
```

### Criar Empresa
```javascript
POST /empresas
Headers: {
    "Authorization": "Bearer ${token}"
}
Body: {
    "nome": string,
    "cnpj": string,
    "telefone": string,
    "email": string,
    "endereco": {
        "rua": string,
        "numero": string,
        "complemento": string,
        "bairro": string,
        "cidade": string,
        "estado": string,
        "cep": string
    }
}

Resposta:
{
    "id": string,
    "message": "Empresa criada com sucesso"
}
```

## Cheques

### Listar Cheques
```javascript
GET /cheques
Headers: {
    "Authorization": "Bearer ${token}"
}
Query: {
    "status": string?,
    "empresaId": string?,
    "dataInicio": string?,
    "dataFim": string?
}

Resposta:
{
    "cheques": [
        {
            "id": string,
            "empresaId": string,
            "numero": string,
            "valor": number,
            "dataEmissao": string,
            "dataVencimento": string,
            "status": string,
            "observacoes": string
        }
    ]
}
```

### Criar Cheque
```javascript
POST /cheques
Headers: {
    "Authorization": "Bearer ${token}"
}
Body: {
    "empresaId": string,
    "numero": string,
    "valor": number,
    "dataEmissao": string,
    "dataVencimento": string,
    "status": string,
    "observacoes": string
}

Resposta:
{
    "id": string,
    "message": "Cheque criado com sucesso"
}
```

## Chat

### Iniciar Chat
```javascript
POST /chat
Headers: {
    "Authorization": "Bearer ${token}"
}

Resposta:
{
    "chatId": string,
    "message": "Chat iniciado com sucesso"
}
```

### Enviar Mensagem
```javascript
POST /chat/{chatId}/messages
Headers: {
    "Authorization": "Bearer ${token}"
}
Body: {
    "text": string
}

Resposta:
{
    "id": string,
    "timestamp": string,
    "message": "Mensagem enviada com sucesso"
}
```

### Listar Mensagens
```javascript
GET /chat/{chatId}/messages
Headers: {
    "Authorization": "Bearer ${token}"
}

Resposta:
{
    "messages": [
        {
            "id": string,
            "text": string,
            "timestamp": string,
            "type": string,
            "userId": string
        }
    ]
}
```

## Relatórios

### Gerar Relatório
```javascript
POST /relatorios
Headers: {
    "Authorization": "Bearer ${token}"
}
Body: {
    "tipo": "excel" | "pdf",
    "filtros": {
        "dataInicio": string?,
        "dataFim": string?,
        "status": string?,
        "empresaId": string?
    }
}

Resposta:
{
    "url": string,
    "expiresAt": string
}
```

## Códigos de Erro

### 400 Bad Request
```javascript
{
    "error": "Requisição inválida",
    "message": string,
    "details": object?
}
```

### 401 Unauthorized
```javascript
{
    "error": "Não autorizado",
    "message": "Token inválido ou expirado"
}
```

### 403 Forbidden
```javascript
{
    "error": "Acesso negado",
    "message": "Sem permissão para acessar este recurso"
}
```

### 404 Not Found
```javascript
{
    "error": "Não encontrado",
    "message": string
}
```

### 500 Internal Server Error
```javascript
{
    "error": "Erro interno",
    "message": "Ocorreu um erro no servidor"
}
```

## Webhooks

### Notificação de Vencimento
```javascript
POST /webhook/vencimento
{
    "chequeId": string,
    "diasRestantes": number,
    "valor": number,
    "empresa": string
}
```

### Status do Suporte
```javascript
POST /webhook/suporte-status
{
    "online": boolean,
    "tempoEstimado": number
}
```

## Limites de Taxa

- 100 requisições por minuto por IP
- 1000 requisições por hora por usuário
- 50 uploads simultâneos
- Tamanho máximo de arquivo: 10MB
- Tamanho máximo de payload: 5MB

## Ambiente de Testes

Base URL: `https://api-test.sistemacheques.com`
Token de teste: `test_token_123`

### Dados de Exemplo
```javascript
// Empresa de teste
{
    "id": "test-company-1",
    "nome": "Empresa Teste",
    "cnpj": "12.345.678/0001-90"
}

// Cheque de teste
{
    "id": "test-check-1",
    "numero": "000001",
    "valor": 1000.00
}
``` 