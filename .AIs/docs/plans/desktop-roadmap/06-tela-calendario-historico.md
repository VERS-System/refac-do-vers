<!-- Task das telas de calendário e histórico do dashboard desktop. -->

# Task D06 — Telas Calendário e histórico

## Objetivo

Permitir navegação temporal e consulta densa de períodos, resumos e testes.

## O que precisa ser feito

- criar calendário mensal com dias que possuem dados;
- criar lista paginada de períodos e testes;
- permitir filtros e ordenação previstos pelo contrato;
- abrir detalhes sem perder o contexto de busca;
- preservar timezone, unidades e qualidade;
- oferecer comparação somente para seleções compatíveis;
- criar vazio, carregamento, erro e fim da paginação.

## Integração esperada

Paginação, limites de intervalo, timezone e compatibilidade vêm da API.

## Critério de saída

O usuário localiza e revisita resultados históricos sem carregar telemetria
bruta desnecessariamente.
