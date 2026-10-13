<!-- Planeja a F06 em entregas pequenas, sujeitas à validação do programador. -->
# F06 — Dados, analytics e fixtures

Estado: proposta para validação. Este documento não autoriza implementação.
A F05 permanece como está. F07, F08 e F09 serão detalhadas posteriormente,
uma fase por vez, após validação do programador.

## Objetivo e dependências

Entregar as consultas de dados contratadas usando séries sintéticas, sem
depender de ESP32, broker MQTT ou WebSocket. A execução depende dos recursos
e regras de acesso da F05 necessários a cada entrega estarem concluídos.

Fontes: [F06](backend-roadmap/06-dados-analytics-fixtures.md),
[contratos REST](../Api/endpoints.md), OpenAPI e schema Prisma atuais.
O módulo `data` existente está vazio; seu uso será decidido pelo fluxo real,
sem criar um segundo backend ou uma infraestrutura analítica independente.

## Sequência proposta

Cada etapa termina com testes, documentação e revisão do programador antes
da seguinte. Validar este plano não significa executar todas de uma vez.

### 6.1 — Fechar regras de cálculo e limites

- Conferir contratos, schema, constraints e autorização entregues na F05.
- Registrar fórmula de integração, tratamento de lacunas, qualidade e limites
  de consulta; resolver as decisões abaixo antes de implementar cálculos.
- Manter paginação por `page/pageSize` já contratada; cursor, exportação e
  filtros novos exigem alteração explícita do contrato.
- Definir chave de recomputação dos resumos. O schema atual possui índices,
  mas não uma restrição única que garanta idempotência concorrente.

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
