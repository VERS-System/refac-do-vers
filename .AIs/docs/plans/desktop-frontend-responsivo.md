<!-- Plano do app desktop responsivo: do celular (360 px) a telas grandes, com menu lateral por botão em telas estreitas. -->

# Plano — App responsivo (desktop e web)

Pedido do usuário em 19/10/2026, depois de abrir a versão web publicada para
o grupo do TCC: "o app não está responsivo". Hoje as telas foram desenhadas
para 1512 px (DESIGN.md) com mínimo de 1280 px; abaixo disso, colunas e
cards ficam espremidos e a página rola na horizontal. Feito na branch
`feat/desktop-fase-5`, antes de resolver o conflito do PR #24.

## 1. Decisões do usuário (19/10/2026)

- **Até o celular**: funcionar bem de 360 px a telas grandes.
- **Menu por botão**: abaixo de 1024 px a sidebar some e um botão de menu
  na barra superior abre a mesma navegação por cima da tela.
- **Electron**: a janela pode ficar menor, com mínimo de 800 × 600.

## 2. Faixas de largura

Pontos de quebra do Tailwind, com o layout atual preservado a partir de
1280 px (o que foi aprovado no Stitch não muda):

| Faixa | Largura | Como fica |
|---|---|---|
| Celular | < 640 px | uma coluna; espaçamento de 16 px; barra superior em duas linhas |
| Celular grande / tablet | 640–1023 px | KPIs em 2 colunas; painéis laterais embaixo do conteúdo principal; menu por botão |
| Notebook | 1024–1279 px | sidebar fixa; KPIs em 2 ou 4 colunas; painéis laterais ao lado quando cabem |
| Desktop | ≥ 1280 px | layout atual do Stitch |

## 3. O que muda

- **Shell**: sidebar fixa só a partir de 1024 px. Abaixo disso, botão
  "Abrir menu" na barra superior abre a navegação num painel lateral (o
  diálogo com `variante="lateral"`: foco preso, fundo inerte, Esc e clique
  fora fecham, fecha ao escolher uma tela). O painel tem a mesma navegação,
  o card do ESP32 e o usuário com "Sair".
- **Barra superior**: título e ações na primeira linha; seletor de período
  numa segunda linha em telas estreitas; subtítulo escondido no celular;
  badge "Dados de exemplo" curto ("Exemplo") no celular.
- **Página**: espaçamento interno de 16 px no celular, 24 px no tablet e
  32 px no desktop.
- **Grades das telas**: cada `grid-cols-4` vira 1 → 2 → 4 colunas; cada
  layout "conteúdo + painel lateral" (`minmax(0,1fr)_300px` e parecidos)
  empilha o painel embaixo até 1280 px (ou 1024 px quando couber); as
  grades de 3 colunas (Energia, Veículo e instalação) empilham.
- **Telas específicas**: cadeia de conversão em 2 colunas no tablet e 1 no
  celular (o trilho do fluxo só aparece com 4 colunas); Configurações com o
  índice de seções acima do conteúdo, rolando na horizontal; Viber com as
  sugestões embaixo da conversa; formulários com 2 ou 3 colunas viram 1 no
  celular; tabelas continuam rolando na horizontal dentro do card.
- **Login e Criar conta**: o painel da marca vira uma faixa compacta acima
  do formulário abaixo de 1024 px (logo, slogan, título e as ondas); formulário
  em largura total com 16 px de margem.
- **Sobreposições**: painel de notificações com largura máxima da tela
  menos 32 px; diálogos já se ajustam (largura máxima e rolagem interna).
- **Electron**: `minWidth` 800 e `minHeight` 600.
- **Versão web publicada**: sai o aviso "abra no computador".

## 4. Validação

- TDD para o comportamento novo: botão de menu, painel lateral (abre,
  fecha com Esc e ao escolher uma tela, devolve o foco) e o diálogo com
  variante lateral.
- O resto é layout (classes por largura), que o jsdom não mede; é conferido
  por prints em 390, 768, 1024 e 1280 px das telas principais, olhando
  rolagem horizontal, texto cortado e sobreposição. Sem rolagem
  horizontal no `body` em nenhuma largura.
- `npm run test:unit` e build.

## 5. A validar pelo programador

- Faixas e pontos de quebra escolhidos.
- Painel da marca compacto (com as ondas) no celular.
- O que o Stitch não desenhou para telas estreitas segue o mesmo visual,
  sem referência própria.

## 6. Execução (19/10/2026)

- TDD do comportamento: `components/layout/MenuLateral.test.tsx` (3 testes
  vermelhos por asserção antes): botão "Abrir menu", painel com navegação,
  ESP32 e usuário, fecha ao escolher uma tela e com Esc (foco volta ao
  botão), ausente no Login.
- `Dialog` ganhou `variante="lateral"` (altura toda, à esquerda, título só
  para leitor de tela, entrada deslizando); `AppShell` esconde a sidebar
  abaixo de 1024 px e abre a mesma `Sidebar` no painel; o botão chega à
  `TopBar` pelo contexto `InicioBarraProvider`.
- `TopBar`: primeira linha com menu, título, busca e sino; segunda linha
  (abaixo de 1024 px) com período, badge ("Exemplo" no celular) e ações da
  tela. `Page` com 16, 24 e 32 px de espaçamento.
- Grades: KPIs 1 → 2 → 4 colunas; painéis laterais embaixo até 1280 px;
  grades de 3 colunas em 2 (com a última na largura toda) entre 1024 e
  1279 px; cadeia de conversão 1 → 2 → 4 (trilho do fluxo só com 4);
  formulários em 1 coluna no celular; índice das Configurações rolando na
  horizontal; cabeçalhos de gráfico, da cadeia e das seções das
  Configurações quebrando a linha; paginação em duas linhas; campo da Viber
  com o botão só com ícone no celular.
- Login e Criar conta: painel da marca em faixa compacta acima do
  formulário abaixo de 1024 px.
- Notificações: largura máxima da tela menos 32 px. Electron: mínimo
  800 × 600.
- Verificação: script que mede rolagem horizontal e elementos fora da
  borda nas 10 rotas em 390, 768 e 1024 px (zero ocorrências no fim; a
  primeira versão da checagem ignorava conteúdo dentro de `overflow-hidden`
  e foi corrigida); prints em 390 px de 9 telas e do menu, 768 px da
  Energia e 1280 px da Visão geral (igual ao Stitch).
