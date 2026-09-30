<!-- Task da tela detalhada de bateria e energia do aplicativo mobile. -->

# Task 05 — Tela Bateria e energia

## Objetivo

Apresentar energia recuperada e os demais indicadores energéticos fornecidos
pelo backend de forma compreensível e comparável.

## O que precisa ser feito

- criar resumo por período com energia recuperada, potência média e pico;
- apresentar gráfico horário com eixos, unidades e seleção de período;
- distinguir medição, valor calculado e informação indisponível;
- mostrar cobertura e qualidade dos dados;
- apresentar bateria usada somente quando houver fonte confiável;
- apresentar economia somente quando moeda, tarifa e premissas vierem no contrato;
- criar estados vazio, parcial, inválido, carregando e erro.

## Layout de referência (implementado)

Mockups em `services/mobile/src/assets/battery1.png` (padrão) e
`battery2.png` (expandido):

- "MONTHLY RECORD" com donut + legenda
  ("Battery Recovered"/"Battery Used");
- card "Today" com série horária e rótulos de hora; botão de expandir
  alterna o modo compacto/expandido (expandido esconde o calendário e mostra
  gráficos altos + "Money economy");
- card do calendário mensal funcional (seleção de dia de referência);
- semana implementada D–S correta (o mockup omite TUE e repete SUN).

## Integração esperada

Consome séries e resumos calculados pelo backend. O mobile não calcula potência,
energia, eficiência ou economia.

## Validação

- gráficos permanecem legíveis com valores extremos e lacunas;
- valores ausentes nunca aparecem como zero;
- testes cobrem períodos, qualidade, ausência e erro.

## Critério de saída

O usuário consulta indicadores energéticos sem que a interface produza novas
interpretações dos dados.
