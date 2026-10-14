<!-- Planeja o launcher Windows e corrige builds das APIs existentes. -->
# APIs em Docker — 13/10/2026

Pedido autorizado: .bat para subir todas as APIs. Recorte: backend NestJS,
ai-service FastAPI e Redis dependente, usando docker-compose.yml existente.
Front/mobile preservados. Não aplicar migrations nem acessar arquivos .env.

Arquivos: rodar-apis.bat, docker/Dockerfile.backend, docker/Dockerfile.ai,
.dockerignore, .env.example, docs/04-infraestrutura.md e contexto diário.
Self-check em scripts/test-rodar-apis.ps1, escrito antes do launcher.
Backend precisa preservar layout/workspace e links pnpm no runtime e usar o
entrypoint dist/services/backend/src/main.js observado no build. IA usa src.main
no diretório do serviço. Build não inclui segredos ou node_modules locais.
Launcher muda para sua própria pasta, verifica Docker/Compose/daemon, executa
up --build -d para redis/backend/ai-service e preserva exit code nas falhas.
Não criar arquivo .env automaticamente; exemplo atualizado para JWTs atuais.
Antes do launcher, self-check com Docker simulado para sucesso e falhas.
Validar builds reais sem banco/credenciais reais; smoke isolado sintético quando
possível. Registrar limites. Não subir a stack configurada com .env real nesta sessão.

## Entrega e validação

Self-check RED por launcher ausente, GREEN com sucesso e falhas de daemon,
Compose e build preservando exit codes; chamado de caminho com espaços.
Imagens vers-api-backend-check e vers-api-ai-check construídas com sucesso.
Backend Node 24 Debian/OpenSSL, pnpm 11.21.0 fixado e lockfile congelado;
runtime preserva links e layout compilado. IA aponta para src.main.
Compose validado com .env.example via stdin, sem acessar configuração real.
Containers temporários --network none iniciaram pelos CMDs reais: liveness
backend HTTP 200 e health IA ok; parados/removidos ao final. Backend Linux:
27 suítes/378 testes aprovados. git diff --check aprovado.
Nenhum banco real, migration ou front iniciado. Configuração local da raiz
precisa ter DATABASE_URL e JWTs distintos; readiness real não foi ensaiado.
