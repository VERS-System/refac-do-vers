<!-- Task das telas de calendário e histórico energético do aplicativo mobile. -->

# Task 06 — Telas Calendário e histórico

## Objetivo

Permitir a navegação temporal pelos dias e períodos que possuem dados do VERS.

## O que precisa ser feito

- criar calendário mensal com marcação de dias que possuem resumo;
- permitir avançar, retroceder e selecionar período dentro dos limites aceitos;
- apresentar resumo do dia selecionado e acesso aos testes relacionados;
- criar lista histórica paginada com período, unidade e qualidade;
- preservar timezone informado pelo contrato;
- criar estados sem dados, período indisponível, carregamento e erro.

## Fronteira com a Task 05

O calendário embutido na tela de bateria (`BatteryCalendar`: seleção do dia
de referência) não substitui esta task. Aqui o escopo é o histórico
standalone: lista paginada, resumo do dia selecionado e acesso aos testes
relacionados.

## Integração esperada

Consome resumos diários e mensais do backend. Paginação, limites de intervalo e
normalização temporal são definidos pelo contrato da API.

## Validação

- navegação por teclado/leitor de tela identifica datas e seleção;
- meses sem dados não parecem falha;
- testes cobrem troca de mês, seleção, vazio e paginação visual.

## Critério de saída

O histórico permite localizar períodos disponíveis sem carregar séries brutas.
