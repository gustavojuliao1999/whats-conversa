# WhatsConversa

Sistema de atendimento ao cliente via WhatsApp, similar ao Chatwoot, integrado com a Evolution API.

## Tecnologias

- **Backend**: Node.js, Express, TypeScript, Prisma, Socket.IO
- **Frontend**: Next.js 14, TailwindCSS, shadcn/ui, Zustand
- **Banco de Dados**: PostgreSQL
- **API WhatsApp**: Evolution API v2.3

## Requisitos

- Node.js 18+
- Docker e Docker Compose
- Evolution API rodando (sua instância)

## Instalação

### 1. Iniciar o banco de dados

```bash
docker-compose up -d
```

### 2. Configurar o Backend

```bash
cd backend

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas configurações:
# - DATABASE_URL (já configurado para Docker)
# - EVOLUTION_API_URL (URL da sua Evolution API)
# - EVOLUTION_API_KEY (sua API key)
# - JWT_SECRET (gere uma chave segura)

# Instalar dependências
npm install

# Executar migrations do Prisma
npx prisma migrate dev

# Iniciar servidor
npm run dev
```

### 3. Configurar o Frontend

```bash
cd frontend

# Copiar arquivo de ambiente
cp .env.example .env.local

# Instalar dependências
npm install

# Iniciar servidor
npm run dev
```

### 4. Acessar o sistema

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Primeiro acesso

1. Acesse http://localhost:3000
2. Crie uma conta (o primeiro usuário será automaticamente admin)
3. Vá em Configurações > Instâncias WhatsApp
4. Crie uma nova instância e escaneie o QR Code

## Configurar Webhook na Evolution API

Para receber mensagens, configure o webhook na sua Evolution API:

**URL do Webhook**: `http://SEU_IP:3001/api/webhook`

**Eventos recomendados**:
- MESSAGES_UPSERT
- MESSAGES_UPDATE
- CONNECTION_UPDATE
- QRCODE_UPDATED
- CONTACTS_UPSERT

## Funcionalidades

- Gerenciamento de múltiplas instâncias WhatsApp
- Chat em tempo real com Socket.IO
- Envio de texto, imagens, vídeos, áudios e documentos
- Sistema de conversas com status (Aberta, Pendente, Resolvida)
- Atribuição de conversas a agentes
- Etiquetas coloridas para organização
- Times de atendimento
- Sistema de usuários com roles (Admin, Agente)

## Estrutura do Projeto

```
whats-conversa/
├── docker-compose.yml     # PostgreSQL e Redis
├── backend/
│   ├── prisma/
│   │   └── schema.prisma  # Modelos do banco
│   └── src/
│       ├── controllers/   # Controladores REST
│       ├── services/      # Serviços (Prisma, Evolution API)
│       ├── routes/        # Rotas da API
│       ├── middlewares/   # Auth, etc
│       └── websocket/     # Socket.IO
└── frontend/
    └── src/
        ├── app/           # Páginas Next.js
        ├── components/    # Componentes React
        └── lib/           # Utils, API, Store
```

## Scripts

### Backend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build
npm run start        # Produção
npm run prisma:studio # Visualizar banco
```

### Frontend
```bash
npm run dev    # Desenvolvimento
npm run build  # Build
npm run start  # Produção
```

## Variáveis de Ambiente

### Backend (.env)
```env
DATABASE_URL="postgresql://whatsconversa:whatsconversa123@localhost:5432/whatsconversa"
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="sua-api-key"
JWT_SECRET="sua-chave-jwt-32-caracteres"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=http://localhost:3001
```
