<!-- Plano da Fase 5 do app desktop: movimento, acessibilidade de foco e teclado, busca, notificações, divisão por tela, CSP e curva do dia. -->

# Plano — Fase 5: movimento e acabamento (desktop)

Pedido do usuário em 16/10/2026: começar a Fase 5 do
[roadmap](desktop-frontend-roadmap.md). Base: seção "Motion" do DESIGN.md
(design system "VERS Instrumentation" do Stitch) e levantamento do código em
16/10/2026.

## 1. Decisões do usuário (16/10/2026)

- **Branch nova** `feat/desktop-fase-5`, a partir de
  `feat/desktop-frontend-sync-master` (PR #24 segue em revisão). A Fase 5 vira
  outro PR.
- **Versões próprias leves**, sem biblioteca nova: SpotlightCard e GlareHover
  como no React Bits (só CSS); CountUp, AnimatedList, Stepper e o fundo
  animado escritos com CSS, `requestAnimationFrame` e canvas.
- **Fundo Waves** (canvas 2D) no painel da marca do Login e do Criar conta.
- **Extras no escopo**: divisão do app por tela (`React.lazy`), política de
  segurança (CSP), busca e notificações da barra superior, curva do dia
  suavizada.
- **Busca geral com atalho** (botão ou Ctrl+K): telas, seções das
  Configurações, testes (código) e veículos (placa ou nome), em todas as telas
  internas.
- **Notificações dos dados**: alertas ativos das Configurações conferidos
  contra os dados e eventos tirados dos próprios dados, com ponto de "não
  lido".

## 2. O que o DESIGN.md pede (seção Motion)

| Onde | Efeito | Hoje |
|---|---|---|
| Cards de KPI | SpotlightCard (brilho dourado que segue o cursor) + CountUp nos valores | `KpiCard` recebe o valor já formatado em texto |
| Botão primário | GlareHover (reflexo que atravessa no hover) | só troca de cor e brilho |
| Leituras ao vivo | AnimatedList (item novo entra animado) | `CardUltimasLeituras`, atualiza a cada 10 s |
| Criar conta | Stepper (Conta, Veículo, Instalação) | `Etapas` sem transição |
| Painel da marca (Login, Criar conta) | Threads ou Waves (linhas douradas finas que vibram) | gradiente estático |
| Card do dispositivo | pulso sutil só no ponto "ao vivo"; sem pulos nem confete | só o botão "Ao vivo" da Telemetria pulsa |

## 3. Regras para todo movimento

- **Reduzir movimento** vale em todo o app: a preferência das Configurações
  ou a do sistema (`prefers-reduced-motion`). Hoje o atributo
  `data-reduzir-movimento` só é aplicado dentro do shell (Login e Criar conta
  ficam de fora) e não é removido ao sair dele. Ele passa para a raiz do app.
- O CSS desliga animações e transições, mas não para animação em JavaScript.
  Um hook `useMovimentoReduzido()` (preferência + `matchMedia`) é lido por
  CountUp e pelo Waves. Sem `matchMedia` (ambiente de teste), não há
  animação.
- Durações curtas (150 a 600 ms), curvas de saída suaves e nenhum efeito que
  esconda ou atrase um dado: o valor final está sempre disponível para leitor
  de tela desde o início.
- O canvas para quando a janela fica oculta e desenha um quadro parado com
  movimento reduzido.

## 4. Lotes

Cada lote é feito em TDD, com `npm run test:unit`, build e print das telas
afetadas, e vira um commit quando o programador pedir.

1. **Base do movimento**: `useMovimentoReduzido()` e o atributo aplicado na
   raiz do app (com limpeza), valendo também no Login e no Criar conta.
2. **KPIs**: `SpotlightCard` (brilho radial dourado que segue o cursor, só no
   hover) e `CountUp` (do valor anterior ao novo, ~600 ms). O `KpiCard`
   recebe o número e a função de formatação; o valor final fica em texto
   para leitor de tela.
3. **Botão primário**: GlareHover em CSS (pseudo-elemento que atravessa o
   botão no hover). O link "Ir para o Login" do Criar conta passa a usar as
   mesmas classes do botão primário.
4. **Ponto ao vivo**: pulso sutil (anel que se expande e some) no ponto do
   `Badge` de status ao vivo, no ESP32 da sidebar e no card do dispositivo.
5. **AnimatedList**: nas Últimas leituras, só as leituras novas entram com
   fade e deslize curto; a primeira carga aparece sem animação.
6. **Stepper**: no Criar conta, a linha entre as etapas preenche em dourado
   ao avançar e o conteúdo da etapa entra com fade curto.
7. **Waves**: canvas 2D atrás do conteúdo do painel da marca, linhas douradas
   finas com baixa opacidade que ondulam e reagem ao cursor; quadro parado
   com movimento reduzido; sem canvas (teste), nada é desenhado.
8. **Foco e teclado**:
   - anel de foco visível nos campos em pílula (`Input`, `Select`,
     `Textarea`, campo da Viber) e no seletor da tabela de amostras, que hoje
     tem `outline-none` sem substituto;
   - abas de status do histórico de Testes com setas, `tabindex` móvel e
     painel associado;
   - diálogo: fundo inerte, rolagem travada e Escape mesmo com o foco fora do
     painel;
   - link "Pular para o conteúdo" no shell;
   - passada completa de teclado nas 11 telas.
9. **Busca geral**: busca e sino saem das páginas e vão para a barra superior
   de todas as telas internas. A busca abre um diálogo com campo e lista de
   resultados (padrão combobox), abre por Ctrl+K e procura telas, seções das
   Configurações, testes pelo código e veículos pela placa ou nome. Enter ou
   clique abre o resultado; setas percorrem a lista.
10. **Notificações**: o sino abre um painel com:
    - alertas ativos das Configurações conferidos contra os dados
      (dispositivo sem mensagens há mais de 5 min, eficiência ponta a ponta
      abaixo de 30%, temperatura do bloco acima de 60 °C);
    - eventos dos dados (testes finalizados, dispositivo conectado);
    - ponto de "não lido" no sino; "Marcar como lidas" em memória.
    Com os dados de exemplo nenhum alerta dispara; o painel diz "Nenhum
    alerta disparado" e mostra os eventos.
11. **Curva do dia**: linha suavizada (`monotone`) e média móvel curta para o
    desenho, preservando o ponto do pico com o valor real.
12. **Divisão por tela**: cada tela carregada com `React.lazy` e um esqueleto
    enquanto carrega; testes passam a esperar a tela (`findByRole`). Medir o
    tamanho do pacote antes e depois.
13. **CSP**: política injetada no `index.html` só no build (no
    desenvolvimento o Vite precisa de scripts inline e do websocket):
    `default-src 'self'`, `script-src 'self'`, `style-src 'self'
    'unsafe-inline'` (React e Recharts usam `style`), `img-src 'self' data:
    blob:`, `font-src 'self' data:`, `connect-src` com a API, `object-src
    'none'`, `base-uri 'none'`. No processo principal do Electron: bloquear
    janelas novas e navegação para fora do app.

## 5. A validar pelo programador

- Intensidade dos efeitos (opacidade do brilho, velocidade das ondas) depois
  dos prints.
- Regras de notificação: os limites dos alertas são fixos no código (o
  campo `limite` é só texto) e a lista de eventos derivados.
- Média móvel da curva do dia: janela de 5 min para o desenho.
- `connect-src` da CSP depende do endereço da API em produção.

## 6. Execução (16/10/2026)

Lotes 1 a 8 feitos em TDD (testes vermelhos por asserção antes de cada
implementação):

1. `hooks/useMovimentoReduzido.ts` (preferência do app + `matchMedia`, sem
   `matchMedia` conta como reduzido); `data-reduzir-movimento` saiu do
   `AppShell` e foi para a raiz do `App`, com limpeza ao desmontar.
2. `components/ui/ContagemNumero.tsx` (contagem de 600 ms com desaceleração
   exponencial a partir do valor anterior; valor final em `sr-only`);
   `KpiCard` com `contagem`, `valorContado` (traço para dado ausente) e o
   brilho `spotlight` (variáveis `--spot-x/--spot-y`, opacidade 9%). Ligado
   nos KPIs da Visão geral e da Energia; a energia conta na escala do valor
   final (`energiaDoKpi`).
3. `reflexo` no botão primário (faixa de luz de 700 ms no hover) e
   `classesDoBotao` para o link "Ir para o Login" do Criar conta.
4. `Badge` com `pulsar` (anel de 2,4 s): "Ao vivo" dos KPIs e do teste
   ativo, ESP32 da sidebar, card do dispositivo e botão "Ao vivo" da
   Telemetria (antes `animate-pulse`).
5. Últimas leituras: só as leituras que chegam depois da primeira carga
   entram com `entrada-leitura` (320 ms).
6. Criar conta: a linha da etapa concluída preenche em dourado (500 ms) e o
   conteúdo da etapa entra com `entrada-etapa` (260 ms).
7. `components/layout/OndasMarca.tsx` no painel da marca: 15 linhas
   douradas (5 a 18% de opacidade) que ondulam e vibram mais perto do
   cursor; quadro parado com menos movimento; laço pausado com a janela
   oculta.
8. Foco e teclado: `Input`, `Select`, `Textarea` e o campo da Viber
   voltaram a mostrar o anel de foco do DESIGN.md (`outline-none` removido);
   a pílula do seletor de amostras ganhou `anel-foco-dentro`; abas do
   histórico de Testes no padrão WAI-ARIA (tabindex móvel, setas, Home, End
   e `tabpanel`); `Dialog` com fundo inerte, rolagem travada e Esc mesmo com
   o foco fora; "Pular para o conteúdo" no shell. Passada de teclado por
   script nas 10 rotas (Tab 45 vezes em cada): todo foco tem nome, está
   visível e mostra o anel.

Prints conferidos: Login (ondas) e Visão geral (KPIs) em 1280 px.

Lotes 9 a 13 (mesmo dia, também em TDD):

9. **Busca geral**: `lib/busca.ts` (sem maiúsculas, acentos nem "#"; termo
   com "#" procura só testes, para "#024" não achar "2024"; título que começa
   com o termo vem antes); `components/busca/BuscaGlobal.tsx` (lupa e
   Ctrl+K/Cmd+K, diálogo "Buscar no VERS" com combobox e listbox); destino
   entregue à tela por `stores/destinoBusca.ts` (as telas são montadas sem
   roteador nos testes): teste abre no histórico de Testes, na página dele e
   com a linha destacada (`Table` ganhou `isRowCurrent`); veículo abre nos
   detalhes da tela Veículos; seção abre marcada nas Configurações (lista
   das seções saiu para `components/configuracoes/listaSecoes.ts`). Busca e
   sino passaram para a barra de todas as telas internas por contexto
   (`components/layout/AcoesGlobais.tsx`), e saíram os botões sem ação da
   Visão geral e da Energia. A Telemetria só lista os testes de hoje, por
   isso o teste abre no histórico.
10. **Notificações**: `data/notificacoes.ts` (alertas offline > 5 min,
    eficiência de hoje < 30% e bloco > 60 °C, só os ativos; eventos:
    dispositivo online, teste em andamento e encerrados, até 5);
    `components/notificacoes/Notificacoes.tsx` (painel ancorado no sino, não
    modal; Esc ou clique fora fecham; número de não lidas no nome do botão;
    "Marcar como lidas" em memória para todas as telas; "Configurar alertas"
    abre a seção Alertas). Com os dados de exemplo: "Nenhum alerta
    disparado" e 5 eventos.
11. **Curva do dia**: `suavizarSerie` (média móvel centrada de 5 min que
    volta ao valor medido no pico) e `pontosDaCurva`; a área usa a série
    suavizada com `type="monotone"`, o tooltip mostra o valor medido.
12. **Divisão por tela**: `routes/telaSobDemanda.tsx` (`React.lazy` que,
    depois de carregado, renderiza direto) e `routes/telas.tsx` com as 11
    telas; `Suspense` com `CarregandoTela` no `App` e dentro do shell (a
    sidebar fica na tela). Nos testes as telas chegam pré-carregadas
    (`import.meta.env.MODE === 'test'`). Pacote inicial: **2.044,84 kB →
    631,22 kB**; Recharts e componentes de gráfico (889 kB) só com as telas
    de gráfico; cada tela de 4 a 38 kB.
13. **CSP**: `src/main/seguranca.ts` (política e `navegacaoPermitida`),
    injetada no `index.html` só no build por plugin no
    `electron.vite.config.ts`; processo principal nega janelas novas e
    bloqueia navegação para fora do app. Conferido no Electron empacotado:
    Visão geral, Energia, Telemetria e Login carregam, com gráficos e
    ondas, sem violação de CSP no console.

Prints conferidos: busca aberta e painel de notificações em 1280 px; o
print do painel mostrou as datas como "–" (`formatarDataCurta` recebia data
com horário), corrigido com teste. Detector de design (Impeccable) sem
achados nos arquivos de interface alterados.

## 7. Efeitos extras (pedido do usuário em 16/10/2026)

Depois de ver o app, o usuário pediu mais efeitos e escolheu os quatro
grupos propostos. Seguem as regras da seção 3 (Reduzir movimento, nada que
esconda ou atrase dado, sem pulos) e o DESIGN.md ("no bouncing, no
confetti").

14. **Fluxo na cadeia de conversão** (Visão geral): um trilho acima dos 4
    pontos, com um marcador alinhado a cada ponto, e pontos de luz dourados
    que correm do Ponto 1 ao Ponto 4. A velocidade acompanha a potência do
    Ponto 1 (`duracaoFluxo`: mais potência, mais rápido, entre 1,4 e 6 s) e
    a luz enfraquece até a fração que chega ao celular (P4/P1). Sem
    potência, o trilho fica parado. Decorativo (`aria-hidden`); sem
    movimento, os pontos de luz somem.
15. **Transição entre telas**: o conteúdo da tela nova entra com fade curto
    (200 ms); o destaque do item ativo da sidebar e o do seletor Hora, Dia,
    Semana, Mês deslizam até o item escolhido (indicador medido do item).
16. **Entrada dos gráficos e cards**: os cards aparecem em sequência curta
    (até 6 por grupo, 40 ms entre eles, no máximo ~0,5 s no total); áreas,
    linhas e barras dos gráficos se desenham (600 ms, só com movimento); o
    medidor de anel e a barra da bateria se preenchem ao aparecer.
17. **Microinterações**: botões afundam levemente ao clicar (escala 0,97);
    cards de KPI sobem 2 px no hover; a onda da Vibração RMS corre na
    horizontal (ilustrativa, devagar); os valores de tensão, corrente e
    potência da cadeia de conversão contam até o número, como os KPIs.

### Execução dos efeitos extras (16/10/2026)

Em TDD, como os lotes anteriores:

14. `FluxoEnergia` na `CadeiaConversao`: trilho com 4 marcadores na mesma
    grade dos cards (gap de 16 px) e 3 luzes defasadas em `fluxo-luz`
    (`translateX(100cqw)` no trilho); `duracaoFluxo` (3 s a 200 mW, entre
    1,4 e 6 s); opacidade final P4/P1 (54% nos dados de exemplo); sem
    potência, `data-parado` e sem luzes; com menos movimento, as luzes
    somem.
15. Conteúdo da tela remontado por rota com `entrada-tela` (200 ms);
    destaque deslizante medido do item ativo na sidebar (`indicador-nav`,
    300 ms, sem transição na primeira posição) e no `SegmentedControl`
    (`indicador`, que mede de novo com `ResizeObserver` quando a fonte
    carrega). O fundo dourado saiu do `NavItem` e da opção marcada.
16. `entrada-card` no `Card` (280 ms, 40 ms entre vizinhos, até 200 ms de
    atraso); `useAnimacaoGrafico` (600 ms, `ease-out`) na curva, nas barras
    e na dispersão. O gráfico ao vivo da Telemetria ficou sem animação,
    porque redesenharia a cada 10 s. `preencher-anel` no medidor de anel e
    `preencher-barra` na barra da bateria. As animações de entrada usam
    `backwards`, para não segurarem o `transform` depois de terminar.
17. Botões afundam ao pressionar (`active:scale-[0.97]`); KPIs sobem 2 px
    no hover; a onda da Vibração RMS corre um ciclo por volta (1,6 s), com
    um ciclo a mais no caminho; tensão, corrente e potência da cadeia
    contam até o valor (`ContagemNumero`).

Print conferido em 1280 px: o trilho estava desalinhado dos cards e a
linha quase invisível; corrigido (mesmo gap da grade e linha dourada
suave).
