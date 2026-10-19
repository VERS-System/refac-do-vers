<!-- Plano aprovado para implementar em React as telas desktop do VERS desenhadas no Stitch. -->

# Roadmap do frontend desktop — VERS

## 1. Objetivo

Implementar em código as 9 telas desktop aprovadas no Google Stitch (projeto
"VERS Desktop") dentro de `services/dashboard`, com dados de exemplo e sem
depender do backend. A integração com a API real fica para a Fase 9 do
[roadmap do core](core-roadmap.md).

Telas de referência (IDs do Stitch):

| Tela | ID |
|---|---|
| Visão geral | `d74c5942ca3e4e62ab3d962e505d999a` |
| Telemetria | `84480fa611564ca197fcac3d04481f6d` |
| Energia | `c4cad262178a41368ec78c5e7094684f` |
| Testes | `19f5b8107de04db7b574d540e80c79af` |
| Veículo e instalação | `a60c006f118d425486218829233a7ffb` |
| Viber IA | `baa94bdb810f40fa98cf017217216cd3` |
| Configurações | `3a04e33ebeef4fc2b16dda300f5012df` |
| Login | `1a8444f07f6f40fb80417eb5d5d842aa` |
| Criar conta | `b1a95755ae0849f7b6f11481550c6b32` |

## 2. Estado de referência em 13/10/2026

- Stack já declarada: Electron 33, Vite 6, React 19, Tailwind v4, React Router
  7, TanStack Query 5, Recharts 2, Zustand 5.
- Páginas e componentes existentes são esqueletos vazios ou com o tema azul
  antigo; `packages/ui` também usa o tema antigo.
- Não há configuração de testes nem script `test:unit`.
- Dois arquivos de configuração do Tailwind conflitantes.
- O processo principal do Electron não executa como está (`main` aponta para
  `.ts` e usa `__dirname` em pacote ESM); janela em 1280×800.

## 3. Decisões fixadas

1. **Tokens**: seguir o DESIGN.md do Stitch (canvas `#242423`, cards
   `#2A2A29` com borda `#323231`, dourado `#D5C462`), não o render escuro
   (`#131313`) que o Stitch gerou nas telas.
2. **Electron**: migrar para **electron-vite**, com `src/main`, `src/preload`
   e `src/renderer` compilados juntos. **Confirmado pelo usuário em
   16/10/2026: o app continua no Electron** (programa instalado), o que
   substitui a retirada do Electron do plano
   `dashboard-vite-sem-electron-26-09-2026.md`.
3. **Componentes**: ficam em `services/dashboard/src/renderer`; só migram para
   `packages/ui` se outro cliente precisar deles.
4. **Ícones**: `lucide-react`. **Fontes**: Geist, Geist Mono e Zen Dots
   empacotadas localmente (Fontsource).
5. **Rotas**: `HashRouter` (compatível com `file://` no Electron).
6. **Testes**: Vitest + Testing Library + jsdom, script `test:unit`; TDD
   obrigatório para comportamento (componentes, formatadores, cálculos).
7. **Dados**: fixtures com a base de exemplo de 28/09 a 04/10/2026
   (`.AIs/docs/contexts/Context_09_10_2026.md`) atrás de uma interface de
   repositório; a implementação real entra depois sem mudar as telas.
8. **Janela**: 1512×982 padrão, largura mínima 1280.

## 4. Fases

### Fase 0 — Fundação (concluída em 13/10/2026)

- electron-vite com processo principal, preload e renderer.
- Vitest, Testing Library, jsdom e `test:unit`.
- Tailwind v4 via `@tailwindcss/vite` com os tokens do DESIGN.md em `@theme`;
  remover `tailwind.config.js`, `tailwind.config.ts` e `postcss.config.js`.
- Fontes locais, `lucide-react`, `HashRouter`.
- Referências visuais das 9 telas (HTML e PNG) em
  `services/dashboard/design-reference/`.

**Critério de saída**: `test:unit` e o build passam; o app abre no Electron e
no navegador com o tema novo.

### Fase 1 — Componentes base (concluída em 13/10/2026)

Button, Badge, Card, KpiCard, SegmentedControl, Toggle, Input, Avatar, Table,
ChartCard, NavItem, `VersLogo`, `ViberMark` e formatadores pt-BR (vírgula
decimal, mW, mWh, Wh, %).

**Critério de saída**: cada componente com teste; formatadores cobrindo casos
de borda (zero, arredondamento, milhar com ponto).

Onde ficou: componentes em `src/renderer/components/ui/`, formatadores em
`src/renderer/lib/format.ts` (energia troca de mWh para Wh a partir de
1.000 mWh) e `cn` em `src/renderer/lib/cn.ts`. Fonte Public Sans adicionada
para rótulos e badges (`font-label`).

### Fase 2 — Shell do app (concluída em 13/10/2026)

Sidebar (logo, navegação, card do ESP32, usuário), TopBar (título, período,
"Dados de exemplo", busca, notificações), layout e rotas das 7 telas internas
e das 2 de autenticação.

**Critério de saída**: navegação entre rotas testada; item ativo destacado.

Onde ficou: `src/renderer/components/layout/` (AppShell, Sidebar, TopBar,
Page, PeriodSelector, AuthLayout com AuthCard, EmConstrucao), rotas em
`src/renderer/routes/navegacao.ts`, período no Zustand
(`src/renderer/stores/periodo.ts`, antecipado da Fase 3) e usuário/ESP32 de
exemplo em `src/renderer/data/exemplo.ts`. As 9 páginas existem com a barra
superior da referência e um aviso de conteúdo em construção.

### Fase 3 — Dados de exemplo (concluída em 13/10/2026)

Fixtures da semana de exemplo, interface de repositório com implementação
mock, hooks do TanStack Query e período no Zustand.

**Critério de saída**: testes conferem os números aprovados (1,92 Wh na
semana, 186 mW médios, 53,5% ponta a ponta, 292 mWh no dia).

Decisões de 13/10/2026:

- **Derivar, não copiar**: as fixtures guardam só medições brutas (energia
  por ponto, horas, pico, V/I/P, curva do dia) e todo número exibido é
  calculado em `src/renderer/data/calculos.ts`. Onde o Stitch diverge do
  cálculo, vale o cálculo.
- **Linha do tempo**: "hoje" é segunda 05/10/2026, até 18:05; Semana é a
  última semana completa (28/09 a 04/10); Mês vai de 01/10 até hoje; Hora é
  a última hora da curva de hoje (só P1, sem energia por ponto).
- **Escopo**: base e núcleo (semana, curva de hoje, cadeia ao vivo, bateria,
  vibração, veículo, dispositivo e usuário). Amostras da Telemetria,
  histórico de Testes e conversas da Viber entram na Fase 4 com cada tela,
  seguindo a mesma regra de derivação.

Onde ficou: tipos em `data/tipos.ts`, medições em `data/fixtures/`
(`medicoes.ts`, `sistema.ts` e o gerador `curva.ts`), interface e provedor
em `data/repositorio.tsx`, implementação em `data/repositorioMock.ts` e hooks
em `hooks/useDados.ts`. O shell (sidebar, subtítulo do veículo) já lê os
dados pelos hooks.

### Fase 4 — Telas

Ordem: Visão geral, Energia, Telemetria, Testes, Veículo e instalação, Viber
IA, Configurações, Login, Criar conta (stepper Conta / Veículo / Instalação).

**Critério de saída por tela**: testes de conteúdo e estados (carregando,
vazio, erro); comparação visual com a referência do Stitch em 1280 e 1512 px.

Andamento:

- **Visão geral — concluída em 14/10/2026.** O seletor de período muda só a
  energia (card e gráfico): Hora e Dia mostram a curva de potência (última
  hora ou o dia de 00h a 24h), Semana e Mês mostram barras de energia por
  dia. Potência instantânea, eficiência de hoje, bateria, vibração e cadeia
  de conversão ficam sempre no estado atual. Peças reaproveitáveis criadas:
  `components/ui/` (`Skeleton`, `EstadoConsulta`, `KpiConsulta`) e
  `components/charts/` (`Sparkline`, `BarraSegmentos`, `MedidorAnel`,
  `OndaVibracao`, `GraficoEnergia` com Recharts). O repositório passou a
  expor `obterDias('semana' | 'mes')` no lugar de `obterDiasDaSemana()`.
- **Energia — implementada em 14/10/2026 (aguardando revisão e commit do
  programador).** Plano e decisões abaixo.
- **Telemetria — implementada em 14/10/2026 (aguardando revisão e commit do
  programador).** Plano, decisões e execução em
  [desktop-frontend-telemetria.md](desktop-frontend-telemetria.md).
- **Testes — implementada em 14/10/2026, madrugada (aguardando revisão e
  commit do programador).** Plano, decisões e execução em
  [desktop-frontend-testes.md](desktop-frontend-testes.md).
- **Veículo e instalação — implementada na madrugada de 14/10/2026
  (aguardando revisão e commit do programador).** Plano em
  [desktop-frontend-veiculo.md](desktop-frontend-veiculo.md).
- **Viber — implementada na madrugada de 14/10/2026 (aguardando revisão e
  commit do programador).** Plano em
  [desktop-frontend-viber.md](desktop-frontend-viber.md).
- **Configurações — implementada na madrugada de 14/10/2026 (aguardando
  revisão e commit do programador).** Unidades, reduzir movimento e tarifa
  valem no app todo. Plano em
  [desktop-frontend-configuracoes.md](desktop-frontend-configuracoes.md).
- **Login e Criar conta — implementadas na madrugada de 14/10/2026
  (aguardando revisão e commit do programador).** Validação como os DTOs,
  recusas do backend tratadas, cadastro em três etapas. Plano em
  [desktop-frontend-autenticacao.md](desktop-frontend-autenticacao.md).
- **Veículos (cadastro de carros) — implementada em 15/10/2026, a pedido do
  usuário (aguardando revisão).** Lista, cadastro, detalhes, edição, troca do
  principal e remoção; o carro é identificado pelo ID gerado pelo sistema
  (o chassi saiu em 16/10/2026, por decisão do usuário). Plano em
  [desktop-frontend-veiculos.md](desktop-frontend-veiculos.md).
- **Veículo do Criar conta no primeiro acesso — implementado em 16/10/2026
  (aguardando revisão).** O Criar conta guarda o carro no computador e o
  Login leva à tela Primeiro veículo, que grava pelo `POST /vehicles`. Plano
  em [desktop-frontend-veiculo-no-cadastro.md](desktop-frontend-veiculo-no-cadastro.md).
  Pendência do backend: não existe ativação da conta nova.
- **Fase 4 concluída**: as 9 telas do Stitch estão implementadas sobre o
  repositório de exemplo. Próximo passo: revisão do programador, commits e
  a Fase 5.

#### Decisões do usuário para as telas restantes (14/10/2026, noite)

O usuário pediu que as telas restantes (Testes, Veículo e instalação, Viber,
Configurações, Login e Criar conta) fossem terminadas de madrugada, sem
interrupção. Decisões tomadas antes:

- **Autonomia**: decisões menores não previstas são escolhidas pela IA (a
  opção mais fiel aos contratos do backend e à honestidade dos dados) e
  registradas como "a validar" no plano da tela.
- **Testes**: ações funcionam no exemplo (planejar, iniciar, finalizar e
  cancelar, com confirmações, transições em memória e conflito ao iniciar com
  outro teste em andamento); filtros só os do contrato (abas por status e
  paginação; busca e terreno viram pedido ao backend); painel ao vivo só com
  o que é medido (sem velocidade, rotação, inclinação nem meta); histórico a
  partir dos trajetos da base (#008 a #024).
- **Veículo e instalação**: cadastro funciona em memória (editar, adicionar,
  trocar o ativo, com confirmação); ações no hardware (reiniciar terminal,
  mudar a associação dos piezos) e "Solicitar revisão" desativadas com
  "disponível com a API"; "Ver logs" mostra um log de exemplo só de leitura.
- **Viber**: sugestões respondem com textos montados dos dados calculados,
  sempre com a fonte; perguntas livres recebem "disponível com o backend da
  Viber"; conversas recentes derivadas da base.
- **Configurações**: preferências valem no app todo (unidades, reduzir
  movimento, tarifa que destrava a estimativa de economia), salvas
  localmente; perfil, alertas e sessões em memória; "Encerrar todas as
  sessões" com confirmação, levando ao Login.

#### Plano da tela Energia (14/10/2026)

Decisões do usuário:

- **Períodos**: a tela inteira segue o período. Semana e Mês como a
  referência (barras e tabela por dia); Dia com KPIs e perdas de hoje, a
  curva do dia no gráfico e a linha de hoje na tabela; Hora com energia e
  potência da última hora, e "Sem detalhe por ponto na última hora" em
  bateria, celular e perdas (na Hora só existe a curva do P1). Bateria e
  tarifa não mudam com o período.
- **Minigráfico da bateria**: criar um dado de tensão ao longo de hoje e
  mostrá-lo com legenda ("Tensão hoje (V)", mínimo e máximo).
- **Exportar CSV**: gera o arquivo de verdade (separador `;`, vírgula
  decimal, BOM UTF-8 para o Excel).

O que foi construído:

- KPIs: energia recuperada (o mesmo card da Visão geral, com o ícone no
  canto), potência média com o pico ("qui 17:42", "hoje 17:42"), energia
  entregue à bateria (% do recuperado) e carga entregue ao celular (≈ % de
  uma recarga de 15,4 Wh, constante em `data/referencias.ts`).
- Gráfico: barras recuperada (P1) × entregue à bateria (P3), média diária e
  valores; rodapé com o método (trapézios de P = V × I) e o total. Em Hora e
  Dia, a curva da Visão geral.
- Perdas nos 4 pontos com barras proporcionais ao P1; estado da bateria;
  economia bloqueada com "Configurar tarifa" (leva a Configurações);
  dispersão energia × vibração com r de Pearson e reta de regressão; tabela
  "Resumo por dia" com qualidade dos dados.
- Repositório: `obterDias` aceita `'dia'`; novos `obterAmostrasVibracao` e
  `obterTensaoBateria`.

Divergências com o Stitch:

| Onde | Stitch | Implementado | Motivo |
|---|---|---|---|
| Rodapé do gráfico | "amostragem 10 Hz" | "amostragem a cada 10 s" | as demais telas usam 10 s |
| Energia × vibração | r = 0,82 | r calculado das amostras (0,89 na semana) | o valor é derivado, não copiado |
| Minigráfico da bateria | linha sem rótulo | tensão de hoje com mín./máx. | decisão do usuário |

Premissas dos dados de exemplo **a validar pelo programador**:

- **Tensão da bateria**: a carga é reconstruída a partir dos 68% atuais; a
  bateria só muda com o carro em movimento (entra P3, sai P4) e o nó ESP32 é
  alimentado pelo veículo. Tensão de repouso linear de 3,45 V (vazia) a
  4,05 V (cheia), mais 0,06 V carregando; às 18:05 isso dá os 3,92 V do card.
  Se o nó for alimentado pela bateria, o consumo dele (~50 mW) a descarrega e
  o estado "carregando" das 18:05 deixa de fechar.
- **Amostras de vibração**: 4 por dia anterior (07:55, 08:20, 17:35, 18:00)
  e 8 hoje; vibração = potência ÷ 66 (212 mW ↔ 3,2 m/s² ao vivo) + ruído.
- **r com poucas amostras**: na Hora há 4 amostras e no Dia 8; o r é exibido
  mesmo assim. Avaliar um mínimo de amostras para mostrar r e a classificação
  (alta a partir de 0,7, moderada a partir de 0,4).

### Fase 5 — Movimento e acabamento

React Bits conforme o DESIGN.md (SpotlightCard, CountUp, Threads/Waves,
AnimatedList, Stepper, GlareHover), `prefers-reduced-motion`, foco visível e
navegação por teclado. **Implementada em 16/10/2026 (aguardando revisão e
commits do programador)** na branch `feat/desktop-fase-5`, com busca,
notificações, divisão por tela, CSP e curva do dia no escopo. Plano e
execução em [desktop-frontend-fase-5.md](desktop-frontend-fase-5.md).

## 5. Validação de cada etapa

1. Teste escrito antes e falhando pelo motivo certo.
2. `npm run test:unit` e `npm run build` em `services/dashboard`.
3. App em execução comparado à referência do Stitch.
4. Registro em `.AIs/docs/contexts/Context_dd_mm_aaaa.md`.
