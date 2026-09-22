<!-- Task da tela inicial de apresentação do aplicativo mobile. -->

# Task 01 — Tela Splash

## Objetivo

Apresentar a marca enquanto o aplicativo prepara a primeira navegação.

## O que precisa ser feito

- preservar o símbolo VERS centralizado e responsivo;
- definir fundo, status bar e comportamento em safe areas;
- representar visualmente o carregamento sem expor detalhes técnicos;
- permitir transição para Login ou área autenticada conforme o estado recebido;
- evitar duração artificial obrigatória quando o aplicativo já estiver pronto.

## Integração esperada

A tela apenas recebe o resultado do bootstrap de sessão. A validação e renovação
da sessão pertencem ao backend e à camada de integração, não à Splash.

## Validação

- marca visível em diferentes dimensões;
- transição sem piscar telas protegidas;
- teste de interface para carregamento e destino inicial.

## Critério de saída

A abertura conduz ao fluxo correto com apresentação consistente da marca.
