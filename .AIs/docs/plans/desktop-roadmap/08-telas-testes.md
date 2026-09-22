<!-- Task do conjunto de telas de testes experimentais no desktop. -->

# Task D08 — Telas Testes experimentais

## Objetivo

Representar planejamento, execução, encerramento e consulta dos testes VERS.

## O que precisa ser feito

- criar lista com filtros, paginação e status;
- criar detalhes com veículo, instalação, configuração, período e qualidade;
- criar formulário de planejamento com opções fornecidas pelo backend;
- criar confirmações para iniciar, finalizar e cancelar;
- durante execução, combinar contexto e telemetria autorizada;
- representar conflito concorrente, ação indisponível e falha;
- preservar o resultado retornado em vez de antecipar transições na UI.

## Integração esperada

O backend controla máquina de estados, compatibilidade, timestamps, operador e
autorização.

## Critério de saída

Todos os estados e ações do teste possuem representação visual e testes, sem
duplicar regras do domínio.
