<!-- Task de fundação visual e navegação compartilhada do aplicativo mobile. -->

# Task 00 — Base visual e navegação

## Objetivo

Estabelecer a estrutura visual compartilhada e o mapa de navegação que sustentam
todas as telas do aplicativo.

## O que precisa ser feito

- auditar componentes, tokens, navegação e testes já existentes;
- consolidar cores, tipografia, espaçamentos, bordas, ícones e marca VERS;
- definir pilhas públicas e autenticadas e as abas principais;
- substituir a aba de diagnóstico por uma área ainda prevista no escopo aprovado;
- criar componentes visuais reutilizáveis para cabeçalho, cards, botões, campos,
  feedback, skeleton, vazio e erro;
- definir comportamento em diferentes larguras, safe areas e teclado;
- documentar o mapa de rotas sem colocar regras de autorização no cliente.

## Limites

- não decidir sessão, permissões ou acesso a recursos;
- não duplicar contratos ou validações de domínio do backend;
- não criar uma segunda identidade visual para telas específicas.

## Validação

- navegação acessível por rótulos e estados selecionados;
- componentes renderizam corretamente em tamanhos de tela representativos;
- nenhuma rota ou atalho de diagnóstico permanece ativo;
- testes unitários cobrem os elementos compartilhados.

## Critério de saída

Todas as telas seguintes podem ser construídas sobre a mesma navegação e os
mesmos tokens, sem duplicação estrutural.
