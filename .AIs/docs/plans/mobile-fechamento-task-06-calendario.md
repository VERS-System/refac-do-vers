<!-- Plano de fechamento visual da Task 06 do mobile (Calendário e histórico). -->

# Plano — Fechamento da Task 06 mobile (Calendário e histórico)

## 1. Objetivo

Levar a Task 06 (`mobile-roadmap/06-tela-calendario-historico.md`) do estado
"Planejada" ao critério de saída — "o histórico permite localizar períodos
disponíveis sem carregar séries brutas" — usando somente estado visual local
(props) e fixtures sintéticas. Nenhuma integração real com backend faz parte
deste plano.

Próximo passo confirmado em 29/09/2026 a partir de `.AIs`: Tasks 00–04
`Concluída`, Task 05 `Implementada` e fechada em `Context_28_09_2026.md`
(05a–05h, 131 testes + `tsc` limpo), Task 06 `Planejada` com dependência
visual da Task 05 (`mobile-roadmap/README.md`).

## 2. Fronteira com a Task 05 (não duplicar)

- O `BatteryCalendar` embutido na `BatteryScreen` (`services/mobile/src/components/BatteryCalendar.tsx`)
  seleciona o dia de referência dos indicadores; não substitui esta task.
- Aqui o escopo é o histórico standalone: calendário mensal com marcação de
  dias com resumo + lista paginada + resumo do dia + acesso aos testes
  relacionados (`06-tela-calendario-historico.md`, seção Fronteira).

## 3. Decisões do programador em 29/09/2026

- Tela standalone nova (ex. `HistoryScreen`), reutilizando `BatteryCalendar`
  como base (props `selectedDate`, `daysWithData`, `onSelectDay`,
  `onMonthChange`), sem mudar a estrutura de `RootNavigator`/`tabs.ts`.
- Dados por props + fixtures sintéticas até o contrato F06 existir; paginação
  visual local; timezone exibido como vier do contrato, sem conversão local.
- Nenhum cálculo, persistência, sessão, autorização ou regra de domínio no
  cliente (regras 2–3 do roadmap mobile).

## 4. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **06a — scaffold:** nova `HistoryScreen` em `ScreenShell` + `AppHeader`,
  rota no fluxo autenticado sem mudar `TAB_ORDER`; teste cobra título,
  calendário presente e lista vazia inicial.
- **06b — calendário standalone:** consome `BatteryCalendar`; props
  `month/year/selectedDate/daysWithData`; nav `<`/`>` e seleção notificadas
  por callbacks; limites aceitos por props; teste cobre troca de mês,
  seleção e dias com dados em destaque.
- **06c — resumo do dia + acesso a testes:** props `summary` (período,
  unidade Wh, qualidade) e `onOpenTests`; sem zeros inventados; teste cobre
  resumo exibido e callback de acesso.
- **06d — lista histórica paginada:** props `items/page/pageSize/total`
  + `onPageChange`; cada linha com período, unidade e qualidade; teste cobre
  paginação visual e rótulos.
- **06e — estados:** props `status`: `loading` (skeleton, sem números),
  `empty` (sem dados ≠ falha), `unavailable` (período indisponível),
  `error` (com `onRetry`); mês sem dados não parece falha; teste cobre cada
  estado.
- **06f — timezone do contrato:** prop `timeZone` preservada na exibição;
  nenhum `Date` local reinterpreta o período; teste cobra rótulo preservado.
- **06g — acessibilidade + regressão:** nome+papel em botões de navegação,
  datas com `selected`, paginação navegável por teclado/leitor; `test:unit`
  total + `tsc --noEmit` verdes.

## 5. Padrão de implementação (vale para todos os lotes)

- Props de entrada, callbacks de saída; nunca rede, storage ou cálculo local.
- TDD regra 4 de `.AIs/AGENTS.MD`: teste antes, RED confirmado, depois GREEN.
- Comentários em português no topo do arquivo e em cada função (regra 3).
- Visual via `theme` (`theme.colors/radii/spacing`), `AppCard`/`Feedback`/
  `AppSkeleton` quando aplicável; sem segunda identidade visual.
- Nomes e campos vindos dos contratos públicos (`Api/endpoints.md`),
  nunca do schema interno do banco (regra 5 do roadmap).
- Validação por lote em `services/mobile`: `npm.cmd run test:unit`
  + `npx.cmd tsc --noEmit` + `git diff --check`; rebuild/rerodar docker
  quando necessário (regras 4, 10).

## 6. Fora do escopo (explicitamente não fazer)

- Integração real com `/energy-summaries`, `/telemetry`, cookies, tokens.
- Cálculos de potência/energia/economia/tarifa; normalização temporal real.
- Persistência (AsyncStorage/SecureStore), sessão, autorização.
- Diagnóstico do veículo, login Google, recuperação de senha.
- Telas das Tasks 07–13; mudança de `TAB_ORDER` sem aprovação.

## 7. Integração esperada (futura, sem implementar agora)

- Consome resumos `DAY`/`MONTH` do backend (grupo "Energia, calendário e
  histórico" → Backend F01+F06, `mobile-roadmap/README.md`).
- Paginação, limites de intervalo e normalização temporal definidos pelo
  contrato; hoje apenas representados por props/fixtures.
- Backend em 26/09/2026 só tem `GET /health/live` e `GET /health/ready`
  implementados (`Api/endpoints.md`); resto é contrato aprovado futuro.

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Novos: `services/mobile/src/screens/HistoryScreen.tsx`,
  `services/mobile/src/screens/__tests__/HistoryScreen.test.tsx`,
  possível `services/mobile/src/components/HistoryList.tsx` + teste.
- Alterados sob aprovação: `services/mobile/src/navigation/*` (rota sem
  mudar estrutura), `.AIs/docs/plans/mobile-roadmap/README.md` (05→Concluída,
  06→Em andamento), `.AIs/docs/plans/mobile-roadmap/route-map.md`.
- Docs desta sessão: este plano + `.AIs/docs/contexts/Context_29_09_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. 06a scaffold + rota.
2. 06b calendário standalone.
3. 06c resumo do dia + acesso a testes.
4. 06d lista paginada.
5. 06e estados.
6. 06f timezone.
7. 06g acessibilidade + regressão.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. Pushs separam
features prontas. RDA sob pedido ou com ~10% de tokens (regra 9).
