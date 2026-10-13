<!-- Planeja a ingestão MQTT em etapas revisáveis antes da integração real. -->
# F07 — Contrato e ingestão MQTT

Estado: proposta para validação, sem autorização de implementação.
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

1. Origem do primeiro ensaio: ESP32 disponível ou simulador MQTT aprovado?
2. Proposta de transporte: QoS 1 para telemetria e eventos; retained desativado
   nesses dois tópicos. Status/Last Will dependem do contrato de conectividade.
3. Reinício: sequência persiste no dispositivo ou haverá identificador de
   inicialização no envelope? Segunda opção exige ajuste do schema/contrato.
4. Limites e atraso: definir com exemplos e cadência reais; não usar o limite
   REST de 100 registros como limite automático de lote MQTT.
5. Retenção e rejeições: definir quanto guardar e como registrar envelopes
   malformados sem payload irrestrito. Nenhuma limpeza automática sem decisão.
6. Eventos: confirmar quem inicia/finaliza teste e como mensagens offline
   serão associadas; o backend não muda regras operacionais por suposição.

## Arquivos previstos e limites

Futura implementação em `services/backend/src/modules/mqtt`, testes e exemplos
de contrato; reutilização de Prisma, domínio e cálculo da F06. Schema e
constraints só mudam por necessidade demonstrada de integridade. Configuração
documentada apenas em exemplos, sem segredos. Sem WebSocket nesta fase.

Nesta entrega: somente plano, índice e contexto. Sem alterações na F05,
código, serviços externos, migrations aplicadas, commits ou pushes.
