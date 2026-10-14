<!-- Propõe o contrato MQTT sintético antes da implementação do consumidor e simulador. -->
# MQTT v1 — contrato local do simulador

Estado em 14/10/2026: simulador autorizado pelo programador, ESP32 ainda sem
firmware. Validador, metadados temporais e geração local implementados/testados.
Sequência persistente e políticas temporais aprovadas pelo programador.
Perfil sintético não representa faixas/calibração do hardware. Nenhum broker
ou banco é acionado; autenticação, deduplicação SQL e persistência são próximos lotes.

Lote local 7.2 também entregue: transporte TLS passivo e status no readiness.
Sem ensaio em broker real; as evidências abaixo são testes com transporte simulado.

## Plano do lote 7.1

1. Conferir schema, contratos do firmware e fixtures da F06.
2. Preparar envelope em lote, exemplos e expectativas de rejeição.
3. Programador decide sequência, limites e política temporal/operacional.
4. Após aprovação, escrever testes antes do validador e gerador sintético,
   reutilizando cálculo F06 e biblioteca mqtt instalada nas etapas seguintes.
5. Executar test:unit, lint e build ao implementar; registrar resultados.

Nesta preparação: este documento, plano F07, índice do backend e contexto.
Depois da aprovação: escopo de código será informado antes de implementar.
Sem migration necessária se a sequência permanecer monotônica por dispositivo.
Sem conexão externa, novos serviços, dependências ou alteração de REST.

## Perfil sintético e decisões

| Item | Proposta para o ensaio sintético |
| --- | --- |
| Publicação | Uma medição por segundo, lote de até dez amostras a cada dez segundos |
| Transporte | Telemetria QoS 1, retained false; duplicatas esperadas |
| Limites | Até 64 KiB UTF-8, 100 amostras por mensagem, quatro níveis de contêineres JSON |
| Sequência | Número inteiro seguro não negativo, monotônico e preservado após reinício; aprovado |
| Relógio | Captura UTC sincronizada; relógio incerto não publica telemetria nesta versão |
| Atraso | Não rejeitar por idade; DELAYED quando chegada exceder a última captura em mais de 15 s; aprovado |
| Futuro | Preservar e sinalizar CLOCK_SKEW, sem tratar divergência como atraso nem corrigir timestamp |
| Lote defeituoso | Rejeitar lote inteiro se houver campo/tipo/data/valor estruturalmente inválido |
| Ausência | Campo de medição ausente ou null é permitido; zero continua medição válida |
| Teste | REST controla estados; leitura fora do intervalo fica sem testId e com sinalização; aprovado |
| Status/events | Reservados; consumidor desta primeira versão aceita somente telemetry |
| Rejeições | Registrar código/IDs seguros, sem guardar bytes arbitrários ou segredos |

Cadência e limites são valores de ensaio, ajustáveis após hardware. Não derivam
do limite REST de paginação. Não há descarte ou limpeza automática nesta proposta;
retenção em produção será decidida antes da implantação. Aprovação do simulador
não autoriza acesso ao HiveMQ/Neon nem encerra as pendências SQL da F06.

Quatro níveis significam: envelope (1), array samples (2), objeto amostra (3),
objeto measurements (4). Limitar bytes antes de JSON.parse; conferir profundidade
após parse limitado em bytes, sem alegar validação prévia da profundidade.

## Tópico e envelope

Tópico de ensaio: `vers/v1/devices/vers-sim-001/telemetry`.
`deviceUid` deve corresponder ao tópico e ao dispositivo provisionado e ativo.
Identidade no JSON não substitui credencial individual e ACL no broker.

Campos obrigatórios do envelope: schemaVersion, messageId, deviceUid, sequence,
capturedAt, testId, samples. Campos extras recusados em todos os objetos.
schemaVersion deve ser exatamente 1; messageId/testId são UUID v4;
testId pode ser null para medições da instalação fora de teste.
deviceUid: proposta de 1–64 caracteres ASCII de letras, números, hífen e sublinhado.
sequence: inteiro entre 0 e 9007199254740991; sem strings ou coerção.
Limite seguro do JSON Number é mais restritivo que BigInt do banco; não truncar.
Ao esgotar sequência, interromper publicação e decidir nova identidade provisionada.

capturedAt do envelope corresponde à primeira amostra. samples contém 1–100
objetos com capturedAt e measurements; timestamps UTC com milissegundos e Z,
datas reais, ordem estritamente crescente dentro do lote. Mensagens podem chegar
fora de ordem. sampleIndex será a posição original de base zero, atribuída pelo
backend; remetente não escolhe IDs internos, qualidade ou powerW calculada.

## Medições e interpretação

Todas são opcionais/null. measurements vazio representa ausência, nunca zero.
Valores presentes são números finitos, sem strings, NaN ou Infinity.

| Campo | Unidade | Restrição numérica proposta |
| --- | --- | --- |
| voltageV | V | Não negativo |
| currentA | A | Não negativo para o fluxo de recuperação deste ensaio |
| devicePowerW | W | Não negativo; preservado separado do cálculo |
| accumulatedEnergyWh | Wh | Não negativo; contador principal |
| accelerationXMs2 / accelerationYMs2 / accelerationZMs2 | m/s² | Assinado |
| vibrationRmsMs2 | m/s² | Não negativo |
| temperatureC | °C | Assinado |
| activePiezoCount | Contagem | Inteiro não negativo, máximo 2147483647 do Int do banco |

Não inventar faixas físicas máximas ou calibração antes do circuito.
Overflow em V × I torna o lote inválido. Ausência de V/I/contador dá PARTIAL;
sem os três, a amostra não gera energia calculável. Ausência dos sensores
opcionais não determina sozinha qualidade elétrica. SUSPECT e tolerância entre
potência reportada/calculada dependem de faixas/calibração aprovadas futuramente.
Reinício do contador é segmentado pela F06; não reiniciar sequência de transporte.
Campos inválidos não viram null para ocultar erro; null só expressa ausência.

## Exemplo válido e oracle independente

IDs sintéticos não provisionam dispositivo/teste. Cada amostra recebe associação
somente após autorização do dispositivo e do teste na futura ingestão.
Dentro do intervalo, inclusive a leitura terminal, pode ser vinculada ao teste;
fora dele, permanece na instalação com testId null e associação OUTSIDE_TEST.
Payload bruto preservará o testId originalmente informado. O helper puro recebe
teste previamente autorizado; não substitui os guards/verificações de domínio.
A leitura terminal fecha o delta, mas não conta num resumo [início,fim).

```json
{
  "schemaVersion": 1,
  "messageId": "00000000-0000-4000-8000-000000000701",
  "deviceUid": "vers-sim-001",
  "sequence": 1,
  "capturedAt": "2026-10-14T12:00:00.000Z",
  "testId": "00000000-0000-4000-8000-000000000501",
  "samples": [
    { "capturedAt": "2026-10-14T12:00:00.000Z", "measurements": { "voltageV": 4, "currentA": 0.5, "devicePowerW": 2, "accumulatedEnergyWh": 10 } },
    { "capturedAt": "2026-10-14T12:00:01.000Z", "measurements": { "voltageV": 4, "currentA": 0.5, "devicePowerW": 2, "accumulatedEnergyWh": 10.000555555555555 } },
    { "capturedAt": "2026-10-14T12:00:02.000Z", "measurements": { "voltageV": 4, "currentA": 0.5, "devicePowerW": 2, "accumulatedEnergyWh": 10.001111111111111 } }
  ]
}
```

Série inteira: potência média/pico 2 W; três amostras aproveitáveis; contador
e trapézio aproximadamente 0,001111111111111 Wh em dois segundos, tolerância
numérica 1e-12. Contador continua fonte principal mesmo quando as duas métricas
coincidem. O exemplo compacto contém três leituras; publicação usual até dez.

## Exemplo parcial com ausência e zero

```json
{
  "schemaVersion": 1,
  "messageId": "00000000-0000-4000-8000-000000000702",
  "deviceUid": "vers-sim-001",
  "sequence": 2,
  "capturedAt": "2026-10-14T12:00:03.000Z",
  "testId": "00000000-0000-4000-8000-000000000501",
  "samples": [
    { "capturedAt": "2026-10-14T12:00:03.000Z", "measurements": { "voltageV": 4, "currentA": null, "accumulatedEnergyWh": 10.001111111111111 } },
    { "capturedAt": "2026-10-14T12:00:04.000Z", "measurements": { "voltageV": 4, "currentA": 0, "accumulatedEnergyWh": 10.001111111111111 } }
  ]
}
```

Primeira leitura: powerW null, quality PARTIAL; devicePowerW ausente vira null.
Segunda: powerW 0; contador constante mede delta zero. A primeira não permite
trapézio de potência neste par; o contador permite delta zero medido.

## Retransmissão, conflitos e entradas rejeitadas

Retransmitir preserva messageId, sequence, capturedAt e conteúdo integral,
inclusive após reinício. Comparar conteúdo JSON validado, independente de
espaços e ordem das chaves, além de tópico/identidade. Não substituir payload
bruto armazenado nem considerar retransmissão uma nova amostra.
messageId repetido com conteúdo divergente ou sequence reutilizada em nova
mensagem são conflitos; banco decide unicidade também sob concorrência.
receivedAt é gerado pelo backend, nunca copiado do remetente.

### Identificação temporal aprovada

`classifyDelivery` recebe envelope validado e receivedAt do backend, retornando:

- lagSeconds: diferença em segundos entre recebimento e última captura;
- sampleLagSeconds: idade de cada amostra, na ordem original;
- delivery: CURRENT até 15 s inclusive, DELAYED acima de 15 s, CLOCK_SKEW
  quando alguma captura estiver no futuro em relação ao recebimento.

CURRENT significa fluxo dentro da tolerância do lote, não simultaneidade exata.
Dados atrasados continuam históricos e devem recomputar seus períodos na futura
ingestão; não substituir capturedAt por receivedAt. Atraso e qualidade elétrica
são dimensões distintas. CLOCK_SKEW preserva a leitura, mas não comprova que seu
horário é confiável: futura normalização deverá sinalizar a qualidade temporal
antes de alimentar análises. A classificação não cria campos no schema/REST.

Exemplo: última captura 12:00:09 e chegada 12:00:24 é CURRENT (15 s);
chegada 12:00:24.001 é DELAYED (15,001 s). A primeira captura 12:00:00 tem
idade 24 ou 24,001 s nesses casos, sem confundir a janela normal com atraso.

| Caso sintético a partir do exemplo válido | Expectativa proposta |
| --- | --- |
| Mesmo envelope recebido duas vezes | Uma mensagem e três amostras, mesma energia |
| Trocar messageId mantendo dispositivo/sequence | Conflito de sequência, sem sobrescrita |
| Mesmo messageId, alterar contador | Conflito de conteúdo, sem sobrescrita |
| schemaVersion = 2 | Versão recusada |
| Tópico com deviceUid diferente | Identidade recusada |
| Data 2026-02-30T12:00:00.000Z | Data recusada, sem normalização para março |
| Timestamp de amostra diferente da ordem do lote | Lote recusado |
| currentA = "0.5" ou -0.5 | Lote recusado neste perfil de recuperação |
| Acrescentar quality, powerW ou senha | Campo extra recusado sem ecoar conteúdo |
| samples vazio ou 101 itens | Limite recusado |
| sequence = 9007199254740992 | Inteiro inseguro recusado |
| Uma amostra inválida e duas válidas | Nenhuma amostra normalizada do lote |
| Chegada após encerramento, capturas dentro do teste | Aceitar após autorização e recomputar |
| Captura fora do intervalo de teste autorizado | Preservar na instalação, testId null, OUTSIDE_TEST |
| Teste incompatível com dispositivo/instalação ou sem autorização | Recusar associação; não liberar vínculo alheio |
| Captura futura em relação ao recebimento | Envelope preservado, CLOCK_SKEW e lag negativo |
| JSON truncado/bytes excessivos | Recusar antes da persistência do envelope |

Envelope estruturalmente válido mas rejeitado por autorização/domínio poderá
ser rastreado por IDs e motivo seguro. JSON malformado não cabe em MqttMessage:
não fabricar messageId/capturedAt para persistir. Política de registro/retencão
das rejeições será fechada na 7.3 antes de implementar persistência.

## Sequência persistente aprovada

Programador escolheu persistir sequência monotônica por dispositivo, mantendo
o schema atual. Cada dispositivo usa um arquivo de estado próprio e estável.
Geração reserva sequência antes de imprimir; falha após reserva pode deixar
lacuna, mas não reutiliza número. Corrupção/identidade divergente falham sem reset.
Lock exclusivo recusa concorrência; arquivo temporário sincronizado e rename
substituem estado sem escrita parcial. Após queda abrupta, lock residual exige
verificação manual de que nenhum processo o usa antes da remoção; sem takeover
automático que pudesse permitir duas reservas. Não apagar/recriar estado para
mesmo dispositivo provisionado. Sequência do firmware também deverá persistir.

## Executar a geração local

Após build, na raiz do repositório, em PowerShell:

```powershell
$env:NODE_ENV = 'development'
$simState = Join-Path $env:TEMP 'vers-mqtt-sim-001-sequence.json'
node services/backend/dist/services/backend/src/modules/mqtt/mqtt-simulator.js $simState vers-sim-001
```

Argumento opcional final: testId UUID v4 de ensaio. Sem ele, testId null.
O diretório do estado deve existir. Use arquivo local fora do versionamento
ao executar repetidamente; a CLI só escreve o estado e imprime um envelope JSON.
Para evitar arquivo de estado na raiz versionada, pode usar caminho em diretório
temporário próprio preservado entre execuções. Dez leituras cobrem nove segundos,
terminando no instante da execução; invocar a cada dez segundos representa a
cadência proposta. Não há loop, conexão, credenciais nem publicação automática.
Env diferente de development/test recusa geração antes de tocar o estado.
Contador sintético é contínuo pela sequência, não mede energia durante pausas
do processo. Para simular atraso, preservar/reutilizar o envelope já gerado em
vez de regenerar com novos IDs/horários. Buffer offline/reenvio são lotes futuros.

## Verificação do recorte local

TDD: RED por módulos ausentes; GREEN com 68 novos testes, incluindo parser,
limites, datas impossíveis, tipos, null/zero, oracles de energia, limites de
15 s, relógio futuro, intervalo terminal, reinício/corrupção/concorrência.
Regressão backend: 34 suítes/647 testes; lint/build aprovados.
CLI compilada executada em dois processos, sequência 1/2 e dez amostras
conferidas; arquivo sintético temporário removido. Nenhum broker/banco acessado.

## Limites de entrega

### Transporte local 7.2

MqttModule exporta MqttService, usado pelo health e pelo futuro processador de
ingestão. Não conecta no bootstrap. `MQTT_ENABLED=false` por padrão; quando
habilitado, MQTT_URL (somente mqtts), MQTT_USERNAME, MQTT_PASSWORD e
MQTT_CLIENT_ID são obrigatórios na configuração validada. Credenciais ficam
separadas da URL; TLS exige certificado válido. Consultar apenas .env.example.

O futuro processador chama `start(processor)` e recebe pacote MQTT e receivedAt
do backend. O transporte usa MQTT 3.1.1, clean false e clientId estável para
permitir sessão persistente; política de expiração/limite dessa sessão depende
do broker. Cada instância consumidora precisa de identidade própria; duas
instâncias com o mesmo clientId derrubam a conexão uma da outra.

Assinatura restrita a `vers/v1/devices/+/telemetry`, QoS 1. Grant negado,
rebaixado para QoS 0 ou sem resposta em dez segundos não sinaliza prontidão.
Reconexão usa uma retentativa exponencial de 1 s até 30 s, reiniciada após
assinatura aceita; callbacks antigos não reativam status. Shutdown cancela
timers e limita fechamento a cinco segundos, forçando o transporte se necessário.
Logs usam códigos fixos, sem copiar a causa da biblioteca ou os pacotes.

Override de handleMessage confirma mensagem QoS 1 somente após processor
concluir; erro envia callback de falha e fecha o stream sem confirmação positiva.
Isso prepara o ponto de confirmação após persistência, mas não garante entrega
ou idempotência por si só. Na ingestão, processor só deve concluir depois de
commit ou rejeição permanente tratada; redelivery exige deduplicação SQL.
Dados inválidos não podem bloquear eternamente o consumidor por retentativas.

Parser 7.1 limita payload recebido; biblioteca já recebeu/alocou o pacote antes
desse parse. Limites de entrada/tamanho no broker e credenciais/ACL/revogação
exigem ensaio autorizado; mocks não provam isolamento ou limite pré-alocação.
Nenhuma publicação é exposta pelo serviço consumidor; credencial do broker
também deve impedir publicação e limitar leitura aos tópicos necessários.

Decisão aprovada: REST permanece pronto se banco/Redis estiverem disponíveis,
mesmo com MQTT unavailable. GET /health/ready expõe dependencies.mqtt com
disabled/unavailable/ok, sem divulgar conexão/segredos. Live não consulta MQTT.
Configuração habilitada sem processador start permanece unavailable, sem rede.

TDD local: 26 testes de cliente, 11 novos de configuração, três de health e
um HTTP, total 41 novos. Regressão final 35 suítes/688 testes, lint/build aprovados.
Nenhum broker, credencial real, ACL, revogação ou banco testado neste lote.

Recorte local de telemetria 7.1 entregue para revisão, com validador/gerador.
Transporte local 7.2 entregue para revisão, sem ativação automática.
Persistência de mensagens e amostras, classificação temporal pública, vínculo
real, deduplicação concorrente, recomputação e reenvio ainda não implementados.
Status/events permanecem reservados, sem tratamento. Não declarar F07 completa,
F06 encerrada ou marco de integração cumprido sem broker e ensaios autorizados.
