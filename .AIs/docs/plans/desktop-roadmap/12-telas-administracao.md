<!-- Task das telas administrativas autorizadas do dashboard desktop. -->

# Task D12 — Telas Área administrativa

## Objetivo

Apresentar operações administrativas contratadas sem transformar a interface em
fonte de autorização.

## O que precisa ser feito

- criar entrada administrativa apenas quando o perfil retornado permitir;
- listar instalações, dispositivos e solicitações conforme endpoints aprovados;
- criar telas de provisionamento/revogação quando houver contrato;
- criar atualização de status de suporte quando permitida;
- mostrar auditoria pública mínima sem payloads ou segredos;
- representar acesso negado, conflito, ação irreversível e erro;
- exigir confirmações visuais para operações sensíveis.

## Limites

- esconder botão não substitui guard do backend;
- não criar gestão de usuário, papel ou dispositivo sem contrato aprovado;
- nenhuma credencial é exibida novamente após provisionamento seguro.

## Critério de saída

Cada operação administrativa possui contrato, confirmação, feedback e teste de
acesso negado.
