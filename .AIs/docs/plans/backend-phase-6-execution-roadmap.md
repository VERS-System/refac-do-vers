<!-- Planeja a F06 em entregas pequenas, sujeitas à validação do programador. -->
# F06 — Dados, analytics e fixtures

Estado em 13/10/2026: F06 iniciada pelo lote documental 6.1, após orientação
do programador para avançar e esclarecimento dos limites da F05. Cada lote
continua separado; não há autorização automática para todos os lotes ou banco
remoto. F07 depende de seu marco; F08/F09 permanecem futuras.

## Objetivo e dependências

Entregar as consultas de dados contratadas usando séries sintéticas, sem
depender de ESP32, broker MQTT ou WebSocket. A execução depende dos recursos
e regras de acesso da F05 necessários a cada entrega estarem concluídos.

Fontes: [F06](backend-roadmap/06-dados-analytics-fixtures.md),
[contratos REST](../Api/endpoints.md), OpenAPI e schema Prisma atuais.
No baseline o módulo `data` estava vazio; passou a conter fixtures na 6.2 e
consulta de telemetria na 6.3, sem outro backend ou infraestrutura analítica.

## Sequência proposta

Cada etapa termina com testes, documentação e revisão do programador antes
da seguinte. Validar este plano não significa executar todas de uma vez.

### 6.1 — Fechar regras de cálculo e limites

- Conferir contratos, schema, constraints e autorização entregues na F05.
- Registrar fórmula de integração, tratamento de lacunas, qualidade e limites
  de consulta; resolver as decisões abaixo antes de implementar cálculos.
- Manter paginação por `page/pageSize` já contratada; cursor, exportação e
  filtros novos exigem alteração explícita do contrato.
- Reutilizar os índices únicos parciais já presentes na migration inicial para
  a chave de recomputação; confirmar limites de referências históricas removidas.

Saída: regras documentadas e aprovadas, exemplos numéricos esperados e
eventual necessidade de migration identificada, sem aplicação no banco.

### 6.2 — Fixtures determinísticas

- Criar séries pequenas versionadas para testes: regular, irregular, lacunas,
  ausência, zero, duplicata, atraso, valores inválidos e reinício do contador.
- Usar somente identidades sintéticas e resultados esperados explícitos.
- Preparar carregamento restrito a desenvolvimento/teste, sem rota pública;
  impedir execução em produção e não apagar dados existentes.
- Manter testes unitários independentes de banco e serviços externos.

Saída: fixtures reutilizáveis pelas consultas e cálculos. Carregamento em
banco real será uma ação separada, autorizada para um ambiente de teste.

### 6.3 — Consulta de telemetria

- Implementar `GET /tests/{testId}/telemetry` com filtros de intervalo UTC,
  qualidade e paginação contratados; ordem `capturedAt`, depois `id`.
- Aplicar acesso na consulta, incluindo acesso do criador ao teste histórico;
  inexistente ou inacessível retorna `404`, sem enumeração entre contas.
- Projetar somente campos públicos, unidades explícitas e ausentes como `null`.
- Testar cookies inválidos, filtros inválidos, limites, empate de timestamps,
  dados de outra conta e histórico com referências removidas.

Saída: endpoint validado com fixtures, sem ingestão MQTT.

### 6.4 — Potência e energia

- Calcular `powerW = voltageV × currentA` somente com entradas válidas;
  preservar `devicePowerW` como medição reportada separada.
- Usar diferenças válidas de `accumulatedEnergyWh` como fonte principal de
  energia. Reinícios abrem outro segmento; o intervalo do reinício fica
  indeterminado, sem inventar energia. Duplicatas não somam novamente.
- Manter integração trapezoidal de potência pelo tempo real como estimativa
  separada para comparação, sem somá-la à energia do contador.
- Não inventar zeros, preencher lacunas silenciosamente, somar contador
  reiniciado como geração adicional ou calcular eficiência sem referência.
- Testar resultados numéricos conhecidos, intervalos irregulares, ausência,
  duplicatas e ordem de entrada. Registrar versão do cálculo.

Saída: cálculo pequeno e reutilizável pela futura F07, sem broker ou worker novo.

### 6.5 — Resumos e recomputação

- Produzir períodos `TEST`, `HOUR`, `DAY` e `MONTH` em UTC, com intervalos
  semiabertos, médias, pico, contagem e qualidade conforme decisões aprovadas.
- Recomputar sem duplicar resumos ou energia; tratar concorrência no banco,
  usando a chave definida na 6.1. Não presumir garantia a partir de mocks.
- Não gerar resumo artificial sem dados. Manter consumo do veículo como
  `null` sem fonte confiável. Economia é uma simulação com tarifa variável,
  sem valor fixo embutido: `energiaWh / 1000 × tarifaPorKwh`. Sem tarifa,
  resultado monetário fica `null`; registrar tarifa e moeda utilizadas.
- Testar fronteiras de período, amostra na fronteira, recomputação e versão;
  validar concorrência em PostgreSQL isolado quando autorizado.

Saída: resumos persistíveis e determinísticos; migration, se necessária,
revisada separadamente antes de qualquer aplicação.

### 6.6 — Consultas de resumos

- Implementar `GET /installations/{installationId}/energy-summaries` e
  `GET /tests/{testId}/energy-summaries` conforme OpenAPI.
- Validar período, intervalo e paginação; ordenar por `periodStart` e `id`.
- Reutilizar regras de acesso; preservar leitura histórica do criador.
- Serializar decimais como strings e datas UTC, sem expor dados internos.
- Testar ausência de resumos, autorização, filtros e projeção pública.

Saída: séries de resumos consumíveis pelo mobile e dashboard.

### 6.7 — Comparações e qualidade

- Implementar `GET /test-comparisons`, de 2 a 5 IDs distintos, preservando
  ordem; qualquer teste inacessível faz a operação inteira retornar `404`.
- Retornar resumo `TEST` ou `null`; resumo inválido não vira energia válida.
- Preservar contexto identificável e distinguir medição de inferência.
- Validar como expor cobertura, lacunas e rejeições: os contratos atuais não
  definem uma rota independente de qualidade nem todos esses campos.
- Testar ordem, duplicatas, limites, ausência, qualidade e isolamento de contas.

Saída: comparação contratada. Novos campos ou rota de qualidade só entram
depois de contrato e critérios aprovados.

### 6.8 — Fechamento da F06

- Executar testes unitários, lint e build; conferir OpenAPI e exemplos.
- Ensaiar fluxos com fixtures e volume sintético acordado em ambiente isolado;
  registrar separadamente evidência simulada e evidência com PostgreSQL real.
- Atualizar documentação e contexto, indicando pendências e limites conhecidos.
- Submeter a entrega final à revisão. Não iniciar F07 automaticamente: seu
  marco exige hardware ou simulador aprovado e contrato MQTT confirmado.

## Decisões para validação

1. Integração — decisão técnica delegada pelo programador: usar regra
   trapezoidal, `Wh = (P1 + P2) / 2 × segundos / 3600`, com timestamps
   distintos em ordem crescente. Não atravessar amostras inválidas/ausentes;
   recortar segmentos nas fronteiras UTC por interpolação linear. A detecção
   de lacunas temporais depende da cadência confirmada do dispositivo;
   não inventar um limite em segundos antes disso. Resultado é estimativa.
2. Qualidade — aprovado pelo programador: `GOOD` para dados válidos sem
   falhas detectadas; `PARTIAL` quando há dados aproveitáveis, mas também
   lacunas ou reinícios; `INVALID` quando não há dados suficientes para
   calcular. Não definir percentual mínimo arbitrário. Ausência de falha
   detectada não comprova cobertura completa sem conhecer a cadência.
3. Contador — definido pelo programador: `accumulatedEnergyWh` será fonte
   de energia, pelas diferenças entre leituras válidas do mesmo dispositivo
   e segmento. Não misturar contadores de dispositivos ou reinícios. A unidade
   e a semântica real do contador serão verificadas no marco MQTT da F07.
4. Volume — aprovado pelo programador: máximo de 100 registros por página,
   conforme contrato atual; não é limite total de amostras de um teste.
   Sem novo corte de datas nesta etapa. Ensaio técnico proposto com 10 mil
   amostras sintéticas, sem mudança na retenção ou duração dos testes.
5. Tarifa — definido pelo programador: valor imaginativo e variável para
   simulação, sem tarifa fixa ou alegação de economia financeira real.
   A forma de informar tarifa/moeda será contratada antes da implementação.
   Exposição de qualidade permanece uma questão separada: proposta inicial
   é manter campos atuais, sem criar outra rota nesta fase.

## Arquivos previstos e limites

Implementação futura: módulo `services/backend/src/modules/data`, testes e
fixtures próximos ao módulo; registro em `app.module.ts` se necessário.
Reutilizar autenticação, Prisma, validação e envelopes existentes. Contratos
em `.AIs/docs/Api` só mudam quando uma decisão aprovada exigir.
Schema/constraints só serão alterados com justificativa de integridade.

Este planejamento altera somente documentação. Nenhuma dependência nova,
migration aplicada, acesso a `.env`, conexão externa, commit ou push.

## Lote 6.1 — regras e inventário, 13/10/2026

Escopo documental autorizado: este plano, roadmaps F05/F06, dicionário e contexto.
Conferidos shared-types, contratos, schema, migration e SQL complementar. Sem
código, fixtures carregadas, dependências ou migration. Programador aprovou
potência média ponderada pelo tempo, contagem de amostras aproveitáveis e PARTIAL
quando houver ausência/reinício, sem inventar cadência/limiar temporal.

### Cálculos e limites

- P = V × I com entradas finitas/aproveitáveis; ausência é null, zero é medição.
  devicePowerW continua separado. Faixas físicas dependem do hardware da F07.
- Energia principal: soma dos deltas não negativos de accumulatedEnergyWh entre
  amostras consecutivas aproveitáveis do mesmo dispositivo/segmento. Queda do
  contador abre segmento; não somar o novo valor absoluto ou atravessar reinício.
  Ausência/invalidade interrompe segmento, sem preencher com estimativa de potência.
- Ordenar por deviceId e capturedAt/id; deduplicar identidade da amostra.
  Timestamp igual não cria intervalo positivo. Valores conflitantes no mesmo
  instante interrompem/sinalizam segmento, sem escolher medição arbitrariamente.
- Estimativa separada: soma de (P1+P2)/2 × segundos/3600, com extremos aproveitáveis
  e duração positiva. Média = soma dos trapézios em W·s / duração aproveitável em s;
  sem duração calculável fica null. Pico vem das potências aproveitáveis.
- Aproveitável exige campos necessários finitos e qualidade VALID ou PARTIAL.
  SUSPECT/INVALID interrompem segmento. sampleCount conta amostras distintas
  aproveitáveis em [início,fim), não mensagens, duplicatas ou pontos interpolados.
  Não é percentual de cobertura. GOOD não comprova cobertura sem cadência conhecida.
- Sem delta calculável, resultado interno não tem energia; não persistir resumo
  artificial recoveredEnergyWh=0. Zero exige delta medido zero. Sem dados não
  criar resumo; registros INVALID não são energia válida na comparação.
- HOUR/DAY/MONTH usam fronteiras UTC semiabertas. Estimativa por potência é
  recortada por interpolação linear; ler vizinhos permite cortar segmentos,
  mas não aumenta sampleCount. A distribuição do delta do contador entre períodos
  permanece para decisão antes da 6.4/6.5, conforme pendências abaixo.
- Não unir dispositivos diferentes nem tratar todos os deviceId=null como uma
  origem. Preservar resumo histórico existente quando falta proveniência para
  recalcular; não alterar schema por antecipação.
- Consumo permanece null. Sem entrada aprovada de tarifa/moeda, moneySaved,
  currencyCode e energyTariffPerKwh ficam null. Simulação futura usa Decimal,
  Wh/1000 × tarifaPorKwh, com strings no JSON e nenhuma tarifa fixa.
- Consultas preservam page/pageSize (1/20, máximo 100), filtros e intervalos do
  OpenAPI. Testes permitem criador histórico ou vínculo atual; instalação exige
  vínculo próprio inclusive ADMIN. Falta de acesso e ausência usam o mesmo 404.

### Exemplos para fixtures

| Caso | Entrada | Resultado esperado |
| --- | --- | --- |
| Potência | 4 V × 0,5 A | 2 W |
| Contador | mesmo device: 10, 10,1, 10,3 Wh | 0,3 Wh |
| Reinício | 10, 10,1, 0, 0,05 Wh | 0,15 Wh; trecho do reinício indeterminado; PARTIAL |
| Ausência | 10, null, 10,3 Wh | indeterminado; sem inventar zero ou 0,3 Wh |
| Zero | 10, 10 Wh em instantes distintos | 0 Wh calculável |
| Trapézio | 2→4 W em 60 s | 0,05 Wh estimado; média 3 W |
| Irregular | 2→4 W em 60 s e 4→4 W em 120 s | 0,183333… Wh estimado; média 3,666666… W |
| Duplicata | repetir mesma amostra | energia e sampleCount não aumentam |
| Fronteira | 2→4 W de 00:59:30 a 01:00:30 UTC | 0,020833… e 0,029166… Wh estimados nas duas horas |

### Recomposição idempotente

Correção do inventário antigo: @@index comuns não representam toda a migration.
Ela já contém índices únicos parciais:

1. Teste: (test_id, period_type, period_start, calculation_version), WHERE test_id
   IS NOT NULL, inclusive após installation_id ficar null.
2. Instalação: (installation_id, period_type, period_start, calculation_version),
   WHERE installation_id IS NOT NULL AND test_id IS NULL.

Usar calculationVersion=1 para primeira fórmula, outra versão ao mudar fórmula.
Recomputação atualiza a mesma chave, valores, periodEnd e calculatedAt.
Consultas usarão versão ativa explicitamente, sem misturar versões como períodos
duplicados. Prisma não oferece upsert por essas chaves só pelos @@index comuns:
na 6.5 escolher conflito SQL com predicado ou escrita serializada por recurso.
Índice único impede duplicatas, mas não cálculo obsoleto: bloquear recurso e
ler/calcular/persistir na mesma transação, mantendo ordem de locks da F05.
Ensaiar concorrência e amostras atrasadas em PostgreSQL isolado na 6.5.
Ambos IDs null ficam fora dos índices: não criar/recomputar sem origem identificada.
Preservar históricos em leitura. Nenhuma migration necessária demonstrada na 6.1.

### Pendências delimitadas

- Resolvido no lote 6.5: repartição proporcional ao tempo do delta cruzando
  fronteira UTC, indicando PARTIAL por estimativa do subperíodo.
- Resolvido no lote 6.5: TEST somente após encerramento; endedAt fecha o
  intervalo e leitura terminal fecha o último delta sem entrar na contagem.
- Antes da simulação monetária: contratar a entrada de tarifa/moeda; até lá null.
- Recálculo histórico sem deviceId exige proveniência segura se for necessário.
- F07 fecha contador real/reboot, cadência, faixas, unidades e atraso.

Saída: regras aprovadas e exemplos registrados; chaves existentes confirmadas;
decisões específicas acima permanecem abertas para os respectivos lotes.
Próximo 6.2: fixtures pequenas determinísticas, sem carga remota ou novas rotas.

## Lote 6.2 — plano autorizado

Criar modules/data/fixtures/telemetry.fixtures.ts e telemetry.fixtures.spec.ts;
atualizar plano/roadmap/contexto. Reutilizar fixture pública sintética como base,
com datas/referências no formato Prisma para doubles de consulta e cálculos.
Factory restrita a NODE_ENV=development/test, sem conexão, escrita de banco ou
registro no AppModule. Cada chamada devolve dados novos, sem alterar fixtures
compartilhadas. Séries: regular, irregular, lacuna, ausência, zero, duplicata,
fora de ordem, atraso, valores inválidos e reinício. Resultados esperados
explícitos, sem implementar o calculador futuro para gerar seu próprio oracle.
TDD antes do código; verificar restrição de ambiente, identidade sintética,
isolamento, semântica dos casos e números simples independentes. test:unit,
lint/build e diff --check. Sem carregador de banco antecipado ou rota pública.
Fronteiras do contador/tarifa/TEST seguem pendências dos lotes de cálculo.

### Lote 6.2 entregue

Factory de dez cenários e oracles explícitos em modules/data/fixtures, reutilizando
fixture sintética compartilhada e campos/datas Prisma. Sem registro do módulo
ou carregador de banco. Geração somente NODE_ENV=development/test; dados novos
entre cenários/chamadas, sem alterar fixtures públicas. IDs se repetem entre
cenários isolados; não concatenar essas séries como seed único. NaN/Infinity são
entradas de teste em memória, não JSON válido ou dados para persistência.

Casos regular/irregular, lacuna/ausência, zero, duplicata, fora de ordem, atraso,
inválido e reinício; resultados da série inteira, sem presumir fronteira final
de TEST ou repartição do contador entre períodos. Reinício segmenta contador;
potência válida continua produzindo estimativa independente, sem somá-la à energia.
Testes verificam restrição de ambiente, IDs/datas, isolamento, semântica e números
simples. Baseline 378; RED por factory ausente; GREEN 28 suítes/391 testes (13
novos), lint/build e diff --check aprovados via npm.cmd. Sem dependências/schema,
env, migration, Docker, banco externo, front, commit/push.
Próximo lote 6.3: GET /tests/:testId/telemetry, usando as fixtures e acesso F05.

## Lote 6.3 — plano autorizado

Implementar GET /tests/:testId/telemetry em modules/data (DTO/controller/service/
module/teste HTTP), registrar AppModule. Reutilizar paginação, datas UTC e
guards; parametrizar nome inicial do validador de intervalo mantendo default
startedFrom e seus callers. Centralizar filtro de acesso de teste em
auth/resource-access.service.ts, reutilizando-o no TestsService e DataService.
Pai autorizado, amostras e contagem na mesma transação RepeatableRead; ausência
ou acesso alheio TEST_NOT_FOUND, inclusive ADMIN. Crianças também filtram acesso.
Projeção explícita pública, null/zero preservados, datas UTC, ordem capturedAt/id.
page/pageSize 1/20 máximo 100; intervalo [capturedFrom,capturedTo), quality enum.
TDD HTTP antes do código com fixtures 6.2, falhas/validação/acesso/histórico.
Regressão test:unit, lint/build, OpenAPI e diff --check; atualizar contratos,
roadmaps e contexto. Sem cálculos, MQTT, banco real, schema ou dependências.

### Lote 6.3 entregue

GET /tests/:testId/telemetry registrado via DataModule, com filtros/paginação
contratados e projeção explícita sem origem interna. Pai, leituras e contagem
em RepeatableRead; acesso pelo criador histórico ou vínculo atual, inclusive
ADMIN. Filtro compartilhado em auth/resource-access.service.ts substitui a
duplicação no TestsService sem mudar suas regras. Validador UTC aceita nome
inicial parametrizado, mantendo startedFrom por padrão e constraints ausentes.

Baseline anterior 391; 32 casos RED por rota ausente; GREEN final 29 suítes/
423 testes, lint/build e diff --check aprovados via npm.cmd. Regressão identificou
constraints ausentes nos callers antigos, corrigida antes do GREEN. OpenAPI
parseado e referências/rota compilada conferidas. Dependências sintéticas,
JWT/HTTP reais; nenhum ensaio SQL, cálculo, ingestão, migration, .env, Docker,
front, commit/push. Próximo lote 6.4: cálculo de potência/energia, sujeito às
decisões de fronteiras já registradas; não implementar resumos/tarifa por antecipação.

## Lote 6.4 — plano autorizado

Programador autorizou começar. Criar telemetry-calculation.ts e seu teste em
modules/data; atualizar este plano, roadmap F06/índice e contexto diário.
Função pura sobre uma série inteira fornecida pelo caller, sem consulta ou
persistência: potência recalculada de V/I, contador como energia principal,
trapézios como estimativa separada, média ponderada e pico. Versão inicial 1.
Entrada Prisma projetada apenas nos campos usados; sem alterar dados de entrada.
Ordenação por origem/tempo/ID; deduplicação por ID e por mensagem/sampleIndex.
Identidades ou instantes conflitantes interrompem segmentos sem escolher valores
arbitrários. Não misturar testes/dispositivos nem unir origens deviceId=null.
Campos finitos e não negativos são aproveitáveis apenas em VALID/PARTIAL;
ausência interrompe somente o cálculo dependente do campo. Reinício interrompe
contador, sem interromper potência válida. Zero medido permanece zero.
sampleCount conta amostras distintas com potência ou contador aproveitável;
qualidade do resultado principal é INVALID sem delta de contador calculável,
PARTIAL com falhas detectadas, GOOD nos demais casos. Estimativa pode existir
independentemente da qualidade da energia principal. Datas inválidas são
rejeitadas, overflow lança erro em vez de retornar números não finitos.
TDD com dez fixtures e casos de isolamento, conflitos, identidade, qualidade,
ausência independente, datas e extremos numéricos. test:unit, lint/build e
diff --check. Nenhuma integração com rota de leitura ou AppModule necessária:
caller de produção virá na recomputação/F07. Sem novas dependências ou schema.
Repartição do contador em períodos, fronteira final TEST, tarifa/moeda e
persistência permanecem para os respectivos lotes; API sem período neste lote.

### Lote 6.4 entregue

Calculador puro versão 1 em telemetry-calculation.ts: V × I independente de
powerW/devicePowerW persistidos, deltas do contador, trapézios separados, média
ponderada, pico, contagem e qualidade da energia principal. Ordena sem alterar
entrada, separa dispositivo/teste, deduplica identidades e interrompe conflitos.
Ausência interrompe somente o campo dependente; reinício não adiciona valor
absoluto e não corta a estimativa por potência válida. Origens nulas não são
unidas. Datas inválidas e overflow falham explicitamente. Não presume cadência.
Sem contador calculável, energia principal null/INVALID mesmo com estimativa;
caller futuro não deve persistir um zero artificial ou promover essa estimativa.

TDD: baseline 29 suítes/423 testes; RED por módulo ausente; GREEN 30 suítes/
453 testes (30 novos), lint/build aprovados via npm.cmd. Dez oracles de fixtures
e casos de identidade, origens, conflito, ausência, qualidade e limites numéricos.
Sem caller de produção antecipado: F06 6.5 e F07 reutilizarão as funções.
Nenhuma rota, dependência, schema, migration, banco, Docker, .env ou front alterado.
Próximo 6.5: resumos/recomputação, após decisões de fronteiras e fim de TEST.

## Lote 6.5 — plano autorizado

Programador pediu próximo lote e definiu: repartir deltas de contador
proporcionalmente ao tempo, indicando PARTIAL onde houver recorte; TEST somente
após encerramento, com endedAt como fim. Leitura exatamente no fim fecha o
último delta, mas não entra em sampleCount de [início,fim). Não extrapolar.
Estas decisões resolvem as pendências de fronteiras/TEST acima; tarifa/moeda
permanecem sem contrato e serão null, assim como consumo do veículo.

Alterar telemetry-calculation.ts/spec para receber intervalo opcional e recortar
segmentos: contador proporcional, potência por interpolação linear dos extremos;
contagem/pico só de leituras reais dentro do intervalo. Preservar comportamento
6.4 para série inteira. Validar instantes finitos e início anterior ao fim.
Criar energy-summary.service.ts/spec, registrar e exportar no DataModule.
Serviço interno, sem endpoint novo: recomputeTest produz TEST encerrado;
recomputePeriod produz HOUR/DAY/MONTH de instalação, um período UTC alinhado por
chamada. Os clientes consultarão TEST do teste e calendário da instalação.
Preservar separação por device/test para não atravessar testes diferentes.

Dentro de uma transação ReadCommitted, bloquear veículo, instalação e teste
nessa ordem antes de ler/calcular/persistir; recomputações do mesmo recurso se
serializam. F07 deverá usar os mesmos locks para escrita de amostras. Ler apenas
campos de cálculo, intervalo e vizinhos imediatos por origem, incluindo empates;
groupBy busca timestamps vizinhos sem trazer o histórico inteiro para a aplicação.
Reusar índices únicos parciais existentes, findFirst/update por ID ou create sob
lock. Chave usa recurso/período/início/versão, instalação sem testId para calendário.
Atualizar valores e calculatedAt sem duplicar resumos; não persistir estimativa
de energia em recoveredEnergyWh. Campo estimado continua interno ao calculador.
Sem delta calculável, remover somente resumo derivado da mesma chave/versão,
evitando resultado obsoleto ou zero artificial. Se houver deviceId=null, manter
resumo histórico existente sem sobrescrever por energia de origem incompleta.
Não recalcular nem criar TEST PLANNED/RUNNING ou encerrado sem intervalo positivo.

TDD de fronteiras, interpolação, conservação, UTC/leap year, ausência/reinício,
locks antes de leitura, chave/versão, repetição, erro e preservação histórica.
Preparar teste PostgreSQL de concorrência/recomputação/rollback para instância
sintética local existente; execução real permanece sujeita a autorização de
ambiente isolado. test:unit, lint/build e diff --check obrigatórios neste lote.
Atualizar endpoints/OpenAPI apenas para semântica, plano, roadmap/índice e
contexto. Sem schema/migration, tarifa, novo endpoint, job, worker ou banco remoto.

### Lote 6.5 implementado — validação unitária concluída

Calculador 6.4 estendido com recorte opcional, contador proporcional e potência
interpolada; série inteira mantém seus 30 casos anteriores. EnergySummaryService
registrado/exportado no DataModule, sem chamada automática ou rota pública.
TEST encerrado e calendário UTC da instalação usam uma transação ReadCommitted,
locks de origem e chave/versão existentes, atualizando a mesma identidade.
Timestamp vizinho consultado por groupBy de origem inclui empates no findMany.
Medições sem dispositivo dentro do intervalo preservam histórico; origem removida
distante não impede recomputar período novo. Sem delta, remove apenas derivação
obsoleta da chave/versão ativa. Consumo/tarifa/moeda/economia permanecem null.

RED de serviço ausente e assinatura sem intervalo confirmado antes do código.
Um caso adicional de origem histórica distante revelou bloqueio indevido;
RED confirmado e corrigido no escopo temporal. GREEN: 31 suítes/484 testes,
lint/build e tsc --noEmit incluindo test/db aprovados. 31 testes unitários novos
em relação à entrega 6.4. Suíte energy-summary.db-spec.ts preparada com três
ensaios reais: concorrência, chegada tardia e rollback após escrita. Não executada;
garantias PostgreSQL permanecem pendentes de ambiente isolado autorizado.
Contrato atualizado apenas em descrição, sem campos/rotas novos ou migration.
Próximo 6.6: consultas de resumos usando versão ativa; futura F07 chamará
recomputação sob o mesmo protocolo de locks. Sem banco real, .env ou Docker.

## Lote 6.6 — plano autorizado

Programador pediu próximo lote. Alterar DataController/DataService/data.spec.ts,
criar summary-query.dto.ts e atualizar contratos, roadmap/índice e contexto.
GET tests/:testId/energy-summaries e installations/:installationId/energy-summaries
reutilizam sessão, guards, parâmetros UUID existentes, paginação e validadores UTC.
Controller passa a ter caminhos completos, preservando tests/:testId/telemetry.
DTO aceita somente page/pageSize, periodType TEST/HOUR/DAY/MONTH e limites UTC
periodFrom/periodTo, isolados ou juntos, início inclusivo/fim exclusivo sobre
periodStart. Defaults 1/20, máximo 100, ordem periodStart/id crescente.
Pai autorizado, projeção e contagem em RepeatableRead; teste pelo criador ou
vínculo atual, instalação por vínculo próprio inclusive ADMIN. Crianças incluem
o mesmo filtro de relação; ausência/alheio retorna código 404 do recurso antes
de consultar resumos. Teste histórico com instalação null permanece acessível.
Selecionar somente versão ativa, sem misturar versões. Instalação consulta
resumos ligados a ela conforme contrato, inclusive TEST se armazenado; filtro
periodType escolhe o tipo. Sem filtro de qualidade novo ou exclusão silenciosa
de INVALID: a qualidade pública mantém seu valor, comparação F06 6.7 fará seu
tratamento. Projeção explícita sem calculationVersion/createdAt internos,
datas UTC, dinheiro/tarifa Decimal.toString, null/zero preservados.
TDD HTTP/JWT com Prisma simulado antes das rotas: filtros, defaults, limites,
acesso, histórico, paginação, versão, projeção, decimais e falhas genéricas.
test:unit, lint/build, OpenAPI/rotas e diff --check; sem recomputar em GET,
schema, dependência, migration, .env, banco, MQTT, Docker, front ou commit/push.

### Lote 6.6 entregue

As duas consultas registradas no DataController com caminhos completos;
telemetria mantém o mesmo URL/guards. SummaryQueryDto reutiliza paginação e
validação UTC. DataService verifica pai, lista e conta resumos em RepeatableRead,
filtrando acesso na própria relação e somente versão ativa. Ordem periodStart/id,
periodType opcional, filtros semiabertos de periodStart, page/pageSize 1/20/100.
Projeção explícita, datas UTC, Decimal como strings e null/zero/qualidade
preservados. Teste histórico sem instalação acessível pelo criador. Instalação
inclui resumos associados conforme contrato, sem excluir TEST silenciosamente.
Nenhum GET recalcula ou expõe campos internos, nenhuma regra nova de qualidade.

TDD: 67 casos HTTP RED por rotas ausentes, 32 casos de telemetria preservados.
GREEN final: 31 suítes/551 testes, lint/build aprovados via npm.cmd. Testes com
JWT/HTTP reais e Prisma simulado cobrem filtros, paginação, acesso USER/ADMIN,
histórico, projeção/decimais, versão e falhas genéricas. Sem ensaio PostgreSQL.
Próximo 6.7: comparação de 2–5 testes autorizados preservando ordem e qualidade.
Suíte db 6.5 continua preparada, sem execução/garantia real de concorrência.

## Lote 6.7 — plano autorizado

Programador pediu próximo lote. Alterar DataController/DataService/data.spec.ts,
criar comparison-query.dto.ts e atualizar contratos, roadmap/índice e contexto.
GET /test-comparisons exige sessão/guards existentes. Query somente testIds
repetidos, array de 2–5 UUID v4 distintos; não aceitar CSV, JSON, identidade,
versão ou filtros extras. Unicidade considera caixa de UUID sem coercão de
tipos; saída preserva ordem e representação dos IDs enviados.
Consultar testes autorizados pelo filtro comum, inclusive histórico do criador
e ADMIN exigindo acesso, em RepeatableRead. Projeção relacional traz no máximo
um resumo TEST da versão ativa por teste: periodStart decrescente, depois
calculatedAt decrescente e id crescente. Escolher mais recente antes de avaliar
qualidade; INVALID vira null sem recorrer a um resumo antigo válido. Ausência
também vira null. GOOD/PARTIAL mantêm campos/qualidade, sem ranking, eficiência,
percentual de cobertura ou inferência nova. Contexto continua identificável por
testId e consultável pelo GET /tests existente; não ampliar contrato com snapshot.
Qualquer teste ausente/alheio faz toda operação retornar TEST_NOT_FOUND, sem
resultado parcial. Filtro no pai restringe a relação de resumos; um snapshot
preserva autorização e dados. Reusar publicSummary para datas/decimais/null,
sem consulta de cada teste em loop, recomputação, paginação ou rota de qualidade.
TDD HTTP/JWT antes da rota: ordem, 2/5 IDs, duplicatas equivalentes, limites,
formato estrito, acesso USER/ADMIN, histórico, ausência/INVALID/PARTIAL, projeção,
versão, falhas genéricas e regressão das consultas existentes. test:unit,
lint/build, OpenAPI/rotas e diff --check. Sem schema, dependências, .env,
DB/MQTT/Docker, front, migration, commit ou push. Ensaios PostgreSQL seguem
pendentes, sem iniciar F07; próximo 6.8 será fechamento da F06.

### Lote 6.7 entregue

GET /test-comparisons registrado com guards existentes. DTO exige 2–5 UUIDs
v4 distintos sem diferenciar caixa, parâmetros repetidos e allowlist estrita.
DataService faz uma chamada relacional Prisma aos testes autorizados, trazendo
no máximo um resumo TEST ativo por pai em RepeatableRead. Ordem determinística
por periodStart/calculatedAt/id; resumo ausente/INVALID vira null sem fallback
antigo. GOOD/PARTIAL preservados com projeção pública reutilizada. UUID canônico
localiza resumo, mas a saída mantém ordem e representação dos IDs enviados.
Ausente/alheio aborta toda comparação com TEST_NOT_FOUND, sem resultado parcial.
Contexto pelo testId/GET existente; sem indicadores ou contrato novos.

TDD: 27 testes HTTP RED por rota ausente, 99 anteriores do módulo preservados.
GREEN isolado 126; final 31 suítes/578 testes, lint/build aprovados via npm.cmd.
Cobertura de ordem, 2/5 IDs, duplicatas equivalentes, formatos, USER/ADMIN,
histórico, versões, qualidade, projeção e erros. HTTP/JWT reais com Prisma
simulado; ensaios PostgreSQL continuam pendentes. Próximo 6.8: fechamento e
revisão da F06, sem início automático da F07 e sem alegar garantias SQL reais.
