<!-- Task de fundação visual e navegação do dashboard web. -->

# Task D00 — Base visual e navegação web

## Objetivo

Criar a estrutura compartilhada que hospeda todas as telas do dashboard web.

## O que precisa ser feito

- auditar React, Vite, Tailwind e `packages/ui`;
- aplicar tokens preto, dourado e branco da identidade VERS;
- definir menu lateral, cabeçalho, breadcrumbs e área de conteúdo;
- configurar rotas públicas, autenticadas e administrativas;
- criar componentes de card, tabela, formulário, modal, feedback e skeleton;
- definir comportamento responsivo para larguras de tela suportadas;
- remover referências visuais ao diagnóstico do veículo.

## Validação

- todas as rotas possuem foco inicial e navegação por teclado;
- menu informa seleção e estado recolhido;
- o cliente consome somente contratos públicos da API;
- componentes compartilhados refletem a identidade VERS;
- testes unitários e lint passam a possuir comandos definidos.

## Critério de saída

As demais telas podem ser implementadas sem duplicar layout, navegação ou
componentes estruturais.
