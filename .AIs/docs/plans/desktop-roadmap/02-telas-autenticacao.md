<!-- Task das telas de Login e Cadastro do dashboard desktop. -->

# Task D02 — Telas Login e Cadastro

## Objetivo

Entregar os fluxos públicos de entrada e criação de conta no desktop.

## O que precisa ser feito

- criar Login com email, senha, visibilidade e autofill apropriado;
- criar Cadastro com email, senha, confirmação e requisitos informativos;
- representar envio, conflito, erro genérico e sessão expirada;
- manter navegação clara entre Login e Cadastro;
- excluir Google e recuperação de senha enquanto não houver contrato;
- não solicitar CPF ou documentos;
- adaptar layout para teclado, zoom e diferentes tamanhos de janela.

## Integração esperada

Consome os mesmos contratos públicos do mobile. Cookies, segurança, regras de
senha e enumeração de contas pertencem ao backend.

## Critério de saída

Login e Cadastro possuem estados completos e testes de teclado, envio, erro e
navegação.
