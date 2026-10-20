<!-- Planeja a integração incremental do tempo real autenticado no desktop. -->
# Lote 5 — tempo real e recuperação

Alvo: demonstração local com dados sintéticos, sem deploy. O REST permanece
fonte dos valores; Socket.IO transmite apenas avisos por recurso.

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

## Parte B — cache e estados visíveis (pendente)

Ligar a ponte aos recursos efetivamente observados nas telas. Após cada ACK,
consultar REST; agrupar rajadas e marcar nova leitura quando aviso chega durante
consulta em andamento. Invalidar todas as páginas/filtros e comparações afetadas.
Ignorar avisos de observações anteriores, sem usar occurredAt como cursor.
Mostrar desconexão separadamente de erro de sessão e preservar consultas REST.
Remover assinaturas ao trocar recurso/conta ou desmontar.

## Parte C — prova local e fechamento (pendente)

Electron dev/build com backend real, dois clientes, recurso alheio, rajadas,
duplicatas, reconexão após rede/Redis, revogação e troca de conta. Usar somente
bancada sintética existente; limpar exclusivamente fixtures próprias. O lote 5
só termina após B/C. Fluxo MQTT completo e instalador continuam no lote 6.
