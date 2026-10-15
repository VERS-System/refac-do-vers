<!-- Descreve eventos internos e limites de entrega antes de ativar Redis ou Socket.IO. -->
# Tempo real v1 — contrato incremental

Estado: evento interno 8.1 implementado; contrato externo 8.2 documentado após
decisão do programador de buscar valores pelo REST em 14/10/2026. Namespace,
gateway/comandos implementados localmente em 8.5, ainda sem início operacional
automático ou ensaio real Redis/Socket.IO/DB. Autorização disponível desde 8.4. Plano em
[F08](../plans/backend-phase-8-execution-roadmap.md).

## Evento interno telemetry.processed

Emitido por MqttPipelineService.events somente depois de process confirmar o
commit de amostras, resumos e estado. Consumidores são código interno confiável;
não encaminhar este objeto diretamente a sockets ou Redis sem contrato,
validação e autorização específicos.

```json
{
  "version": 1,
  "type": "telemetry.processed",
  "messageId": "00000000-0000-4000-8000-000000000701",
  "correlationId": "00000000-0000-4000-8000-000000000701",
  "occurredAt": "2026-10-14T12:00:01.000Z"
}
```

| Campo | Significado |
| --- | --- |
| version | Versão do envelope interno, literal 1. |
| type | Nome do evento, literal telemetry.processed. |
| messageId | ID interno de mqtt_messages; não é o messageId enviado no MQTT. |
| correlationId | Mesmo ID interno, para correlacionar processamento e histórico. |
| occurredAt | UTC ISO do momento de emissão, gerado no backend após o commit. |

Identidade de deduplicação: (type, version, messageId). Não há eventId aleatório
adicional. O evento não contém medições, payload bruto, credenciais, dados
pessoais nem lista de destinatários. Metadados de instalação/teste serão
resolvidos a partir do histórico confiável quando houver roteamento externo.

occurredAt não representa captura, ordenação global ou cursor de paginação.
Mensagem tardia pode afetar períodos antigos; consumidor não pode ignorar a
atualização só porque uma captura mais recente já chegou.

## Falhas, recuperação e duplicatas

- Recuperar RECEIVED e concluir o commit emite o mesmo contrato.
- REJECTED, NOT_FOUND e falha de processamento não emitem evento.
- ALREADY_PROCESSED repara resumos sem nova notificação de telemetria.
- Erro síncrono/assíncrono de listener não desfaz histórico nem impede ACK;
  mantém código seguro de log, sem repassar causa ou conteúdo recebido.
- Desde 8.3.2 o pipeline isola cada listener síncrono/assíncrono, preservando
  once: uma falha não impede os consumidores seguintes, incluindo a ponte.
- Crash após commit pode perder evento. Não há outbox, replay ou garantia de
  entrega; PostgreSQL e REST autorizado continuam a fonte de verdade.
- Recálculo de TEST ao encerrar teste, sem nova mensagem, ainda não produz
  evento próprio. Essa necessidade deverá ser resolvida no contrato externo.

## Acesso e recuperação pelo cliente

REST atual permite consultar telemetria/resumos por teste e resumos por
instalação. Teste admite criador histórico ou vínculo atual; instalação exige
vínculo atual. Redis ou salas Socket.IO nunca podem ampliar esses acessos.
Snapshot, assinatura confirmada e nova consulta devem fechar a janela entre
carregamento e assinatura; reconexão exige nova consulta autorizada.

Decisão: o evento externo avisa que há dados atualizados e o cliente consulta
os valores pelo REST autorizado. Não transportar medições completas no aviso.
Autenticação existente usa cookies HttpOnly e sessão validada no banco, sem
token em query ou auth. Origin, revogação e limites aprovados em 15/10/2026
estão registrados no lote 8.4 abaixo; aplicação no gateway segue pendente.

## Contrato externo 8.2 — implementado localmente em 8.5

Namespace Socket.IO: `/realtime`, usando transporte do mesmo backend.
Namespace não é rota REST `/api/v1`; caminho Engine.IO permanece `/socket.io`.
Conexão autorizada não concede automaticamente assinatura de nenhum recurso.

Comandos `subscribe` e `unsubscribe` recebem um recurso por chamada:

```json
{
  "version": 1,
  "resource": {
    "type": "test",
    "id": "00000000-0000-4000-8000-000000000501"
  }
}
```

Aceitar apenas version=1, resource.type=test ou installation e ID UUID v4;
recusar campos extras, arrays, IDs de usuário, nome de sala ou canal arbitrário.
IDs e tipos de destinatário nunca são aceitos do envelope MQTT.

ACK de sucesso usa o callback Socket.IO:

```json
{
  "ok": true,
  "version": 1,
  "resource": {
    "type": "test",
    "id": "00000000-0000-4000-8000-000000000501"
  }
}
```

ACK só confirma subscribe depois de validar sessão/acesso e concluir assinatura.
Não significa que um snapshot foi entregue ou que eventos futuros são duráveis.
Repetir subscribe não duplica assinatura; unsubscribe é idempotente, remove
somente a assinatura do próprio socket e não altera dados históricos.

Erros usam `{ "ok": false, "version": 1, "code": "RESOURCE_UNAVAILABLE" }`.
Recurso ausente e recurso sem acesso recebem esse mesmo código, sem detalhes.
Outros códigos previstos: INVALID_REQUEST, UNAUTHENTICATED, LIMIT_EXCEEDED e
REALTIME_UNAVAILABLE. Nenhum erro contém payload recebido, token ou causa interna.
Limites aprovados em 8.4 e aplicados em 8.5. Política Redis
aprovada em 8.3 está registrada abaixo.

### Aviso data.updated

Evento externo `data.updated`, com envelope mínimo:

```json
{
  "version": 1,
  "type": "data.updated",
  "resource": {
    "type": "test",
    "id": "00000000-0000-4000-8000-000000000501"
  },
  "occurredAt": "2026-10-14T12:00:01.000Z"
}
```

occurredAt é horário UTC de emissão do aviso, não captura nem cursor. Não há
messageId/correlationId do bruto no pacote externo. Um aviso para teste não
inclui instalação; um aviso para instalação não inclui testes ou dispositivos.
Roteamento deve resolver recursos realmente afetados no histórico normalizado,
inclusive amostras sem teste e lotes parcialmente fora do intervalo autorizado.
Não inferir associação apenas pelo testId declarado no bruto.

| Recurso assinado | Consultas REST a invalidar/refazer |
| --- | --- |
| test | GET /api/v1/tests/:id/telemetry e GET /api/v1/tests/:id/energy-summaries |
| installation | GET /api/v1/installations/:id/energy-summaries |

Invalidar também comparações carregadas que incluam o teste afetado, usando
GET /api/v1/test-comparisons. Instalação não possui consulta pública própria de
amostras nesta versão; o aviso não cria uma rota nem amplia acesso a testes.
Reutilizar filtros/paginação atuais. A sessão REST é validada em cada consulta;
acesso ao Socket.IO não substitui essa autorização.

### Consistência e reconexão

1. Instalar listener local, conectar com a sessão existente e solicitar subscribe.
2. Após ACK positivo, buscar o snapshot pelo REST e manter a assinatura ativa.
   Snapshot obtido antes da assinatura exige nova consulta após ACK.
3. Receber data.updated marca as consultas do recurso como desatualizadas.
   Agrupar avisos recebidos enquanto há consulta em andamento e executar nova
   busca ao concluir, se outro aviso chegou. Resposta antiga não apaga aviso novo.
4. Não descartar aviso pelo occurredAt ou por captura mais antiga: leituras
   tardias alteram intervalos históricos. Invalidar filtros ativos do recurso,
   em vez de consultar apenas capturas posteriores ao horário do evento.
5. Em reconexão, repetir subscribe/ACK e nova consulta REST. Não depender de
   recuperação automática de salas, memória do socket anterior ou replay Redis.
6. Troca de recurso remove assinatura/listener anterior e cancela ou ignora
   respostas REST que pertençam à tela/recurso anterior. Perda de acesso remove
   dados protegidos da tela conforme tratamento de sessão/acesso do cliente.

Avisos são repetíveis e não carregam deltas: recebê-los duas vezes não soma
energia ou duplica amostras. Não existe sequência global nem identificador para
descartar avisos futuros do mesmo recurso. Buscar estado atual pelo REST é a
reconciliação; paginação offset não promete snapshot atômico entre páginas.

Desconexão/perda de aviso não apaga o histórico. UI deve mostrar condição
desatualizada quando não puder confirmar atualização. Não criar polling
automático sem decisão. Encerrar teste/recálculo sem mensagem MQTT ainda não
produz aviso no código atual: implementação futura precisa cobrir essa origem
ou documentar sua atualização por nova consulta, sem alegar cobertura existente.

### Fronteiras de segurança e implementação

Salas e canais serão internos ao servidor, separados por tipo/ID do recurso.
Sessão, Origin, autorização por recurso e revogação precisam ser aplicados no
gateway antes da ativação. Criador histórico de teste pode consultar aquele
teste sem receber notificações da instalação à qual não possui vínculo atual.
ADMIN não ganha exceção global. Assinar uma instalação não libera seus testes.

Não adicionar types/helpers sem consumidor apenas para representar este plano.
Lotes 8.3–8.5 implementam validação, lifecycle e autorização local nas fronteiras
de Redis/Socket.IO. Este documento não comprova ensaio real do transporte.

## Matriz de consistência — lote 8.6

Este recorte consolida o contrato para consumidores; não implementa a integração
do dashboard/mobile. O servidor entrega invalidações, não snapshots ou deltas.

| Cenário | Comportamento exigido do consumidor |
| --- | --- |
| Snapshot anterior ao ACK | Refazer a consulta após subscribe confirmado; o resultado anterior não fecha a janela de perda. |
| Aviso durante consulta REST | Marcar pendência e consultar novamente depois que a consulta terminar; não limpar a pendência com a resposta antiga. |
| Avisos repetidos durante consulta | Agrupar em uma busca seguinte, sem somar valores recebidos nem iniciar buscas ilimitadas. |
| Aviso com occurredAt anterior | Invalidar normalmente; o horário não é cursor e dados tardios podem alterar filtros históricos. |
| Desconexão, inclusive Redis indisponível | Mostrar desatualização; reconectar com backoff, assinar, aguardar ACK e obter novo snapshot. |
| Perda de aviso sem desconexão observável | Sem detecção garantida nesta versão; nova consulta ao reabrir/reconectar reconcilia o estado. |
| Troca de recurso/sessão durante consulta | Cancelar ou ignorar a resposta antiga e remover assinatura/listener anterior. |
| Perda de acesso na consulta | Remover dados protegidos e seguir o tratamento REST de sessão/recurso; não continuar mostrando cache autorizado anteriormente. |
| Encerramento/recálculo de TEST sem MQTT | Refazer REST após a mutação; outros observadores ainda não recebem aviso dessa origem. |

Falha na busca REST mantém o estado desatualizado e o tratamento de erro atual;
não acrescenta polling automático ou fila durável. Eventos agrupados enquanto
o gateway autoriza um destinatário produzem uma invalidação posterior à consulta
de autorização, suficiente para pedir o estado atual, sem preservar cada aviso.
Não existe garantia de frescor contínuo, replay ou snapshot entre páginas.

Testes F08.6 verificam no gateway sintético que repetição/horário anterior não
são descartados e que reconexão não restaura assinatura nem reproduz aviso
perdido. Não verificam o estado de tela, consultas REST em voo ou protocolo real.
Esses cenários são critérios de aceite da integração futura dos clientes;
o ensaio de transporte real permanece em F08.7, com autorização própria.

Plano: [F08.6 — consistência](../plans/backend-phase-8-consistency.md).

## Transporte interno Redis — lote 8.3

RealtimeModule registra/exporta RealtimePubSubService no backend. Constructor
não abre rede; nenhum bootstrap chama start. start explícito cria duas conexões
ioredis, publicação e assinatura, usando REDIS_HOST/PORT existentes. Nenhuma
conexão de health é reaproveitada para Pub/Sub. Não há Socket.IO neste lote.

Canal de publicação: `vers:v1:realtime:{test|installation}:{uuid}`. Assinatura
interna usa PSUBSCRIBE `vers:v1:realtime:*`. Ambos transportam somente o aviso
data.updated validado, nunca envelope MQTT ou permissões do usuário. Validação
do canal recebido exige correspondência exata com tipo/ID do recurso no aviso.
Essa assinatura interna não autoriza clientes finais a receber os eventos.

Parser exige versão/tipo, campos permitidos, UUID v4 e data UTC válida. Conteúdo
é limitado a 1.024 bytes antes do JSON.parse; ioredis já recebeu/decodificou a
mensagem nesse ponto, portanto não é proteção pré-alocação no Redis/rede.
Publicação também revalida e serializa apenas os campos conhecidos.

Estados locais: stopped antes do início/após shutdown, unavailable durante
conexão/quedas e ok somente após ambas prontas e assinatura confirmada. Eventos
internos status.changed usam `{ "status": "ok" }`, unavailable ou stopped;
data.updated usa o envelope validado. Listeners são isolados individualmente,
inclusive rejeições assíncronas e once, com log apenas de código seguro.

Reconexão pelo ioredis com backoff de 1 a 30 s; PSUBSCRIBE refeito após ready.
Geração da assinatura impede callback anterior à queda de tornar o canal ok.
Sem fila offline, reenvio automático de comandos ou retry manual de PUBLISH.
Timeout de conexão/comando de dois segundos. Falha de PUBLISH sinaliza
unavailable e força reconexão; payload inválido é recusado sem derrubar canal.
publish retorna false quando não pode publicar, sem lançar falha de transporte
para transação histórica. true indica resposta de PUBLISH, não entrega a um
usuário; zero assinantes continua possível. Falha/timeout pode ter ocorrido
após entrega, portanto false não prova ausência de aviso.

Shutdown desconecta ambas uma vez, interrompe reconexões e ignora callbacks
posteriores; não promete drenar publicações em voo. Não existe fila durável,
replay ou busca REST automática no servidor.

### Decisão operacional de falha Redis — 14/10/2026

Programador escolheu **pausar também a ingestão**, e confirmou concluir
transações já iniciadas e interromper novas recepções MQTT até o Redis voltar.
Preservar sessão persistente e brutos pendentes; REST permanece disponível.
Não descartar nem desfazer dados já confirmados. Retomada do canal exige nova
consulta REST pelo cliente conforme fluxo de recuperação acima.

O transporte 8.3 fornece disponibilidade; coordenação reversível foi adicionada
no lote 8.3.1 abaixo. Resolução das amostras afetadas/publicação de avisos está
implementada passivamente em 8.3.2. Retenção finita do broker precisa ser conferida no ambiente
real, sem alegar garantia ilimitada offline.

Evidência deste lote usa mocks: constructor inerte, duas conexões, validação,
canal divergente, quedas, assinatura antiga, erros, listener e shutdown. Ensaio
real Redis/MQTT/Socket.IO continua reservado ao lote isolado autorizado 8.7.

## Coordenação de ingestão — lote 8.3.1

RealtimeIngestionService, exportado por RealtimeModule, é o ponto de entrada
explícito da operação conjunta. Constructor não observa eventos nem abre rede;
nenhum bootstrap chama start. Ao iniciar, abre Redis e aguarda status ok antes
de iniciar o pipeline. Métodos inferiores de transporte/pipeline continuam
disponíveis para testes isolados; ativação conjunta deve usar o coordenador.

Na queda, pipeline.pause bloqueia novos handles imediatamente, cancela timer
e interrompe recuperação entre itens. Trabalho já iniciado pode confirmar seu
commit. MqttService.pause cancela assinatura/reconexão, recusa novos pacotes
sem ACK positivo e aguarda callbacks aceitos, incluindo ACK, antes de fechar o
cliente. Pausa é reversível; onModuleDestroy continua definitivo.

Na volta do Redis, transições serializadas aguardam a drenagem, tentam recuperar
brutos pendentes e resumos conforme regras F07 e só então reabrem MQTT. Timer de
recuperação permanece único. Novo cliente usa a configuração existente, mesmo
clientId e clean=false; não redefine sequência nem apaga histórico. Recuperação
mantém falhas individuais pendentes, conforme F07, sem prometer fila zerada.

Nova queda durante início/retomada cancela a reabertura; callbacks de cliente ou
assinatura antigos não restauram disponibilidade. Falha transitória na ativação
mantém pausa e usa backoff de 1–30 s enquanto Redis estiver ok. Queda/shutdown ou
retomada bem-sucedida cancelam retentativa pendente. Shutdown remove listener e
timer, aguarda transição/trabalhos e fecha dependências, sem retomada posterior.

Não há fila Redis, polling REST automático ou mudança em transações já
confirmadas. Preservar sessão não garante retenção ilimitada do broker. Avisos
perdidos continuam reconciliados pelo REST autorizado quando o cliente voltar.
Ponte de recursos normalizados→data.updated adicionada em 8.3.2. Autorização/
gateway Socket.IO e ensaio real continuam pendentes. Ativação segue explícita.

Plano e evidências em [F08.3.1](../plans/backend-phase-8-ingestion-coordination.md).

## Ponte de avisos — lote 8.3.2

RealtimeNotificationService é registrado no RealtimeModule e instalado pelo
coordenador antes de iniciar/recuperar o pipeline. Constructor permanece inerte.
O listener telemetry.processed valida versão, tipo, UUID interno, correlação e
horário antes de consultar somente installationId/testId agrupados nas amostras
normalizadas daquela mensagem. Não lê bruto, medições ou identidade de usuário.

Cada instalação/teste distinto e não nulo recebe um data.updated pelo transporte
existente, com occurredAt UTC do aviso. Instalação repetida em vários grupos só
recebe um aviso por evento. Amostras sem teste avisam somente a instalação;
teste órfão de instalação ainda pode receber aviso próprio; grupo com ambos
nulos ou mensagem sem amostras não gera aviso. Teste não é inferido do bruto,
inclusive em lote parcialmente fora do intervalo.

Falha de consulta/publicação é contida em código seguro de log. Falha de um
recurso não impede tentar os seguintes; não há retry manual, outbox ou garantia
de entrega. Publicações acontecem após commit e não são aguardadas pelo ACK do
pipeline. Redis indisponível continua sinalizando pausa ao coordenador; o
histórico confirmado não é desfeito se um aviso falhar.

Shutdown remove listener, espera tarefas aceitas e não publica resultados de
lookup obtidos após início do encerramento. O coordenador tenta concluir
pipeline/ponte antes de fechar Redis; hooks Nest podem ocorrer simultaneamente,
portanto não prometer aviso final durante shutdown. Cliente reconcilia pelo REST.

Ensaio local usa mocks e integração em memória com pipeline real. Não comprova
SQL/Redis reais, retenção de broker ou entrega/autorização Socket.IO. Recálculo
de TEST sem mensagem nova ainda não possui evento próprio. Plano/evidências em
[F08.3.2](../plans/backend-phase-8-notification-bridge.md).

## Sessão e autorização — lote 8.4

RealtimeAuthorizationService é passivo e exportado pelo RealtimeModule. O parser
parseRealtimeSubscription aceita apenas o comando estrito v1 descrito acima.
authenticate exige Origin presente e exatamente contido na lista CORS atual;
ausência, null, wildcard ou origem alheia são recusados. Isso limita esta versão
ao dashboard web; clientes nativos sem Origin dependem de decisão posterior.

Somente cookie único vers_access é lido. JwtService valida assinatura HS256 e
prazo; AuthService valida claims, sessão não revogada/substituída/expirada e
conta ACTIVE no banco. authorize repete essa validação e aplica requireTest ou
requireInstallation do REST, sem cache e sem exceção global ADMIN. Criador
histórico continua autorizado no teste, sem conceder acesso à instalação.

Falha de credencial/Origin retorna UNAUTHENTICATED; comando inválido,
INVALID_REQUEST; recurso ausente ou alheio, RESOURCE_UNAVAILABLE. Falha de banco
retorna REALTIME_UNAVAILABLE. Nenhum erro inclui causa, token ou conteúdo bruto.
Serviço não abre namespace, sala, timer ou conexão e não entrega avisos sozinho.

Políticas aprovadas para F08.5: revalidar sessão e vínculo em cada assinatura e
antes de cada aviso; conferir sessão ociosa a cada 30 segundos. Até 5 conexões
por sessão e 20 recursos por conexão, por instância do backend. Não são quotas
globais entre réplicas. Refresh/expiração exigirá reconexão com cookie atualizado;
não confiar permanentemente na autenticação do handshake nem emitir direto à
sala sem conferir os destinatários. Revogação concorrente à consulta não oferece
atomicidade com a entrega de rede. Timer/contadores/encerramento serão aplicados
no gateway; este recorte apenas fornece verificações reutilizáveis.

Plano e evidências: [F08.4](../plans/backend-phase-8-session-authorization.md).

## Gateway Socket.IO — lote 8.5

RealtimeIoAdapter é instalado por configureApplication e reaproveita CORS com
credenciais. Engine.IO limita payload a 1024 bytes e permite polling/websocket;
allowRequest recusa Origin ausente/alheio e middleware do namespace repete a
validação de Origin/cookie/sessão. Sem recuperação automática de salas.
Transporte pode ser aberto no bootstrap; namespace /realtime recusa conexão
com REALTIME_UNAVAILABLE até o início explícito e Redis confirmado disponível.

RealtimeIngestionService.start inicia gateway antes de Redis e instala a ponte
antes do pipeline. Nenhum bootstrap chama esse método. Gateway não inicia Redis
ou MQTT por conta própria. Início instala listeners e um timer de 30 s.
Falha no início do coordenador encerra o gateway; shutdown é definitivo e
idempotente, remove listeners/timer e desconecta sockets antes de drenar ingestão.

Middleware devolve connect_error com código seguro no message. A quota é de
5 conexões por sessão por instância, incluindo reservas autorizadas anteriores
ao connect; queda de transporte libera a reserva. Não limitar pelo papel ADMIN
nem aceitar token de auth/query. Cookie original fica associado à conexão;
após refresh, reconectar com o cookie novo. Checagem ociosa não sobrepõe consulta
do mesmo socket e fecha sessão inválida ou falha operacional de autenticação.

Cada comando aplica parser e autorização F08.4 novamente, inclusive comandos
repetidos. Até 20 recursos por conexão; repetição não consome nova vaga. Apenas
uma alteração de assinatura por socket por vez, sem fila: comando sobreposto
recebe REALTIME_UNAVAILABLE, devendo ser repetido após o ACK anterior.
ACK positivo aguarda join/leave; unsubscribe remove roteamento antes de aguardar
leave. UUIDs equivalentes em maiúsculas/minúsculas usam a mesma sala interna.
Erro de sessão encerra conexão; nesse caso não prometer recebimento do ACK.

Aviso Pub/Sub é validado novamente. Cada destinatário inscrito passa por nova
consulta de sessão e vínculo antes do emit individual. Não usar broadcast à
sala inteira. Vínculo perdido remove assinatura; sessão inválida ou falha
operacional fecha conexão. Checagem após await impede entrega a assinatura
cancelada, socket encerrado ou Redis indisponível. Consultas de uma assinatura
antiga não bloqueiam/removem uma nova assinatura do mesmo recurso.

Avisos do mesmo recurso/assinatura durante uma autorização pendente são
agrupados em uma invalidação emitida após essa consulta. Não há deltas, cursor,
fila ou garantia de entrega. Cliente busca estado atual pelo REST após ACK/aviso.
Na queda Redis, sockets são encerrados para exigir nova assinatura e snapshot;
volta do Redis não restaura salas. Socket.IO pode indicar `io server disconnect`:
cliente deve chamar connect novamente com backoff, sem polling REST automático.
Rejeição de namespace também exige nova tentativa explícita do cliente.

Testes usam sockets e Redis sintéticos; adaptador tem servidor simulado.
Ensaios reais de protocolo/reconexão/DB continuam em F08.7. Frontend ainda não
foi integrado. Plano: [F08.5](../plans/backend-phase-8-socket-gateway.md).
