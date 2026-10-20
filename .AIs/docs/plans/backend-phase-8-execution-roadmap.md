<!-- Planeja contratos e entrega incremental de tempo real sem antecipar conexão ou autorização externa. -->
# F08 — Redis e tempo real

> **Status reconciliado em 19/10/2026:** F08.7 executado em 16/10 com sete
> cenários integrados locais aprovados. Referências abaixo a ensaio ainda não
> executado descrevem etapas históricas. Permanecem integração dos clientes
> (snapshot/invalidação/recuperação REST). Dois cenários reais do bootstrap
> aprovados no [ensaio de 19/10](backend-phase-8-bootstrap-rehearsal.md), com
> bancada parada e dados removidos; isso não comprova implantação de produção.
> Bootstrap opt-in implementado no [lote de 19/10](backend-phase-8-bootstrap-activation.md).
> F09 ainda planejada. Integração elétrica e
> ESP32 cancelados, conforme [decisão de simulação](backend-simulacao-19-10-2026.md).

Estado: avanço solicitado pelo programador em 14/10/2026 após entrega do ensaio
local F07.7. Lote 8.1 autorizado pelo pedido de continuação; demais lotes serão
implementados em recortes revisáveis. HiveMQ/ESP32 e pendências da F06/F07
continuam registradas, sem impedir preparação local do tempo real.

## Base existente

- MqttPipelineService emite telemetry.processed depois do commit e contém
  falhas de listeners; bootstrap inicia coordenador após HTTP somente com
  MQTT_ENABLED=true, mantendo false como padrão passivo.
- REST expõe telemetria/resumos com ResourceAccessService. Acesso histórico ao
  teste pelo criador ou vínculo atual; instalação exige vínculo atual e ADMIN
  não possui exceção global. Reutilizar essas regras.
- Sessão por cookie HttpOnly; assinatura HS256 e sessão/conta validadas no
  banco. Não aceitar token por query/auth só porque o cliente antigo o envia.
- Redis e Socket.IO já são dependências instaladas. Redis não será fila nem
  fonte de verdade. Não criar serviço executável separado.

## Lotes

1. **8.1 — Evento interno versionado:** formalizar metadata mínima do evento
   já existente, sem consulta adicional, transporte ou listener novo.
2. **8.2 — Contrato externo:** definir namespace, assinaturas e respostas,
   invalidação versus medições, canais separados por recurso e recuperação
   REST. Definir limites e política de indisponibilidade com o programador.
3. **8.3 — Redis Pub/Sub:** publicar/validar envelope permitido; conexões de
   publicação/assinatura próprias, lifecycle explícito, logs seguros. Falha não
   pode desfazer commit; nenhuma promessa de entrega ou replay duráveis.
4. **8.4 — Sessão e autorização:** reutilizar validação de sessão e regras de
   recursos, validar Origin, prazo e revogação antes de entregar dados. Decidir
   limites de conexão/assinatura e janela de revalidação antes de implementar.
5. **8.5 — Socket.IO:** namespace e salas autorizados, limites e encerramento;
   nunca encaminhar envelope MQTT bruto ou evento Redis sem validação/acesso.
6. **8.6 — Consistência:** snapshot REST, assinatura confirmada e nova consulta
   para fechar janela; perdas/duplicatas/ordem e reconexão documentadas. Horário
   de evento não é relógio de captura nem cursor monotônico de banco.
7. **8.7 — Ensaio isolado:** Redis/Socket.IO/DB sintéticos, sessões e vínculos,
   reconexão/revogação/falha Redis. Preparar alvos concretos antes de solicitar
   autorização de execução. Não reutilizar autorização do ensaio MQTT anterior.

## Escopo 8.6 — consistência e recuperação

Preparação do próximo recorte: [ensaio F08.7](backend-phase-8-rehearsal.md).
Primeiro recorte Redis/Socket.IO/PostgreSQL executado com autorização própria em
16/10/2026: seis cenários reais aprovados, fixtures removidas e containers
isolados parados. [Continuação MQTT/Redis](backend-phase-8-mqtt-rehearsal.md)
adicionou sétimo cenário real com TLS, ponte, pausa e retomada offline, também
aprovado. Snapshot/UI e limites registrados continuam pendentes; não declarar
a fase inteira concluída.

Próximo recorte autorizado pelo pedido de desenvolvimento em 15/10/2026.
Consolidar matriz de cenários no contrato e cobertura do gateway para avisos
repetidos/fora de ordem e reconexão sem replay ou assinatura herdada.
Sem consumidor genérico, integração frontend ou alteração de runtime prevista.
Snapshot e invalidação concorrente no cliente continuam critérios de aceite da
integração futura, sem alegar implementação ou teste de UI neste lote.
Plano e evidências: [consistência F08.6](backend-phase-8-consistency.md).
Ensaio real F08.7 aprovado em 16/10; aviso de recálculo TEST independente
implementado no [lote de 19/10](backend-phase-8-test-summary-notification.md),
com validação registrada no respectivo plano. Encerramento REST não passa a
recalcular automaticamente. Integração frontend permanece pendente.

## Escopo 8.1

Criar services/backend/src/modules/mqtt/mqtt-events.ts com nome constante e
tipo do evento interno, usar no mqtt-pipeline.service.ts e adaptar seu spec.
Acrescentar contrato em .AIs/docs/Api/realtime-contract-v1.md e atualizar
índices/contexto. Sem schema, migration, dependência, módulo novo, frontend,
rede ou alterações de configuração real. Rebuild somente backend ao terminar.

Evento telemetry.processed contém version=1, type=telemetry.processed,
messageId interno, correlationId igual ao ID interno e occurredAt UTC de emissão.
Identidade para deduplicação é (type, version, messageId). Sem ID aleatório extra,
medição, instalação, usuário, credencial ou payload bruto. Correlação vincula ao
bruto por ID sem expor seu conteúdo. Somente listeners internos confiáveis;
não é ainda um pacote autorizado para cliente ou Redis.

O timestamp não ordena capturas atrasadas, não garante ordem global e não é
cursor de replay. Recuperação de RECEIVED gera o mesmo contrato após commit;
retransmissão já PROCESSED apenas repara resumo, sem evento novo. Crash após
commit pode perder notificação, conforme F07.6. Horário de emissão é derivado
no pipeline, não aceito do remetente.

TDD: primeiro mudar expectativas de versão, metadata exata e instante de emissão
no teste de commit; acrescentar recuperação e ausência em rejeição/NOT_FOUND.
Confirmar RED antes de implementar. Manter testes de rollback/listeners/shutdown.
Executar test:unit, lint/build e diff --check; conferir saúde do container.

## Decisões e pendências

- Em 14/10/2026 o programador escolheu "Buscar pelo REST": evento externo
  informa atualização; valores continuam nas consultas REST autorizadas.
- Falha Redis: programador escolheu pausar novas recepções MQTT, concluindo
  transações em curso; retomar com sessão persistente quando Redis voltar.
  REST continua disponível. Coordenador local implementado em 8.3.1, passivo
  e testado sem serviços externos; integração real segue pendente.
- Em 15/10/2026 aprovados: Origin obrigatório da lista CORS, revalidação em cada
  assinatura/aviso e sessão ociosa a cada 30 s; até 5 conexões/sessão e 20
  recursos/conexão por instância. Serviço passivo no recorte 8.4; aplicação de
  timers/contadores/entrega no gateway 8.5.
- Recorte 8.4 entregue: parser/autorização passivos, cookie HS256/sessão atual,
  Origin CORS obrigatório e ResourceAccessService, 44 suítes/920 testes,
  lint/build e backend Docker atualizado com live/readiness ok. Evidências em
  [sessão e autorização](backend-phase-8-session-authorization.md).
- Recorte 8.5 implementa gateway/adaptador e integra lifecycle ao coordenador;
  namespace recusa conexões até início explícito/Redis ok. Timer, quotas e
  autorização por aviso aplicados conforme decisão. Plano/evidências em
  [gateway Socket.IO](backend-phase-8-socket-gateway.md).
- Evidência 8.5: 46 suítes/940 testes, lint/build e diff aprovados; imagem
  4ceb0bb4d8cf, live/readiness ok, probes Engine.IO sem Origin/alheio 403.
  Sem início do coordenador ou ensaio autorizado completo do protocolo.
- Integração com frontend e ativação real do pipeline permanecem fora de 8.1.

## Evidência local 8.1 — 14/10/2026

TDD RED: dois testes falharam pela ausência de metadata no evento após commit
e na recuperação. GREEN: 39 suítes/812 testes unitários, três casos novos;
lint/build aprovados. Expectativa exata do objeto evita campos extras e confere
timestamp gerado depois da resolução do commit. Rejeição/NOT_FOUND não emitem;
testes anteriores preservam falha, reparo, shutdown e listeners.

Constante/tipo em mqtt-events.ts, emissão tipada no pipeline; sem helper,
consulta ou dependência extra. Limites do EventEmitter, perda após commit e
recálculo de TEST sem notificação própria registrados no contrato.
Backend reconstruído/reiniciado; live ok, readiness inicialmente com timeout
de cliente/503 e depois ok com database/redis ok e MQTT disabled. Causa do
transitório não atribuída. Sem novo ensaio SQL/broker, porque este lote
altera apenas metadata em memória e mantém o processamento transacional.

## Escopo 8.2 — contrato externo com busca REST

Decisão do programador autoriza fechar o contrato de invalidação em
Api/realtime-contract-v1.md. Definir namespace/comandos/ACK, envelope mínimo por
recurso, consultas afetadas e recuperação. Atualizar este plano, índice do
roadmap e contexto diário. Nenhuma implementação de transporte, frontend,
schema, tipo compartilhado sem consumidor ou alteração de runtime neste lote;
não reconstruir imagem sem mudança de código/configuração executável.

O aviso externo não herda diretamente o evento interno: um acesso a teste não
autoriza instalação e vice-versa. Usar apenas tipo/ID do recurso autorizado,
versão e horário de emissão. Não enviar ID do bruto, medições ou IDs de outros
recursos. Avisos são invalidações repetíveis, sem cursor de replay nem ordem
global. Consumidor agrega consultas em curso e refaz após aviso concorrente.

Assinatura confirmada antecede consulta REST; reconexão repete assinatura e
consulta. Consulta em voo não pode apagar invalidação posterior. Mensagens
tardias invalidam filtros históricos ativos, sem usar occurredAt como captura.
Paginação continua contrato REST atual, sem prometer snapshot transacional.

Limites de conexões/assinaturas e fallback quando Redis fica indisponível
continuam pendentes de decisão antes de ativar transporte; essa escolha não
foi inferida da preferência por REST. Revisão documental e diff --check são a
validação deste lote; não alegar cobertura de Redis/Socket.IO por testes 8.1.

## Escopo autorizado 8.3 — transporte Redis passivo

Programador solicitou próximo lote em 14/10/2026. Ao decidir falha de Redis,
escolheu **pausar também a ingestão**, em vez de manter ingestão ativa.
Confirmou concluir transações já iniciadas, pausar novas recepções MQTT até
Redis voltar, preservar sessão persistente e brutos pendentes. REST permanece
disponível; sem polling automático ou fila Redis.
Essa política exige coordenador posterior: o transporte isolado não pode alegar
que já pausa MQTT. Não ativar nada no bootstrap até integrar/testar a política.

Criar modules/realtime/realtime-contract.ts/spec.ts, realtime-pubsub.service.ts/
spec.ts e realtime.module.ts; registrar módulo passivo em AppModule. ConfigModule
e REDIS_HOST/PORT existentes; ioredis já instalado. Sem schema/migration,
dependência, configuração real ou frontend. Usar eventos internos confiáveis
data.updated e status.changed para posterior gateway/coordenador.

start explícito abre duas conexões Redis lazy (publicação/assinatura), sem fila
offline ou reenvio automático de comandos pendentes. Reconexão limitada e nova
PSUBSCRIBE após ready; estado ok apenas com ambas prontas e assinatura aceita.
Canal vers:v1:realtime:{test|installation}:{uuid}, pattern interno controlado;
payload externo 8.2 estrito, máximo técnico de 1.024 bytes. Reutilizar validador
UTC atual e UUID v4. Validar também relação canal/recurso e recusar campos extras.
Limite é do conteúdo entregue à aplicação, sem alegar bloqueio pré-alocação Redis.

Publicar retorna booleano seguro, sem jogar falha de transporte na transação
de persistência. O coordenador posterior observa disponibilidade para pausar
novas atividades conforme decisão; histórico já confirmado nunca é desfeito.
Falha ambígua após PUBLISH não prova que o Redis não entregou; sem retry manual.
Shutdown desconecta ambos sem fila durável e ignora callbacks tardios. Eventos
de disponibilidade não iniciam MQTT nem buscam REST automaticamente neste lote.

Testes primeiro: parser válido/limites/allowlist/UUID/data; constructor inerte,
start duplo, opções sem fila, duas conexões, assinatura/reconexão, callback antigo,
canal divergente, payload inválido, falha de publicar/conectar/assinar, listeners
com erro, status e shutdown. Confirmar RED, depois test:unit/lint/build.
Documentar limites e coordenador pendente; reconstruir somente backend e
verificar saúde. Sem ensaio Redis real: autorização anterior é só MQTT/DB.

Antes da ativação em 8.5, implementar e testar coordenador de pausa/retomada:
não usar onModuleDestroy como pausa reversível; aguardar trabalhos em curso,
impedir novas recepções/reconexões enquanto Redis indisponível e recuperar
pendências ao retomar. Sessão persistente não garante retenção ilimitada no
broker; limites reais continuam dependentes do ensaio autorizado.

Coordenação local entregue no recorte [8.3.1](backend-phase-8-ingestion-coordination.md),
incluindo pausa reversível e recuperação antes da retomada. Não ativa transporte
no bootstrap nem substitui ponte de recursos/gateway/ensaio real.

Ponte local entregue no recorte [8.3.2](backend-phase-8-notification-bridge.md):
recursos normalizados alimentam avisos mínimos após commit, sob início explícito.
Autorização de sessão/recurso, gateway e ensaio real continuam etapas seguintes.

### Evidência local 8.3

TDD RED por módulos ausentes; depois RED para estado incorretamente ok após
falha PUBLISH e listener anterior bloqueando o próximo. Corrigidos no transporte:
falha de publicar sinaliza indisponibilidade/reconexão e cada listener possui
contenção própria, preservando once. Import reflect-metadata reutilizado do
padrão de contrato MQTT para executar validador UTC também isoladamente.

GREEN: 41 suítes/845 testes unitários, 33 novos; lint/build aprovados. Parser,
canal/recurso, callbacks antigos, queda das duas conexões, publicação sem fila,
reconexão/assinatura, listeners e shutdown testados com mocks. Nenhum ensaio
real Redis ou garantia de retenção/entrega inferida. Backend reconstruído e
reiniciado. Primeiras probes sem resposta durante início; depois live ok,
readiness 503 e repetição ok com database/redis ok e MQTT disabled. Transporte
Pub/Sub não iniciado. diff --check e espaços finais dos arquivos novos aprovados.
