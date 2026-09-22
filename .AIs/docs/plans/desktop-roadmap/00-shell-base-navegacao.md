<!-- Task de fundação visual, shell Electron e navegação do dashboard. -->

# Task D00 — Shell Electron, base visual e navegação

## Objetivo

Criar a estrutura compartilhada que hospeda todas as telas do desktop.

## O que precisa ser feito

- auditar renderer, processo principal, preload, Tailwind e `packages/ui`;
- aplicar tokens preto, dourado e branco da identidade VERS;
- definir menu lateral, cabeçalho, breadcrumbs e área de conteúdo;
- configurar rotas públicas, autenticadas e administrativas;
- criar componentes de card, tabela, formulário, modal, feedback e skeleton;
- definir comportamento para janela mínima, maximizada e redimensionada;
- manter `contextIsolation` e preload com API mínima e tipada;
- remover referências visuais ao diagnóstico do veículo.

## Validação

- todas as rotas possuem foco inicial e navegação por teclado;
- menu informa seleção e estado recolhido;
- nenhum recurso Node fica exposto diretamente ao renderer;
- componentes compartilhados refletem a identidade VERS;
- testes unitários e lint passam a possuir comandos definidos.

## Critério de saída

As demais telas podem ser implementadas sem duplicar layout, navegação ou
componentes estruturais.
