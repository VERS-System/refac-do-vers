<!-- Task final de consistência, acessibilidade e entrega do dashboard web. -->

# Task D13 — Estados globais e entrega web

## Objetivo

Validar o conjunto das telas e produzir um dashboard web reproduzível.

## O que precisa ser feito

- padronizar loading, vazio, erro, offline, sessão expirada e reconexão;
- validar teclado, foco, contraste, zoom e leitores de tela;
- validar layout responsivo nos tamanhos de navegador suportados;
- revisar idioma, unidades, datas e timezone;
- identificar fixtures para não parecerem dados reais;
- criar testes unitários e fluxos críticos do dashboard;
- revisar CSP, links externos e política de cookies/CSRF;
- validar build Vite e publicação web;
- documentar execução e limitações conhecidas.

## Critério de saída

O dashboard é navegável, acessível, recupera conexões, consome somente contratos
públicos e pode ser publicado como aplicação web.
