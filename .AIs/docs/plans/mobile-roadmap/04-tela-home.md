<!-- Task da tela inicial autenticada do aplicativo mobile. -->

# Task 04 — Tela Home

## Objetivo

Resumir o estado recente do sistema VERS e oferecer acesso às áreas principais.

## O que precisa ser feito

- remover o card e o atalho de diagnóstico do veículo;
- reorganizar cards de energia recuperada, uso energético disponível, economia e
  estado do sistema VERS;
- manter acesso evidente ao Viber;
- exibir período, unidade e qualidade ao lado de cada indicador;
- criar estados de carregamento, ausência de instalação, ausência de dados,
  qualidade insuficiente e erro;
- navegar para os detalhes sem calcular ou reinterpretar valores no cliente;
- adaptar os cards a telas estreitas e fontes ampliadas.

## Integração esperada

Recebe resumos prontos do backend. Valores de bateria usada e economia só devem
ser mostrados quando o contrato os fornecer com fonte e premissas válidas.

## Validação

- nenhum diagnóstico do veículo permanece na interface ou nos testes;
- todos os números exibem unidade e período;
- testes cobrem cards, estados visuais e atalhos.

## Critério de saída

A Home comunica o estado essencial sem apresentar dados simulados como reais.
