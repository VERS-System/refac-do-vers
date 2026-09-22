<!-- Task do conjunto de telas de veículos vinculados ao usuário. -->

# Task 10 — Telas Veículos

## Objetivo

Permitir visualizar e solicitar operações sobre os veículos associados à conta.

## O que precisa ser feito

- criar lista de veículos com indicação do principal;
- criar detalhes com placa, marca, modelo e ano disponíveis;
- criar formulário de cadastro usando somente os campos do contrato;
- criar edição apenas para campos mutáveis;
- criar seleção visual do veículo principal;
- representar remoção, substituição necessária, conflito e erro;
- não solicitar CPF, CRLV, RENAVAM ou upload de documentos no MVP.

## Integração esperada

O backend garante unicidade da placa, vínculo, veículo principal, mutabilidade e
autorização. O mobile representa o resultado das operações.

## Validação

- placa aparece como imutável após cadastro;
- mensagens de conflito não revelam dados de terceiros;
- testes cobrem lista, cadastro, detalhes, edição e seleção principal.

## Critério de saída

O fluxo visual de veículos corresponde integralmente ao contrato compartilhado.
