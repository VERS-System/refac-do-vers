<!-- Fase 06 do roadmap executável do backend VERS. -->

# Fase 06 — Dados, analytics e fixtures

## Objetivo

Em andamento em 13/10/2026 pelo lote documental 6.1 do
[plano executável](../backend-phase-6-execution-roadmap.md). Regras de contador,
estimativa/média ponderada, qualidade e exemplos registrados; índices únicos
parciais da migration confirmados. Lote 6.2 entregue: dez cenários sintéticos
em memória, factory restrita a dev/test, com oracles explícitos e testes.
Lote 6.3 entregue em 13/10/2026, com acesso histórico, filtros e paginação.
Lote 6.4 entregue: calculador puro versão 1 de potência/energia, contador
separado da estimativa trapezoidal, média ponderada, deduplicação e segmentos.
Lote 6.5 implementado: recomputação interna de TEST encerrado e períodos UTC
HOUR/DAY/MONTH da instalação. Repartição proporcional aprovada com PARTIAL;
leitura terminal fecha delta sem entrar na contagem. Locks e chave/versão
existentes, histórico sem origem preservado. Lote 6.6 entregue: consultas
paginadas de resumos por teste/instalação, acesso histórico, versão ativa,
filtros UTC e decimais como strings. Lote 6.7 entregue: comparação de 2–5
testes autorizados, ordem preservada e resumo TEST ativo ausente/INVALID como
null. Lote 6.8 entregue para revisão: 10 mil amostras em memória, conservação
em recortes UTC e regressão final. Backend 32 suítes/579 testes, lint/build e
tipos aprovados; shared-types test:unit/lint/build aprovados. OpenAPI e 32
operações compiladas conferidas. [Matriz de fechamento](../backend-phase-6-closure-13-10-2026.md).
Recorte local pronto para revisão; suíte PostgreSQL preparada, ainda não
executada. Nenhum dado carregado no banco; concorrência/rollback reais e entrada
de tarifa continuam pendentes. F07 exige marco próprio, sem avanço automático.

Entregar consultas e cálculos completos usando dados sintéticos antes de
depender do ESP32 ou do broker.

## Etapa A — Fixtures controladas

- criar gerador disponível somente em desenvolvimento/teste;
- representar séries regulares, lacunas, atrasos e valores inválidos;
- proibir rota pública de ingestão manual em produção;
- usar somente identidades e placas sintéticas.

## Etapa B — Consultas de telemetria

- paginação page/pageSize, padrão 1/20 e máximo 100;
- telemetria por teste, intervalo UTC e qualidade;
- resumos HOUR/DAY/MONTH da instalação e TEST encerrado;
- acesso na própria consulta e 404 sem enumeração de contas.

## Etapa C — Cálculos

- potência calculada por `V × I` quando ambos existem;
- energia principal pelo contador, estimativa trapezoidal separada;
- média ponderada pelo tempo, pico e qualidade;
- não substituir ausente por zero;
- não calcular eficiência sem referência mecânica.

## Etapa D — Resumos e séries

- períodos de teste, hora, dia e mês;
- recomputação idempotente e versão de cálculo;
- contagem de amostras distintas aproveitáveis, sem transformar ausência em zero;
- consumo/economia null até fonte e entrada de tarifa/moeda contratadas.

## Etapa E — Comparações e qualidade

- comparar apenas testes com contexto identificável;
- manter qualidade GOOD/PARTIAL e resumo INVALID como null na comparação;
- impedir conclusões quando qualidade é insuficiente;
- manter medição separada de inferência.

## Testes

- séries conhecidas e integração numérica;
- intervalos irregulares e contador reiniciado;
- duplicatas e recomputação;
- timezone e limites de período;
- autorização e paginação em grandes volumes sintéticos.

## Saída

API entrega séries/resumos/comparação sem MQTT disponível. Integração real dos
clientes e garantias PostgreSQL permanecem pendentes conforme matriz de revisão.
