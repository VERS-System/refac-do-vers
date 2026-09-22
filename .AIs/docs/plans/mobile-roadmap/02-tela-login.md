<!-- Task da tela de entrada do aplicativo mobile. -->

# Task 02 — Tela Login

## Objetivo

Permitir que o usuário informe suas credenciais e compreenda todos os estados
visuais do acesso.

## O que precisa ser feito

- revisar textos, idioma, ortografia, teclado e preenchimento automático;
- exibir email, senha, visibilidade da senha e ação principal;
- criar estados de envio, erro genérico, indisponibilidade e bloqueio temporário;
- manter o atalho para Cadastro;
- remover o botão Google enquanto não existir contrato aprovado;
- representar sessão expirada sem revelar detalhes de segurança;
- garantir foco, leitura por leitor de tela e alvos de toque adequados.

## Integração esperada

Consome o contrato público de login do backend. Cookies, tokens, enumeração de
contas e políticas de segurança não são implementados nem exibidos pelo mobile.

## Validação

- envio contém somente os campos do contrato;
- erros usam mensagens públicas e códigos mapeados;
- testes cobrem preenchimento, envio, carregamento, erro e navegação.

## Critério de saída

O fluxo visual de entrada está completo e preparado para o contrato de sessão.
