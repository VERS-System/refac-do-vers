<!-- Descreve eventos internos e limites de entrega antes de ativar Redis ou Socket.IO. -->
# Tempo real v1 — contrato incremental

Estado: evento interno 8.1 implementado; contrato externo 8.2 documentado após
decisão do programador de buscar valores pelo REST em 14/10/2026. Namespace,
comandos e transporte descritos abaixo ainda não estão implementados. Plano em
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
- EventEmitter não garante isolamento entre listeners síncronos: um listener
  que lança pode impedir os seguintes. Listeners futuros devem conter falhas.
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
token em query ou auth. Limites, revogação e Origin serão definidos antes da
ativação do transporte externo.

## Contrato externo 8.2 — a implementar

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
Valores dos limites serão fechados antes do código do gateway. Política Redis
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
Lotes 8.3–8.5 implementarão e testarão validação, lifecycle e autorização nas
fronteiras de Redis/Socket.IO. Este documento não comprova transporte funcional.

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
no lote 8.3.1 abaixo. Resolução das amostras afetadas/publicação de avisos ainda
não implementadas. Retenção finita do broker precisa ser conferida no ambiente
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
Ainda faltam ponte de recursos normalizados→data.updated, autorização/gateway
Socket.IO e ensaio real da coordenação. Nada disso é ativado por este lote.

Plano e evidências em [F08.3.1](../plans/backend-phase-8-ingestion-coordination.md).
