<!-- Prepara um ensaio real restrito a dados e serviços sintéticos locais. -->
# F08.7 — Ensaio isolado de tempo real

Estado: preparação autorizada por `nxt`; execução real aguarda autorização
específica, conforme roadmap F08. Não reutilizar autorização da F07.7.

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
node test/db/prepare.cjs
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
