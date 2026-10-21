<!-- Planeja a integração incremental do tempo real autenticado no desktop. -->
# Lote 5 — tempo real e recuperação

Alvo: demonstração local com dados sintéticos, sem deploy. O REST permanece
fonte dos valores; Socket.IO transmite apenas avisos por recurso.
Escopo reafirmado em20/10/2026: somente simuladores; hardware físico não integra
o aceite e não constitui pendência deste lote ou do lote6.

Decisão do responsável em 20/10/2026: manter telemetria REST a cada 10 s e
energia a cada 60 s, antecipando consultas por eventos. Não ampliar polling.

## Parte A — transporte e fronteira Electron (concluída em 20/10/2026)

- Novo contrato público em `src/shared/realtime.ts`, sem cookies, JWTs, URLs
  ou acesso a canais arbitrários.
- `src/main/realtime.ts`: API local previamente validada; namespace `/realtime`,
  caminho `/socket.io`, Origin existente e somente cookie `vers_access` do main.
  Listener anterior ao connect/subscribe; assinaturas serializadas e ACK validado.
- Lista explícita de até 20 recursos UUID v4. Troca da observação cancela socket,
  timers e operações antigas; nenhum resultado antigo atravessa para outra conta.
- Reconexão com espera crescente limitada a 30 s, novo perfil/cookie e nova
  assinatura. ACK positivo gera aviso para snapshot futuro no renderer.
- Main/preload: remetente/frame autorizado, isolamento de sessão, descarte
  antes de login/logout, ao expirar sessão, recarregar ou fechar janela.
- Remover `renderer/services/mqtt.ts`: nenhum caller encontrado; utiliza
  autenticação por token e evento incompatíveis com o contrato vigente.
- TDD do transporte/validações e preload; suíte dashboard, typecheck e build.

Testes novos de transporte e wiring/preload:11 aprovados. Suíte completa:
93 arquivos/680 testes aprovados com `pnpm.cmd --filter @vers/dashboard test:unit
--maxWorkers=4`. Typecheck e build main/preload/renderer aprovados. Sem
dependências novas. O teste IPC usa Electron
simulado; não equivale ao ensaio real da parte C. Build mantém socket.io-client
externo no main; renderer não recebe cliente Socket.IO nem credenciais.
TDD começou com módulo ausente e falha esperada da nova ponte no preload;
implementação posterior deixou ambos verdes. Teste do main simula somente a
localização do bundle, pois o runner usa URL HTTP. Avisos de canvas do JSDOM
continuam sem falha de suíte. `git diff --check` aprovado.

## Parte B — cache e estados visíveis (concluída em 20/10/2026)

Execução autorizada pelo next: provider no App autenticado e registro por hooks
de energia, amostras, resumo e comparação, com contagem de consumidores e limite
de20. Mudanças agrupadas antes de substituir observação; listener instalado antes
do IPC. Atualizador marca queries afetadas e agrupa avisos por100ms; consulta
em andamento termina antes do novo refetch. Foco revalida REST e observação.
Estado visível distingue assinatura, indisponibilidade e sessão; negação limpa
dados do recurso e repete REST autorizado. Sem alterar intervalos aprovados.
TDD do atualizador e provider; ampliar ensaio sintético existente para eventos
positivos e retomada. Não iniciar/alterar containers de uso.

Ligar a ponte aos recursos efetivamente observados nas telas. Após cada ACK,
consultar REST; agrupar rajadas e marcar nova leitura quando aviso chega durante
consulta em andamento. Invalidar todas as páginas/filtros e comparações afetadas.
Ignorar avisos de observações anteriores, sem usar occurredAt como cursor.
Mostrar desconexão separadamente de erro de sessão e preservar consultas REST.
Remover assinaturas ao trocar recurso/conta ou desmontar.

Implementado `data/ProvedorTempoReal.tsx`: contagem de consumidores por recurso,
conjunto ordenado, observação com UUID novo e descarte de avisos antigos. Provider
apenas no App autenticado; hooks de energia/amostras/resumo/comparação registram
recursos. Listener precede IPC; ACK/reconexão/foco provocam leitura REST. Status
visível distingue indisponibilidade, autorização e sessão. Negação reseta cache
do recurso; expiração cancela/limpa cache e revalida identidade.

`data/tempoReal.ts` agrupa em100ms todas as páginas/filtros/comparações afetados;
queries em andamento continuam marcadas até terminarem. Amostras pausadas não
recebem invalidação por evento, inclusive com outro consumidor do mesmo teste.
Sem novos intervalos de polling. Main também sinaliza encerramento e restaura
observação com autorização nova quando logout/logout-all não foi confirmado.

TDD/cache e regressões: suíte final95 arquivos/686 testes passou (96,97s),
typecheck/build dos três alvos aprovados. Testes cobrem rajadas, dirty durante
REST, filtros, comparação, instalação, refcount, foco, aviso antigo, negação,
expiração, pausa e logout não confirmado. Primeiro nome de provider foi ajustado
para evitar colisão Windows entre TempoReal.tsx/tempoReal.ts na resolução TS.

## Parte C — prova local e fechamento (concluída em 20/10/2026)

Electron dev/build com backend real, dois clientes, recurso alheio, rajadas,
duplicatas, reconexão após rede/Redis, revogação e troca de conta. Usar somente
bancada sintética existente; limpar exclusivamente fixtures próprias. O lote 5
só termina após B/C. Fluxo MQTT completo e instalador continuam no lote 6.

O bootstrap padrão só chama `RealtimeIngestionService.start()` quando MQTT está
habilitado. Com `MQTT_ENABLED=false`, REST funciona e a interface corretamente
indica canal desconectado. Para provar este lote sem antecipar ingestão MQTT,
`scripts/realtime-backend.cjs` usa AppModule/configureApplication compilados e
ativa explicitamente Gateway/PubSub/Notification; não inicia pipeline MQTT.
Guard exige NODE_ENV=test, porta53000, MQTT=false e URL exata da bancada sintética.
Isso não modifica o comportamento/configuração do backend entregue.

Ensaio reutiliza session-rehearsal.mjs/session-electron.cjs, com nova etapa
realtime e helper realtime-electron.cjs. Dois clientes reais na mesma sessão,
20 avisos repetidos e antigos, KPI300→600mWh por atualização persistida e aviso,
troca de instalação700mWh, retorno800mWh; CLIENT KILL TYPE pubsub apenas no Redis
isolado força queda do transporte e reassinatura. Persistência sem publicar
durante queda aparece no snapshot novo como500mWh. Revogação no banco provoca
logout da tela; outra conta recebe RESOURCE_UNAVAILABLE na instalação alheia.
Primeira rodada dev/build desses cenários passou em8 processos Electron.

Rodada ampliada acrescenta amostra persistida VALID e aviso test com leitura
na tela em menos de5s, antes do polling10s. Fixture inicial usou GOOD (enum de
SummaryQuality), causou timeout no ensaio e foi corrigida para TelemetryQuality
VALID. Marcos de progresso públicos não imprimem cookies/payloads. A leitura
positiva de telemetria não prova ingestão MQTT, cálculo elétrico ou hardware.

Rodada final aprovada em8 processos: dev/build × login/realtime/resume/logged-out.
Amostra VALID apareceu na tabela real em menos de5s nos dois modos. Inclui
reabertura/persistência, renovação, CRUD, energia/CSV, eventos positivos, queda
e retomada do Redis/Socket.IO, snapshot sem aviso, revogação e outra conta.
Somente as fixtures próprias foram removidas. Banco final0 usuários, veículos,
testes, amostras e resumos; db-test/redis-test parados com volumes preservados.
Containers de uso intactos. Sintaxe dos scripts e diff --check aprovados.

Lote5 concluído no escopo local autorizado. Mantém as limitações do contrato:
avisos não são duráveis/cursor, não garantem ausência de perda nem comprovam
conexão física do dispositivo; REST10s/60s reconcilia. Falta ingestão MQTT/TLS
completa e pacote Windows no lote6. Sem deploy, migração, alteração de dependências,
mudança do bootstrap de produção, hardware, cópia de projeto, commit ou push.
