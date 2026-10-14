<!-- Planeja a ingestão MQTT em etapas revisáveis antes da integração real. -->
# F07 — Contrato e ingestão MQTT

Estado: recortes locais 7.1/7.2 entregues para revisão em 14/10/2026.
Sequência, políticas temporais e REST não bloqueado por MQTT aprovados;
integração real não iniciada.
F05 preservada; F06 permanece com as decisões registradas. F08 e F09 serão
planejadas separadamente após validação do programador.

## Objetivo e condições de início

Receber mensagens autenticadas, persistir dados rastreáveis e alimentar o
mesmo cálculo da F06, sem duplicar amostras ou energia.
MQTT permanece um módulo interno de `services/backend`; Redis não será fila.

Fontes: [F07](backend-roadmap/07-ingestao-mqtt.md),
[contrato do firmware](mqtt-esp-roadmap/06-contrato-mqtt-publicacao.md),
[roadmap estratégico](backend-mqtt-roadmap.md) e schema Prisma atual.

Planejamento e exemplos podem avançar agora. Integração exige ESP32 publicando
ou simulador aprovado, broker de teste, identidade provisionada, unidades,
payload versionado, cadência e vínculo com o teste confirmados. Regras de
domínio da F05 e cálculos da F06 devem estar disponíveis para seu uso.

## Etapas — uma entrega e revisão por vez

### 7.1 — Fechar contrato MQTT

- Usar tópicos `vers/v1/devices/{deviceUid}/{telemetry|status|events}`.
- Definir envelope, medições com unidades, limites de tamanho/profundidade,
  quantidade por lote, QoS, retained e comportamento de versões desconhecidas.
- Separar tempo de captura do tempo de recebimento; definir relógio não
  sincronizado, atraso aceitável e vínculo das amostras ao teste.
- Resolver identidade de inicialização e sequência: hoje o schema tem
  unicidade `(deviceId, sequence)`, incompatível com sequência reiniciada
  sem uma regra de sessão ou continuidade persistente.
- Definir resultado de lote parcialmente inválido e contratos de status/eventos;
  eventos não poderão alterar o estado do teste sem regra aprovada.

Testes: exemplos versionados válidos/parciais/inválidos, ausente/null/zero,
versão desconhecida, timestamps e tópico divergente. Saída: contrato aprovado
em comum com firmware/simulador, sem presumir medições do hardware.

### 7.2 — Cliente e segurança no broker

- Reutilizar biblioteca instalada adequada; adicionar dependência somente
  se necessária. Conexão TLS com validação de certificado.
- Credencial individual revogável do dispositivo e ACL de publicação limitada
  aos próprios tópicos. Credencial do consumidor backend separada, somente
  com permissões necessárias; identidade no payload não autentica remetente.
- Assinatura, reconexão com backoff limitado, encerramento limpo e readiness;
  distinguir backend saudável de broker indisponível conforme política aprovada.
- Configurar limites de entrada no broker e consumidor, sem ler `.env`,
  registrar credenciais ou alterar recursos externos nesta etapa de planejamento.

Testes: conexão, desconexão, reconexão, falha TLS e encerramento simulados;
ACL e revogação exigem ensaio real autorizado no broker. Saída: conexão segura
verificada, sem alegar que mocks comprovam isolamento no HiveMQ.

### 7.3 — Recepção e rastreabilidade

- Validar tópico e bytes antes do parse; limitar profundidade/campos/amostras
  com mecanismo compatível com o parser escolhido, sem falsa garantia de
  validar profundidade antes de um parse completo com `JSON.parse`.
- Persistir envelope aceito com QoS, retained e horários, mantendo payload
  imutável e estado de processamento separado. Logs usam IDs e motivos seguros.
- Definir registro seguro de JSON malformado ou envelope incompleto: o schema
  atual exige JSON, messageId, versão, sequência e capturedAt. Não inventar
  esses campos para encaixar rejeições; decidir armazenamento/retencão próprios.
- Limitar rejeições armazenadas para evitar amplificação de tráfego inválido;
  não guardar segredos ou dados pessoais arbitrários recebidos no payload.

Testes: excesso de bytes, JSON inválido, profundidade, campos extras e
falha de persistência. Saída: aceites e rejeições rastreáveis conforme contrato.

### 7.4 — Identidade, autorização e duplicatas

- Cruzar tópico, envelope, dispositivo provisionado, instalação e teste.
- Recusar dispositivo revogado e vínculo incompatível; definir tratamento
  de mensagem capturada durante teste e recebida depois de seu encerramento.
- Usar restrições do banco para deduplicação concorrente. Mesmo ID com payload
  divergente deve ser conflito rastreável, nunca sobrescrever mensagem anterior.
- Tratar reinício de sequência, replay, duplicata e ordem de captura conforme
  contrato; não confundir contador acumulado com sequência de transporte.

Testes: identidade divergente, revogado, teste de outra instalação, mensagem
atrasada, duplicata concorrente e reinício. Saída: uma mensagem não gera duas
ingestões. Migrations eventualmente necessárias passam por revisão separada.

### 7.5 — Normalização das amostras

- Validar versão, finitude, unidades, faixas e coerência aprovadas; normalizar
  ausente como null sem transformar ausência em zero.
- Classificar amostras em `VALID`, `PARTIAL`, `SUSPECT` ou `INVALID`, separando
  essa classificação da qualidade dos resumos da F06.
- Reutilizar potência `V × I` da F06 e preservar potência reportada; contador
  acumulado é fonte principal de energia, com reinícios tratados por segmentos.
- Persistir amostras e atualização de estado da mensagem atomicamente;
  mensagens/amostras rejeitadas não entram silenciosamente nos cálculos.

Testes: valores extremos, lote parcial, ausência, zero, contador reiniciado e
falha no meio da transação. Saída: amostras normalizadas sem cálculo duplicado.

### 7.6 — Reprocessamento e pipeline da F06

- Recuperar mensagens persistidas e ainda não processadas após falha/reinício;
  não usar Redis Pub/Sub como garantia de entrega.
- Recomputar resumos de forma idempotente a partir da fonte histórica,
  inclusive quando chegam amostras atrasadas. Testar fronteiras de períodos.
- Emitir evento interno somente após commit. Evento prepara a F08; perda de
  evento não pode causar perda de amostra ou energia histórica.
- Evitar worker, serviço ou fila novos sem necessidade demonstrada; escolher
  recuperação mínima compatível com a carga aprovada.

Testes: falha após recepção, durante normalização, após commit e antes do
evento; recomputação repetida. Saída: recuperação sem duplicação ou perda
silenciosa, com evidência de transações/concorrência em PostgreSQL isolado.

### 7.7 — Ensaio e fechamento

- Executar testes unitários, lint e build antes do ensaio autorizado.
- Usar simulador aprovado ou ESP32 contra broker e banco de teste: envio,
  duplicata, atraso, reconexão, revogação e reinício do backend.
- Rastrear mensagem até amostras, energia/resumo ou motivo de rejeição;
  comparar números com fixtures da F06 e documentar diferenças.
- Atualizar contrato, exemplos, operação e contexto; revisão antes da F08.

## Decisões para validação

1. Origem do primeiro ensaio: simulador MQTT autorizado em 14/10/2026;
   ESP32 ainda sem firmware. Isso não autoriza conexão externa ou carga de banco.
2. Proposta de transporte: QoS 1 para telemetria e eventos; retained desativado
   nesses dois tópicos. Status/Last Will dependem do contrato de conectividade.
3. Reinício: sequência persistente escolhida em 14/10/2026; simulador reserva
   número em arquivo local antes da saída. Firmware futuro deve manter a regra.
4. Limites e atraso: definir com exemplos e cadência reais; não usar o limite
   REST de 100 registros como limite automático de lote MQTT.
5. Retenção e rejeições: definir quanto guardar e como registrar envelopes
   malformados sem payload irrestrito. Nenhuma limpeza automática sem decisão.
6. Eventos: confirmar quem inicia/finaliza teste e como mensagens offline
   serão associadas; o backend não muda regras operacionais por suposição.

## Arquivos previstos e limites

### Plano autorizado 7.2 — cliente MQTT com testes simulados

Programador autorizou continuar por lotes e aprovou em 14/10/2026 manter REST
disponível quando MQTT cair, sinalizando MQTT separadamente. readiness mantém
PostgreSQL/Redis obrigatórios e passa a informar mqtt disabled/unavailable/ok.
TLS obrigatório e credencial consumidora separada; exemplo sem segredos reais.

Escopo: implementar mqtt.service.ts e mqtt.module.ts antes vazios, novo
mqtt.service.spec.ts; modificar config/env.config.ts/spec.ts e .env.example
do backend; health.service.ts/spec.ts, health.module.ts e teste HTTP foundation;
contratos endpoints/OpenAPI, documento MQTT, roadmap e contexto.
Sem configuração nova na raiz, Docker, schema, migrations ou dependências.

Usar mqtt 5.15.2 já instalado. Cliente desativado por padrão; módulo não conecta
automaticamente: start exige processador explícito, recebido pelo lote posterior
de ingestão. Conectar TLS com verificação de certificado, credenciais fora da
URL, clientId estável configurado e sessão MQTT 3.1.1 não limpa. Assinar somente
telemetry QoS 1, confirmar concessão antes de sinalizar ok. Reconexão exponencial
1–30 s e shutdown limitado; logs de códigos fixos, sem payload/causa/credenciais.
Processador recebe pacote e instante do backend; confirmação QoS 1 somente
depois de sucesso; erro fecha transporte sem confirmação positiva.
Tamanho de payload permanece validado no processador 7.1; limite de pacote e
ACL no broker dependem do ensaio real, sem alegar proteção pré-alocação local.

TDD: configuração TLS/credenciais/clientId e default; lifecycle com mock de
MQTT, assinatura aceita/recusada, erro TLS, reconexão/backoff, callback antigo,
shutdown/timeout e ordem de confirmação do processador. Health HTTP/JWT do
harness existente continua sem serviços externos. Executar test:unit/lint/build
e validar contratos. Nenhuma ativação MQTT/credencial/broker real nesta entrega.
Permanecem abertas broker/ACL/revogação, status/events e persistência/retenção.

#### Entrega local 7.2

Cliente passivo TLS usando mqtt instalado, configuração opcional por padrão
e obrigatória quando habilitado; processador explícito antes de start.
QoS 1 concedido antes de ok, timeout de conexão/assinatura dez segundos,
backoff 1–30 s, callbacks antigos ignorados e shutdown limitado cinco segundos.
Confirmação pelo handleMessage ocorre após conclusão do processador;
falha fecha stream sem confirmação positiva. Logs só de códigos fixos.
MqttModule importado pelo HealthModule, singleton passivo exportado para ingestão.
Health informa disabled/unavailable/ok sem bloquear REST; contrato OpenAPI e
teste HTTP atualizados. Live preservado sem probe MQTT.

RED inicial: serviço vazio, constructor de health e configuração ausente.
Novos casos demonstraram RED para callback antigo/timer/recepção no shutdown
e assinatura sem resposta, corrigidos no código compartilhado antes do GREEN.
Final: 35 suítes/688 testes (41 novos), lint/build aprovados.
Sem conectar broker, ler .env, acessar banco, Docker, dependências ou migrations.
Próximo 7.3: persistência/rastreabilidade; decisões de registro de rejeições e
retenção precisam ser fechadas antes do código correspondente. Broker/ACL e
sessão persistente real continuam pendentes; manter consumer inativo até pipeline.

### Preparação 7.1 — 14/10/2026

Proposta concreta e exemplos em [MQTT v1](../Api/mqtt-contract-v1.md).
Lotes com timestamps individuais, limites sintéticos, sequência persistente,
ausência/null/zero, deduplicação, atraso e expectativas de rejeição documentados.
Sequência após reinício e regras de atraso/intervalo decididas na continuação
abaixo. Código implementado somente depois das respostas; F06 mantém pendências.

#### Decisões e escopo autorizado — continuação de 14/10

Programador aprovou sequência salva e pediu preservação dos dados fora do tempo.
Confirmou atraso quando receivedAt excede em mais de 15 segundos a última
captura; envio em lote de dez segundos permanece o perfil do simulador.
Confirmou preservar leitura fora do intervalo no histórico da instalação,
sinalizar vínculo inválido e não somar naquele teste. Dados futuros não serão
apagados apenas pelo horário: sinalizar relógio divergente, sem afirmar presente.
Todos esses tratamentos exigem identidade/recurso autorizados; preservação não
libera dados de dispositivo revogado nem vínculo de outro usuário.

Implementar somente contrato local e simulador sem broker: novos
src/modules/mqtt/mqtt-contract.ts/spec.ts e mqtt-simulator.ts/spec.ts.
Parser limitado em bytes e com allowlist, reutilizando validador UTC existente;
metadados temporais derivados, resolução pura do intervalo de teste autorizado;
gerador de dez leituras e sequência em arquivo local com exclusão concorrente.
CLI de geração imprime envelope JSON, sem publicar/armazenar telemetria no banco.
Nenhum registro em AppModule, rota/DTO REST, schema/migration ou dependência nova.
Testes antes da implementação: formatos/limites, ausência/null/zero, horários,
intervalo de teste, contador sintético, reinício/corrupção/concorrência do estado.
Executar test:unit, lint e build. Atualizar contrato/roadmap/contexto ao concluir.
Persistência SQL, associação real e deduplicação concorrente pertencem aos
próximos lotes; helpers locais não declaram pipeline de ingestão entregue.

#### Entrega local 7.1

Criados mqtt-contract.ts/spec.ts e mqtt-simulator.ts/spec.ts. Validação em
bytes/UTF-8/allowlist/data/medições; idade por amostra, CURRENT/DELAYED/CLOCK_SKEW;
resolução de teste autorizado por intervalo sem descartar leitura externa.
CLI dev/test gera dez leituras sintéticas de 2 W e reserva sequência via
lock/arquivo temporário sincronizado/rename. Sem registro em AppModule.
TDD RED por módulos ausentes, GREEN 34 suítes/647 testes (68 novos), lint/build.
CLI em dois processos conferida com sequências 1/2, sem broker ou banco.
Limites: lock residual após queda exige revisão manual; estado não deve ser
apagado; contador é sintético e não simula medição durante pausa. Perfil físico,
status/events, rejeições/retencão e broker ainda precisam dos respectivos lotes.
Próximo lote: 7.2 cliente MQTT com testes simulados; conexão externa dependerá
de ambiente explicitamente autorizado. Não encerrar F06 nem declarar F07 completa.

Futura implementação em `services/backend/src/modules/mqtt`, testes e exemplos
de contrato; reutilização de Prisma, domínio e cálculo da F06. Schema e
constraints só mudam por necessidade demonstrada de integridade. Configuração
documentada apenas em exemplos, sem segredos. Sem WebSocket nesta fase.

Registro original do planejamento: somente plano, índice e contexto. As
entregas locais posteriores estão descritas acima; F05 preservada, sem serviços
externos, migrations aplicadas, commits ou pushes.
