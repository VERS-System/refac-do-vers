<!-- Planeja pausa reversível da ingestão conforme disponibilidade Redis sem ativar serviços reais. -->
# F08.3.1 — Coordenação de pausa e retomada

Avanço solicitado em 14/10/2026 após transporte 8.3. Decisão já aprovada:
Redis indisponível pausa novas recepções MQTT; concluir transações em curso,
preservar sessão persistente/brutos e retomar ao voltar. REST continua ativo.
Não solicitar novamente essa escolha nem conectar ambiente real neste lote.

## Escopo antes do código

- MqttService/spec: pausa reversível cancela timers/reconexão, bloqueia novos
  callbacks, aguarda callbacks aceitos e ACK antes de encerrar cliente; resume
  cria cliente com mesmo clientId/clean=false. Shutdown permanece definitivo.
- MqttPipelineService/spec: bloqueio imediato de handle, interrupção da varredura
  após trabalho atual, cancelamento do timer, retomada com recuperação antes
  de consumir e timer único. Pausa durante start/resume não pode ser perdida.
- Novo RealtimeIngestionService/spec, registrado/exportado pelo RealtimeModule
  que importa MqttModule: start explícito liga Redis e observa status; só inicia
  pipeline quando ok. Queda bloqueia ingestão imediatamente, transições são
  serializadas e reconexão recupera antes de retomar. Falha de ativação usa
  backoff 1–30 s com timer cancelável, sem polling REST nem fila nova.
- Atualizar contrato, roadmap/índices/contexto. Sem dependência/schema/migration,
  frontend, Socket.IO, publicação de dados ou mudança de configuração real.

Transações já em curso finalizam; recuperação para entre itens, não desfaz item
confirmado. Pacote recebido após bloqueio não recebe confirmação positiva.
Sessão broker é preservada, mas retomada depende da retenção finita do broker;
o código local não garante que broker/hardware armazenem dados indefinidamente.
Publicações Redis de avisos continuam sem durabilidade. Ponte de recursos
normalizados→avisos ainda é lote próprio antes do gateway.

## Verificação

TDD antes da implementação: pausa durante processamento/assinatura/reconexão,
ACK antes de fechamento, callback antigo e resume interrompido por nova pausa;
pipeline sem novos handles/itens/timer, recuperação antes de resume; coordenador
inerte, início condicionado a Redis, queda durante start/retomada, oscilações,
falha com retry e shutdown sem reconectar. Sem serviços externos nesses testes.

Rodar test:unit/lint/build, diff --check, reconstruir somente backend e conferir
live/readiness. Não iniciar coordenador, pipeline ou Redis Pub/Sub no bootstrap.
Ensaio real dessa coordenação continua exigindo ambiente isolado autorizado.

## Evidência local — 14/10/2026

RED por métodos/coordenador ausentes; GREEN inicial dos cenários de lifecycle.
Caso adicional revelou retry ainda agendado após recuperação recebida durante
falha anterior; cancelamento corrigido no reconciliador antes do GREEN final.

42 suítes/866 testes unitários aprovados, 21 novos; lint/build aprovados.
Integração em memória usa coordenador/pipeline/transporte reais, simulando só
broker e persistência: ACK precede endAsync, novos pacotes são recusados e
consulta de recuperação precede abertura do cliente seguinte. Testes cobrem
pausa no meio da varredura, start/resume interrompidos, retry, oscilações,
callback antigo, timers únicos e shutdown esperando ativação pendente.

Sem teste novo SQL/broker/Redis real. Não inferir retenção broker, entrega de
Pub/Sub, autorização Socket.IO ou avisos publicados a partir destes mocks.
Módulos continuam passivos. Rebuild finalizado em 15/10 após cancelar execução
anterior que permaneceu aberta e repetir somente backend. Live/readiness ok
com database/redis ok e MQTT disabled após timeout/503 iniciais. Coordenador
não iniciado. Contexto de continuação em Context_15_10_2026.md.
