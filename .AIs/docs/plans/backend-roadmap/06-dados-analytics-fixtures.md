<!-- Fase 06 do roadmap executável do backend VERS. -->

# Fase 06 — Dados, analytics e fixtures

## Objetivo

Entregar consultas e cálculos completos usando dados sintéticos antes de
depender do ESP32 ou do broker.

## Etapa A — Fixtures controladas

- criar gerador disponível somente em desenvolvimento/teste;
- representar séries regulares, lacunas, atrasos e valores inválidos;
- proibir rota pública de ingestão manual em produção;
- usar somente identidades e placas sintéticas.

## Etapa B — Consultas de telemetria

- paginação por cursor ou intervalo limitado;
- filtros por teste, dispositivo e qualidade;
- resolução agregada para períodos longos;
- limites de exportação e proteção contra enumeração.

## Etapa C — Cálculos

- potência calculada por `V × I` quando ambos existem;
- energia integrada considerando intervalo real;
- médias, mínimos, máximos e qualidade;
- não substituir ausente por zero;
- não calcular eficiência sem referência mecânica.

## Etapa D — Resumos e séries

- períodos de teste, hora, dia e mês;
- recomputação idempotente e versão de cálculo;
- contagem de amostras válidas, suspeitas e ausentes;
- economia somente com tarifa, moeda e premissas registradas.

## Etapa E — Comparações e qualidade

- comparar apenas testes com contexto identificável;
- expor cobertura, lacunas e rejeições;
- impedir conclusões quando qualidade é insuficiente;
- manter medição separada de inferência.

## Testes

- séries conhecidas e integração numérica;
- intervalos irregulares e contador reiniciado;
- duplicatas e recomputação;
- timezone e limites de período;
- autorização e paginação em grandes volumes sintéticos.

## Saída

Mobile e dashboard consomem séries e resumos estáveis sem MQTT disponível.
