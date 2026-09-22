<!-- Task da tela de perfil do usuário no aplicativo mobile. -->

# Task 09 — Tela Perfil

## Objetivo

Apresentar os dados públicos da conta e os acessos relacionados ao usuário.

## O que precisa ser feito

- exibir e permitir editar somente campos previstos no contrato;
- mostrar papel ou área administrativa apenas quando retornados pelo backend;
- oferecer acesso a veículos, suporte e encerramento de sessão;
- criar estados de leitura, edição, envio, sucesso e erro;
- representar expiração da sessão e retorno ao Login;
- evitar dados pessoais não aprovados, documentos e informações técnicas.

## Integração esperada

Consome perfil e logout do backend. Papéis, permissões e encerramento efetivo da
sessão não são decididos pelo mobile.

## Validação

- campos extras não são enviados;
- ações restritas não são inferidas apenas pela interface;
- testes cobrem leitura, edição, erro e saída.

## Critério de saída

O usuário visualiza e atualiza o perfil permitido com estados claros.
