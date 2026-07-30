# Infraestrutura do VERS

## Docker Compose

O ambiente de desenvolvimento local é gerenciado por Docker Compose.
O arquivo `docker-compose.yml` na raiz define os serviços:

| Serviço    | Porta (host → container) | Tecnologia               |
| ---------- | ------------------------ | ------------------------ |
| Redis      | 6379 → 6379              | Redis 7 Alpine           |
| Backend    | 3000 → 3000              | NestJS (Node 22)         |
| Web        | 3001 → 5173              | Vite + React + Tailwind  |
| Dashboard  | 3050 → 5174              | Vite + React + Electron  |
| Mobile     | 8080 → 8081              | Expo + React Native      |
| AI Service | 8000 → 8000              | FastAPI (Python 3.14)    |

### Uso básico

```bash
# Validar configuração
docker compose config

# Subir todos os serviços
docker compose up -d

# Subir apenas Redis (os apps dependem de código-fonte para build)
docker compose up -d redis

# Ver logs de um serviço
docker compose logs -f backend

# Parar tudo
docker compose down
```

### Observações

- **PostgreSQL não está no Docker.** O banco usado é Neon (nuvem), configurado via `DATABASE_URL` no `.env`.
- **Redis** roda localmente via Docker para suportar Socket.IO e ioredis.
- **Electron** (Dashboard) roda nativo no host e consome o Vite server do container `dashboard:3050`.
- **Mobile** (Expo) precisa da variável `EXPO_HOST` com o IP da máquina na rede local para o dispositivo físico conectar.

---

## Variáveis de Ambiente

### Raiz (`/.env`)

| Variável               | Obrigatória | Padrão         | Descrição                     |
| ---------------------- | ----------- | -------------- | ----------------------------- |
| `DATABASE_URL`         | Sim         | —              | URL do PostgreSQL (Neon)      |
| `REDIS_HOST`           | Não         | `localhost`    | Host do Redis                 |
| `REDIS_PORT`           | Não         | `6379`         | Porta do Redis                |
| `NODE_ENV`             | Não         | `development`  | Ambiente de execução          |
| `PORT`                 | Não         | `3000`         | Porta do backend              |
| `JWT_SECRET`           | Sim         | —              | Chave secreta JWT (mín. 16 caracteres) |
| `JWT_EXPIRATION`       | Não         | `7d`           | Tempo de expiração do token   |
| `VITE_API_URL`         | Não         | `http://localhost:3000` | URL da API para web    |
| `VITE_WS_URL`          | Não         | `ws://localhost:3000`   | URL do WebSocket       |
| `EXPO_HOST`            | Não         | `localhost`    | IP do host para Expo          |
| `OPENAI_API_KEY`       | Sim         | —              | Chave da API OpenAI           |
| `OPENAI_MODEL`         | Não         | `gpt-4o-mini`  | Modelo OpenAI                 |

Cada serviço também possui seu próprio `.env.example` com as variáveis específicas.

---

## Core Backend (NestJS)

### Estrutura

```
services/backend/
├── prisma/
│   └── schema.prisma       ← Definição das entidades
├── src/
│   ├── main.ts             ← Bootstrap (CORS, helmet, validation)
│   ├── app.module.ts       ← Módulo raiz (Config + Prisma)
│   ├── config/
│   │   ├── cors.config.ts  ← Origens permitidas
│   │   ├── env.config.ts   ← Validação Joi das env vars
│   │   └── security.config.ts ← Opções do helmet
│   ├── prisma/
│   │   ├── prisma.module.ts ← Módulo global do Prisma
│   │   └── prisma.service.ts ← Conexão com banco
│   └── modules/            ← Módulos de negócio (vazios)
│       ├── auth/
│       ├── data/
│       ├── mqtt/
│       ├── ai/
│       ├── websocket/
│       ├── roles/
│       └── tokens/
```

### Entidades do banco

| Modelo           | Finalidade                          |
| ---------------- | ----------------------------------- |
| Configuration    | Montagem física usada nos testes    |
| Test             | Execução experimental               |
| Telemetry        | Leituras individuais dos sensores   |
| EnergySummary    | Resumos diários/mensais             |
| MqttMessage      | Dados brutos recebidos via MQTT     |
| AiInteraction    | Histórico do chat Viber             |
| AiPrediction     | Previsões geradas pela IA           |

### Comandos úteis

```bash
# Gerar Prisma Client (após alterar schema)
pnpm --filter @vers/backend prisma:generate

# Aplicar schema no Neon
pnpm --filter @vers/backend prisma db push

# Criar migration
pnpm --filter @vers/backend prisma:migrate

# Abrir Prisma Studio
pnpm --filter @vers/backend prisma:studio

# Build
pnpm --filter @vers/backend build

# Testes
pnpm --filter @vers/backend test
```

---

## Fluxo de dados

```
ESP32 → MQTT (HiveMQ)
         ↓
Backend (subscriber) → MqttMessage (raw)
         ↓
Processador → Telemetry + EnergySummary
         ↓
      ┌──────────────────────┐
      │ Dashboard (Socket.IO) │  ← tempo real
      │ AI Service (previsões) │  ← AiPrediction
      │ Mobile / Web (REST)   │  ← consultas
      └──────────────────────┘
```
