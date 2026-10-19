# Infraestrutura do VERS

> **Estado em 13/08/2026:** este documento descreve a infraestrutura já criada,
> mas não garante que todos os scaffolds estejam integrados. O `AppModule` atual
> ainda registra somente configuração e Prisma. A ordem de estabilização está no
> [roadmap do core](plans/core-roadmap.md).

## Docker Compose

### Iniciar somente as APIs no Windows

Abra o Docker Desktop com containers Linux e execute `rodar-apis.bat` na raiz
(duplo clique ou terminal). Ele reconstrói e inicia backend, ai-service e Redis
usando o Compose existente, sem iniciar web, dashboard ou mobile. Usa a pasta
do próprio script mesmo quando chamado de outro diretório.

A configuração local da raiz precisa conter DATABASE_URL e os segredos distintos
JWT_ACCESS_SECRET/JWT_REFRESH_SECRET, conforme `.env.example`; API_PREFIX deve
ser `api/v1`. O launcher não cria configuração nem aplica migrations. O banco
continua no Neon. A IA atual expõe health e documentação FastAPI.

- Backend: `http://localhost:3000/api/v1/health/live`.
- Readiness: `http://localhost:3000/api/v1/health/ready` (exige banco e Redis).
- Pipeline: `MQTT_ENABLED=false` mantém ingestão/tempo real passivos. Com true,
  o bootstrap inicia o coordenador após HTTP pronto; só habilitar com broker TLS,
  credenciais consumidoras e banco autorizados. Exemplo na raiz/backend; nenhuma
  configuração real é alterada pelo código. Ver [plano de ativação](plans/backend-phase-8-bootstrap-activation.md).
- IA: `http://localhost:8000/health` e `http://localhost:8000/docs`.
- Logs: `docker compose logs -f backend ai-service`.
- Parar: `docker compose stop backend ai-service redis` (preserva volumes).

O comando detached inicia containers; confirmação de banco disponível vem do
readiness, não apenas da saída do launcher. Portas 3000, 8000 e 6379 precisam
estar disponíveis. Após alterar o backend, execute o .bat novamente para rebuild.
Self-check sem Docker real: `powershell -NoProfile -ExecutionPolicy Bypass -File
scripts/test-rodar-apis.ps1`.

O ambiente de desenvolvimento local é gerenciado por Docker Compose.
O arquivo `docker-compose.yml` na raiz define os serviços:

| Serviço    | Porta (host → container) | Tecnologia               |
| ---------- | ------------------------ | ------------------------ |
| Redis      | 6379 → 6379              | Redis 7 Alpine           |
| Backend    | 3000 → 3000              | NestJS (Node 22)         |
| Web        | 3001 → 5173              | Vite + React + Tailwind  |
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
- **Dashboard** é aplicativo Electron no host, iniciado com `pnpm --filter
  @vers/dashboard dev`. Não integra o Compose. Renderer interno de desenvolvimento
  usa `localhost:5174` com porta fixa; `/api/v1` passa pelo proxy local. Build e
  distribuição em [services/dashboard/README.md](../../services/dashboard/README.md).
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
| `JWT_EXPIRATION`       | Não         | `7d`           | Expiração JWT do baseline atual; será separada por tipo de token na implementação da autenticação |
| `VITE_API_URL`         | Não         | `http://localhost:3000` | URL da API para web    |
| `VITE_WS_URL`          | Não         | `ws://localhost:3000`   | URL do WebSocket       |
| `EXPO_HOST`            | Não         | `localhost`    | IP do host para Expo          |
| `OPENAI_API_KEY`       | Sim         | —              | Chave da API OpenAI           |
| `OPENAI_MODEL`         | Não         | `gpt-4o-mini`  | Modelo OpenAI                 |

Cada serviço também possui seu próprio `.env.example` com as variáveis específicas.

### Transporte da autenticação

- access e refresh tokens serão emitidos somente como cookies `HttpOnly`;
- nenhum token será retornado em JSON ou disponibilizado ao JavaScript;
- produção aceitará autenticação somente por HTTPS e usará cookies `Secure`;
- refresh e logout usarão os cookies recebidos, sem token no body;
- o backend deverá habilitar CORS com credenciais apenas para origens permitidas
  e aplicar proteção CSRF adequada ao modelo de cookies;
- a política provisória é `SameSite=Lax`, host-only, com `Origin` e token CSRF
  nas mutações; domínios finais de implantação ainda serão definidos.

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
│   └── modules/            ← Scaffolds de auth, data, mqtt, ai, websocket,
│                              roles e tokens; integração ainda a validar
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

# Aplicar schema experimental no Neon (legado; não usar em evolução versionada)
pnpm --filter @vers/backend prisma:push

# Criar migration
pnpm --filter @vers/backend prisma:migrate

# Abrir Prisma Studio
pnpm --filter @vers/backend prisma:studio

# Build
pnpm --filter @vers/backend build

# Testes atuais (a Fase 0 adicionará o alias obrigatório test:unit)
pnpm --filter @vers/backend test
```

Novas alterações de schema devem usar migrations versionadas. `prisma db push`
permanece documentado apenas para explicar o histórico inicial e não é o fluxo
previsto para evolução do banco.

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
