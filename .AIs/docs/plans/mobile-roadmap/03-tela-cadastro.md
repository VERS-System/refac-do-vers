<!-- Task da tela de criação de conta do aplicativo mobile. -->

# Task 03 — Tela Cadastro

## Objetivo

Apresentar o formulário de criação de conta com feedback visual claro e
compatível com o contrato público.

## O que precisa ser feito

- revisar textos, idioma e ortografia;
- exibir email, senha, confirmação e requisitos informativos;
- representar validação local de formato apenas para experiência de uso;
- criar estados de envio, conflito, erro genérico e sucesso;
- oferecer retorno explícito ao Login;
- não solicitar CPF, documento do veículo ou outros dados fora do contrato.

## Integração esperada

Consome o contrato público de cadastro. Regras definitivas de senha, unicidade,
normalização e criação do usuário continuam sob responsabilidade do backend.

## Validação

- campos e mensagens permanecem alinhados ao contrato compartilhado;
- leitor de tela identifica requisitos atendidos e pendentes;
- testes cobrem formulário incompleto, envio, erro e retorno ao Login.

## Critério de saída

A criação de conta possui fluxo visual completo sem antecipar regras do backend.
