# Índices Necessários para o Firestore

## Problema
O Firebase está exigindo índices compostos para as consultas que estão sendo feitas no sistema. Esta é uma lista dos índices que precisam ser criados.

## Índices Obrigatórios

### 1. Coleção `cheques` - Notificações e Dashboard

**Índice 1: empresaId + criadoEm**
- Collection ID: `cheques`
- Campos:
  - `empresaId` (Ascending)
  - `criadoEm` (Descending)

**Índice 2: empresaId + status + vencimento**
- Collection ID: `cheques`
- Campos:
  - `empresaId` (Ascending)
  - `status` (Ascending)
  - `vencimento` (Ascending)

**Índice 3: empresaId + vencimento**
- Collection ID: `cheques`
- Campos:
  - `empresaId` (Ascending)
  - `vencimento` (Ascending)

## Como Criar os Índices

### Opção 1: Através do Console Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto `dbcheques`
3. Vá para **Firestore Database** → **Indexes**
4. Clique em **Create Index**
5. Configure cada índice conforme especificado acima

### Opção 2: Através dos Links de Erro
O Firebase fornece links diretos nos erros para criar os índices automaticamente:

**Link 1:** [Criar índice empresaId + criadoEm](https://console.firebase.google.com/v1/r/project/dbcheques/firestore/indexes?create_composite=Cklwcm9qZWN0cy9kYmNoZXF1ZXMvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NoZXF1ZXMvaW5kZXhlcy9fEAEaDQoJZW1wcmVzYUlkEAEaDAoIY3JpYWRvRW0QAhoMCghfX25hbWVfXxAC)

**Link 2:** [Criar índice empresaId + status + vencimento](https://console.firebase.google.com/v1/r/project/dbcheques/firestore/indexes?create_composite=Cklwcm9qZWN0cy9kYmNoZXF1ZXMvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NoZXF1ZXMvaW5kZXhlcy9fEAEaDQoJZW1wcmVzYUlkEAEaCgoGc3RhdHVzEAEaDgoKdmVuY2ltZW50bxABGgwKCF9fbmFtZV9fEAE)

### Opção 3: Via Firebase CLI (firebase.json)
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

## Arquivo firestore.indexes.json
Crie um arquivo `firestore.indexes.json` com o seguinte conteúdo:

```json
{
  "indexes": [
    {
      "collectionGroup": "cheques",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "empresaId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "criadoEm",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "cheques",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "empresaId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "vencimento",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "cheques",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "empresaId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "vencimento",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Comandos para Deploy dos Índices
```bash
# Instalar Firebase CLI (se não instalado)
npm install -g firebase-tools

# Login no Firebase
firebase login

# Deploy dos índices
firebase deploy --only firestore:indexes
```

## Status dos Índices
Após criar os índices, eles podem levar alguns minutos para serem construídos. Você pode acompanhar o progresso no Firebase Console em **Firestore** → **Indexes**.

## Troubleshooting

### Se os erros persistirem:
1. Verifique se todos os índices foram criados corretamente
2. Aguarde a construção completa dos índices (pode levar alguns minutos)
3. Limpe o cache do navegador
4. Recarregue a aplicação

### Logs de erro típicos:
- `The query requires an index` - Índice necessário não foi criado
- `Missing or insufficient permissions` - Problema nas regras de segurança (corrigido) 