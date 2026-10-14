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
   e `src/renderer` compilados juntos.
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

### Fase 5 — Movimento e acabamento

React Bits conforme o DESIGN.md (SpotlightCard, CountUp, Threads/Waves,
AnimatedList, Stepper, GlareHover), `prefers-reduced-motion`, foco visível e
navegação por teclado.

## 5. Validação de cada etapa

1. Teste escrito antes e falhando pelo motivo certo.
2. `npm run test:unit` e `npm run build` em `services/dashboard`.
3. App em execução comparado à referência do Stitch.
4. Registro em `.AIs/docs/contexts/Context_dd_mm_aaaa.md`.
