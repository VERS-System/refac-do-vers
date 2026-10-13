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

- Antes de 6.4/6.5: aprovar repartição proporcional ao tempo de delta do contador
  cruzando fronteira UTC. Essa distribuição é estimativa, embora o delta total
  seja medido; não deve ser apresentada como medição direta do subperíodo.
- Antes de persistir TEST: definir fim para teste em execução e inclusão do
  último delta; fronteira exclusiva não pode descartar energia silenciosamente.
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
