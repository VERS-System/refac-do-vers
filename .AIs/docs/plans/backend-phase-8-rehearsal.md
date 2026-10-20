<!-- Prepara um ensaio real restrito a dados e serviços sintéticos locais. -->
# F08.7 — Ensaio isolado de tempo real

Continuação integrada aprovada em 16/10/2026: [MQTT/TLS, ponte e coordenação
sob queda Redis](backend-phase-8-mqtt-rehearsal.md), sete cenários reais ao todo.
Os limites abaixo descrevem o primeiro recorte; a continuação acrescenta a
evidência de pausa/retomada MQTT, sem cobrir UI ou produção.

Estado: primeiro recorte real aprovado em 16/10/2026, seis cenários; pendências
MQTT/cliente preservadas. Execução isolada autorizada pelo programador via `nxt`
em resposta ao pedido explícito para iniciar Docker Desktop, criar/remover
somente dados sintéticos e parar os serviços deste projeto ao terminar.
Não reutilizar autorização da F07.7. O `y` em main.spec.ts já foi corrigido
pelo programador antes desta execução; árvore Git inicialmente limpa.

## Alvos e alterações

Projeto Compose exclusivo `vers-realtime-rehearsal`, usando
docker-compose.test-db.yml e novo docker-compose.test-realtime.yml.
PostgreSQL exclusivamente 127.0.0.1:55432/vers_test, usuário vers_test e senha
sintética vers_test_local_only; Redis exclusivamente 127.0.0.1:56379.
Nenhum env_file real: usar docker/mqtt-test/compose.env.example vazio.
Porta PostgreSQL coincide com ensaio anterior: se ocupada, parar e pedir decisão,
sem assumir posse de container existente. Não tocar backend/Redis habituais.

Criar test/jest.realtime.config.cjs, test/realtime/setup.ts e suíte dedicada.
Reutilizar fixtures MQTT, Prisma, AuthService/ResourceAccessService, adaptador,
gateway e Pub/Sub reais. socket.io-client declarado como devDependency do
backend com a resolução 4.8.3 já usada pelo dashboard, sem biblioteca nova no
lockfile. Importar o symlink do dashboard diretamente não resolve os tipos
transitivos no TypeScript. Servidor Nest só em 127.0.0.1 e porta dinâmica; configuração
sintética em memória, sem AppModule/ConfigModule.forRoot ou leitura de .env.

## Matriz deste recorte

- Cookie assinado, sessão/conta e vínculo reais no PostgreSQL.
- Socket.IO polling e websocket: ACK de assinatura, Redis PUBLISH até aviso.
- Recurso alheio/ausente indistinguíveis; Origin alheio recusado.
- Revogação de vínculo impede aviso e nova assinatura; revogação de sessão
  fecha conexão antes da próxima entrega.
- Reinício somente de redis-test encerra sockets; reconexão exige nova
  assinatura e entrega posterior. Não reproduzir aviso perdido.

Não comprova snapshot/estado de UI, múltiplas réplicas, HiveMQ/ESP32, produção
ou pausa/retomada do pipeline MQTT real. Esse último caminho exige extensão do
ensaio antes de declarar F08 inteira concluída. Não simular a persistência ou
autorização nos testes reais para alegar cobertura ponta a ponta.

## Comandos concretos após autorização

Na raiz, base Compose:

```powershell
docker compose -p vers-realtime-rehearsal --env-file docker/mqtt-test/compose.env.example -f docker-compose.test-db.yml -f docker-compose.test-realtime.yml up -d --wait
```

No backend, preparar schema e constraints apenas no vers_test com o setup
existente e executar suíte dedicada:

```powershell
$realtimeBackend = (Get-Location).Path
$realtimeSchema = Join-Path ([IO.Path]::GetTempPath()) ('vers-realtime-schema-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path (Join-Path $realtimeSchema 'prisma/manual-constraints') -Force | Out-Null
Copy-Item -LiteralPath 'prisma/schema.prisma' -Destination (Join-Path $realtimeSchema 'prisma/schema.prisma')
Copy-Item -Path 'prisma/manual-constraints/*.sql' -Destination (Join-Path $realtimeSchema 'prisma/manual-constraints')
Push-Location $realtimeSchema
try { node (Join-Path $realtimeBackend 'test/db/prepare.cjs') } finally { Pop-Location }
$env:VERS_REALTIME_REHEARSAL = 'authorized-local-only'
node node_modules/jest/bin/jest.js --config test/jest.realtime.config.cjs --runInBand
```

Os testes podem reiniciar somente redis-test nesse projeto e criar/remover
somente seus IDs de usuários/sessões/vínculos/veículos. Ao terminar, parar os
serviços com a mesma base Compose e `stop`, inclusive em falha; sem down -v.
Não limpar dados globais, apagar volumes ou aplicar migration no Neon.

## Validação de preparação

TypeScript sem emissão, test:unit, lint, build e diff --check; sem executar a
suíte real antes da autorização. Não alegar RED/GREEN de integração sem execução.

## Evidência da preparação — 15/10/2026

TypeScript noEmit, lint e build aprovados; 46 suítes/942 testes unitários
aprovados, sem executar a nova suíte real. Self-check isolado do setup verificou
ausência de autorização, valor incorreto e autorização válida com URL fixa
(três assertions, sem rede). Compose config --quiet aprovado com env-file vazio.

Tentativa pnpm add offline encontrou divergência preexistente do mobile;
instalação congelada do workspace confirmou manifests mobile fora do lockfile.
Preservado mobile; devDependency/entrada do importer backend acrescentadas com
resolução já existente. Vínculo isolado com --ignore-workspace e lockfile-dir
absoluto adicionou cliente 4.8.3, mas saiu 1 por scripts de build ignorados.
Não liberar scripts globalmente: testes/build existentes funcionaram após isso.
Reprodutibilidade do install congelado do workspace inteiro continua pendente
da reconciliação do mobile, fora deste lote.

Docker Desktop Linux Engine indisponível: docker ps não conectou ao pipe local.
Nenhum container iniciado/parado; disponibilidade das portas ainda não aferida.
Antes do up, iniciar Docker Desktop e conferir containers/portas sem assumir
posse de qualquer recurso existente. Execução real continua aguardando aprovação.

A suíte preparada tem seis cenários (dois transportes, Origin, vínculo,
sessão e restart Redis). Ausência após perda de vínculo tem observação limitada
a 250 ms; não comprova ausência indefinida nem revogação atômica na rede.
Nenhum resultado real de protocolo/persistência é alegado nesta preparação.

No inventário final apareceu edição concorrente em src/main.spec.ts (`y`
antes de useWebSocketAdapter), preservada por estar fora do lote. Checks
aprovados antecedem essa edição; corrigir antes de nova validação/execução.
git diff --check e inspeção de espaços dos novos arquivos aprovados.

## Execução real — 16/10/2026

Docker Desktop iniciado, portas 55432/56379 livres. Criado somente projeto
vers-realtime-rehearsal; PostgreSQL e Redis confirmados saudáveis. Schema e
constraints aplicados pelo prepare.cjs existente, com cwd em cópia temporária
contendo somente schema e SQL, evitando carregamento de .env do repositório.
Cópia removida após verificar caminho exato dentro do temporário do sistema.

Seis cenários passaram com serviços reais: polling/websocket e ACK→PUBLISH→
aviso, negação de recurso alheio/ausente, Origin alheio, vínculo removido,
sessão revogada e restart somente Redis com nova assinatura obrigatória.
Não foi necessário alterar código de produção.

Primeira execução passou mas exibiu aviso de saída tardia do Jest. Diagnóstico
detectOpenHandles também passou e encerrou com código zero. Instrumentação
temporária identificou timers schedulePing/Polling.doClose do Engine.IO durante
fechamento gracioso de 30 s. Um diagnóstico inicialmente falhou por tipagem
do recurso async_hooks; corrigido somente para diagnóstico e removido depois.
Limpeza final da suíte fecha engine do servidor de teste antes dos hooks Nest;
spy apenas captura servidor real criado pelo adaptador, sem substituir seu
comportamento. Nova execução final: seis testes, código zero, sem aviso residual.
Sem forceExit ou mudança nos limites/lifecycle de produção.

Validação final: 46 suítes/942 testes unitários, TypeScript noEmit, lint e build
aprovados. Contagens SQL antes de parar serviços: users, refresh_sessions,
user_vehicles, vehicles, tests e devices iguais a zero. Testes removeram somente
seus IDs. Compose stop concluído, ambos containers Exited (0), sem remover volumes.

Primeiro recorte real entregue para revisão. Não cobre pausa/retomada MQTT sob
queda Redis, snapshot/estado da UI ou HiveMQ/ESP32. Redis foi reiniciado de forma
real, sem simular disponibilidade; evento deste recorte é publicado diretamente
no transporte, sem alegar pipeline MQTT→ponte→cliente completo. Sem ativação do
coordenador habitual, .env, Neon, commit/push ou rebuild por mudança de runtime.
