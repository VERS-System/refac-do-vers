<!-- Define primeiro lote da F09: CI de qualidade sem banco, deploy ou segredos externos. -->
# F09 — Histórico da proposta de CI (cancelada)

## Decisão vigente — 19/10/2026

Programador informou que não precisa de CI/CD e não quer usar GitHub Actions.
Retirar .github/workflows/backend-ci.yml antes de qualquer push. A proposta
abaixo passa a ser histórica; execução remota não é pendência nem requisito de
entrega. Preservar scripts e verificações locais já existentes, sem criar
automação substituta. Ajustar etapa B/índices para validação local e etapa C
para entrega manual. Sem alteração de código, dependências ou infraestrutura.

## Escopo histórico proposto em 19/10/2026

Programador solicitou continuidade após alinhamento Electron. Iniciar F09 pela
CI já proposta: criar .github/workflows/backend-ci.yml com um job de qualidade
para PRs e push em master relevantes ao backend, tipos compartilhados, contrato
API, manifests/lockfile ou próprio workflow; permitir workflow_dispatch.
Manifests de todos os workspaces acionam o job, pois a instalação congelada
considera o workspace inteiro, inclusive dependências dos clientes.

Node 24 acompanha Dockerfile.backend; pnpm vem de packageManager da raiz.
Actions oficiais fixadas nos commits obtidos dos tags checkout v6, setup-node
v6 e pnpm/action-setup v4. Sem cache de node_modules, dependência nova, token
externo ou serviço. Token GitHub apenas contents:read, sem persistir credenciais.

Passos: instalação congelada, Prisma validate/generate usando URL sintética
local sem conexão, test:unit/lint/build shared-types e backend, TypeScript do
backend incluindo testes. Reutilizar scripts existentes; não criar runner ou
wrapper. Nenhum .env carregado: Prisma CLI já usa prisma.config.ts sem dotenv.

## Verificação

Self-check YAML antes/depois, validando eventos, referências imutáveis, comandos
e ausência de jobs de deploy/serviços. Executar os comandos de qualidade locais,
com lockfile congelado. Nenhum código de aplicação muda; testes existentes
verificam o runtime. Não alegar execução GitHub Actions antes do push pelo
programador. Conferir tipos dos testes além do build que os exclui.

## Limites e próximos lotes

Primeiro job não encerra a F09 nem sua etapa B completa. Integração SQL/MQTT/
Socket.IO, verificação executável de migrations/contrato OpenAPI, auditoria de
dependências e secret scanning ficam explícitos como próximos lotes. F08 ainda
tem integração de clientes pendente. Sem banco, Docker, deploy, migration real,
commit/push ou alteração das políticas de branch do GitHub neste lote.

## Evidências locais e entrega

Self-check inicial falhou por workflow inexistente; após criação, parser YAML
confirmou eventos, contents:read, um único job sem serviços/deploy, comandos
esperados e SHAs de 40 caracteres. Referências oficiais consultadas via
git ls-remote: checkout/setup-node tags leves; pnpm v4 é tag anotado, portanto
fixado no commit resolvido b906affcce14559ad1aafd4ab0e942779e9f58b1 e não no
objeto do tag. Inputs standalone/package_json_file conferidos no action.yml
desse commit oficial.

Instalação congelada aprovada sem mudar lockfile/manifests. Prisma validate e
generate aprovados, com URL sintética e carregamento .env desabilitado pelo
prisma.config.ts existente. test:unit/lint/build de shared-types aprovados.
Backend: 46 suítes/961 testes, lint, TypeScript noEmit incluindo testes e build
aprovados. Uma primeira execução falhou por MQTT_ENABLED='false' redundante no
env do job: ConfigService não validado de um teste lê texto como truthy.
Removida a variável do workflow e repetida suíte completa com sucesso. Runtime
e testes não foram alterados para acomodar a CI.

Sem execução no GitHub/runner Linux nesta sessão: esse resultado depende do
push/PR pelo programador e da disponibilidade de Actions no repositório.
Sem Docker, credenciais externas, banco real, migration, commit ou push.

Referências de configuração: [checkout](https://github.com/actions/checkout),
[setup-node](https://github.com/actions/setup-node) e
[manifesto pnpm fixado](https://github.com/pnpm/action-setup/blob/b906affcce14559ad1aafd4ab0e942779e9f58b1/action.yml).
