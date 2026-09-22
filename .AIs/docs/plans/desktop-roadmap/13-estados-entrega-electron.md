<!-- Task final de consistência, acessibilidade e entrega do aplicativo Electron. -->

# Task D13 — Estados globais e entrega Electron

## Objetivo

Validar o conjunto das telas e produzir um aplicativo desktop reproduzível.

## O que precisa ser feito

- padronizar loading, vazio, erro, offline, sessão expirada e reconexão;
- validar teclado, foco, contraste, zoom e leitores de tela;
- validar redimensionamento e tamanho mínimo da janela;
- revisar idioma, unidades, datas e timezone;
- identificar fixtures para não parecerem dados reais;
- criar testes unitários e fluxos críticos do renderer;
- revisar CSP, preload, links externos e permissões do Electron;
- validar build e instaladores previstos para Windows, macOS e Linux;
- documentar execução, empacotamento e limitações conhecidas.

## Critério de saída

O dashboard é navegável, acessível, recupera conexões, consome somente contratos
públicos e pode ser empacotado sem ampliar desnecessariamente a superfície do
Electron.
