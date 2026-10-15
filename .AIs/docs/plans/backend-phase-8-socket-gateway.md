<!-- Planeja o gateway autorizado, mantendo início operacional explícito. -->
# F08.5 — gateway Socket.IO

Pedido `nxt` em 15/10/2026 autoriza implementação deste lote. Skills Backend,
IoT e Guarda reaplicadas; Ponytail full mantido. Decisões F08.4 preservadas.

Arquivos: novos realtime.gateway.ts/spec e realtime-io.adapter.ts/spec;
main.ts/spec instala adaptador; realtime.module.ts registra gateway;
realtime-ingestion.service.ts/spec inicia/encerra gateway com o coordenador.
Atualizar contrato, roadmap, índice e contexto. Sem schema, dependência nova,
frontend, .env ou início automático de Redis/MQTT.

Namespace /realtime, path /socket.io, polling e websocket. Adaptador usa CORS
existente com credenciais e recusa Origin ausente/alheio no handshake Engine.IO.
Middleware de namespace verifica cookie/sessão via serviço F08.4; falha retorna
connect_error genérico. Até 5 conexões por sessão por instância, incluindo
handshakes já autorizados; liberar reserva se transporte cair antes do connect.

Início explícito via coordenador instala listeners Redis e timer de 30 s.
Namespace registrado no bootstrap recusa conexão enquanto gateway/Redis não
estiverem disponíveis. Na queda Redis, desconectar sockets; retomada requer
reconectar, assinar e buscar REST. Não iniciar Redis no gateway.

subscribe/unsubscribe estritos, ACK após validação e join/leave; idempotentes.
Até 20 recursos por socket. Uma operação de assinatura por socket em andamento;
comando sobreposto recebe REALTIME_UNAVAILABLE e pode ser repetido após ACK.
Não criar fila de comandos. Revalidar sessão/acesso em cada comando. Salas
internas derivadas de recurso; nunca emitir diretamente à sala sem autorização.

Aviso Redis validado novamente; somente sockets inscritos no recurso recebem
data.updated mínimo depois de revalidar sessão/vínculo. Agrupar avisos do mesmo
recurso enquanto sua verificação está em curso; aviso final invalida estado,
sem deltas ou fila durável. Verificar assinatura/disponibilidade após awaits;
unsubscribe/desconexão/shutdown impedem entrega tardia. Sessão inválida encerra
socket; perda do vínculo remove assinatura; erro operacional impede entrega.
Timer único revalida sessões sem sobrepor consultas do mesmo socket.

TDD antes de implementação: conexão/cookie/Origin, quotas concorrentes,
idempotência, ACK join/leave, revogação antes de aviso, unsubscribe durante
verificação, Redis down/up, shutdown/timers e callbacks tardios. Adaptador
testado com stub do servidor; gateway com sockets sintéticos, sem Redis/banco
reais. Executar suíte completa/lint/build/diff; rebuild somente backend e saúde.
Ensaio real Redis/Socket.IO/DB fica em F08.7 com autorização própria.

## Validação local

RED antes dos novos serviços; regressões reproduzidas antes das correções para
assinatura cancelada/recriada e UUID com caixa diferente. Consulta antiga não
remove/bloqueia assinatura nova. Checagem no connect fecha reserva invalidada.
GREEN: 46 suítes/940 testes (20 novos), lint e build aprovados.
Inclui regressões REST e lifecycle MQTT; nenhuma dependência adicionada.
Rebuild concluído, somente backend recriado, imagem 4ceb0bb4d8cf em execução.
Live ok; probes HTTP negativas no Engine.IO sem Origin e com Origin alheio
retornaram 403. Primeira readiness 503; repetição ok com database/redis ok e
MQTT disabled. git diff --check aprovado. Recorte entregue para revisão.
Isso não comprova
conexão autorizada, ACK/entrega/reconexão no protocolo nem integração Redis/DB.
