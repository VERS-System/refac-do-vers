<!-- Orienta início e validação locais do backend e os caminhos existentes de simulação. -->
# VERS Backend — operação local

O backend usa Node 24 e a versão pnpm declarada no packageManager da raiz.
REST, ingestão MQTT e tempo real pertencem ao mesmo serviço NestJS. Os dados
da demonstração são sintéticos; não representam medições do sistema elétrico.

## Preparar e iniciar

Na raiz do monorepo:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @vers/backend prisma:generate
pnpm --filter @vers/backend build
pnpm --filter @vers/backend start
```

Antes de iniciar, forneça as variáveis no ambiente do processo conforme
[.env.example](.env.example). O bootstrap não carrega arquivo .env por conta
própria. DATABASE_URL deve apontar para PostgreSQL autorizado; os segredos
JWT_ACCESS_SECRET e JWT_REFRESH_SECRET precisam ser distintos e ter pelo menos
16 caracteres. Redis usa REDIS_HOST/REDIS_PORT; API_PREFIX padrão é api/v1 e
PORT padrão é 3000. A origem do Electron em desenvolvimento é localhost:5174.

Start executa `dist/services/backend/src/main.js`, mesmo artefato usado pelo
Docker. Não compila, provisiona fixtures, cria schema nem aplica migrations.
Execute build novamente após mudar o código. Para encerrar no terminal, use
Ctrl+C. Backend e serviços de apoio podem ser iniciados manualmente pelo
[launcher de APIs](../../rodar-apis.bat); o dashboard Electron roda no host.

## Saúde e ingestão

```powershell
curl.exe -fsS http://localhost:3000/api/v1/health/live
curl.exe -fsS http://localhost:3000/api/v1/health/ready
```

Live indica vida do processo; ready consulta banco e Redis. A resposta de ready
também informa o estado MQTT. Ajuste as URLs se alterar porta/prefixo.

MQTT_ENABLED=false mantém ingestão e namespace de tempo real passivos. Com true,
o coordenador inicia depois do HTTP e aguarda Redis antes de recuperar mensagens
e consumir MQTT. Configure MQTT_URL mqtts, usuário/senha consumidores e CLIENT_ID
conforme os nomes completos no exemplo. Identidade do simulador deve estar
provisionada e autorizada no banco e no broker; não basta publicar qualquer ID.
Não desative TLS ou autorização para fazer a demonstração funcionar.

## Simulação

Para gerar somente um lote JSON, sem publicar no broker, execute na raiz:

```powershell
$env:NODE_ENV = 'development'
$simState = Join-Path $env:TEMP 'vers-sim-001-sequence.json'
node services/backend/dist/services/backend/src/modules/mqtt/mqtt-simulator.js $simState vers-sim-001
```

O argumento opcional final é um testId UUID v4 autorizado; sem ele, testId é
null. Reutilize o arquivo de estado para preservar a sequência da mesma
identidade. O gerador não inicia MQTT nem o backend. Não apague o estado para
reiniciar a sequência de um dispositivo já provisionado.

Para demonstrar o fluxo completo, use o [ensaio isolado do bootstrap](../../.AIs/docs/plans/backend-phase-8-bootstrap-rehearsal.md):
ele prepara sessões e vínculos sintéticos, inicia o executável compilado, envia
MQTT/TLS, recebe aviso Socket.IO e consulta resumo REST. O plano especifica
serviços, certificado, guard de autorização, comandos e limpeza por IDs.
Esse ensaio valida backend; a interface Electron ainda usa dados de exemplo.

## Validação local

```powershell
pnpm --filter @vers/backend test:unit
pnpm --filter @vers/backend lint
pnpm --filter @vers/backend exec tsc --noEmit --incremental false
pnpm --filter @vers/backend prisma:validate
pnpm --filter @vers/backend build
```

CI/CD não é requisito. Testes de banco e da bancada são separados dos unitários;
executá-los somente nos alvos locais definidos nos planos, nunca no banco real.
