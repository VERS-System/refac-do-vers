<!-- Task do conjunto de telas de testes experimentais no aplicativo mobile. -->

# Task 08 — Telas Testes experimentais

## Objetivo

Representar visualmente a criação, o acompanhamento e a consulta dos testes VERS.

## O que precisa ser feito

- criar listagem com filtros e paginação definidos pelo contrato;
- criar detalhes com contexto, configuração, período, status e qualidade;
- criar formulário visual de planejamento usando opções fornecidas pelo backend;
- criar confirmações para iniciar, finalizar e cancelar;
- apresentar estados planejado, em execução, concluído, falhou e cancelado;
- durante execução, mostrar dados recentes e estado de conexão sem comandar MQTT;
- representar conflitos e ações indisponíveis com mensagens públicas.

## Integração esperada

O backend valida transições, compatibilidade, concorrência e autorização. O
mobile apenas solicita ações e representa o estado retornado.

## Validação

- nenhuma transição é presumida localmente como concluída;
- detalhes exibem unidades e timestamps do contrato;
- testes cobrem listagem, detalhes, confirmações e conflitos.

## Critério de saída

O fluxo completo de telas existe sem duplicar a máquina de estados do backend.
