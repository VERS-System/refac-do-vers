<!-- Task das telas de solicitação e acompanhamento de revisão do sistema VERS. -->

# Task 11 — Telas Suporte e revisão

## Objetivo

Permitir abrir e acompanhar solicitações relacionadas à instalação VERS.

## O que precisa ser feito

- criar formulário com seleção de veículo/instalação e motivo textual limitado;
- informar que documentos e anexos não fazem parte do fluxo inicial;
- criar confirmação antes do envio;
- criar lista e detalhes com status e datas;
- representar aberto, em revisão, agendado, resolvido e cancelado;
- criar estados vazio, carregamento, erro e envio concluído.

## Integração esperada

Consome o contrato público de solicitações. Limites, autorização e transições de
status são controlados pelo backend.

## Validação

- formulário envia somente campos permitidos;
- status usa os valores e textos mapeados do contrato;
- testes cobrem criação, lista, detalhes e estados visuais.

## Critério de saída

O usuário consegue solicitar e acompanhar revisão sem canais paralelos na UI.
