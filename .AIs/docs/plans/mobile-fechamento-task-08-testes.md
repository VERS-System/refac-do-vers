<!-- Plano de fechamento visual da Task 08 do mobile (Testes experimentais). -->

# Plano — Fechamento da Task 08 mobile (Testes experimentais)

## 1. Objetivo

Levar a Task 08 (`mobile-roadmap/08-telas-testes.md`) do estado
"Planejada" ao critério de saída — "o fluxo completo de telas existe sem
duplicar a máquina de estados do backend" — usando somente estado visual
local (props) e fixtures sintéticas. Nenhuma integração real com backend
faz parte deste plano.

Ponto de partida confirmado em 04/10/2026 a partir de `.AIs`: Tasks 00–07
`Concluída`, 01 `Implementada`, Task 08 `Planejada` com dependência visual
das Tasks 05 e 07 (`mobile-roadmap/README.md`). Atalhos `onOpenTests` já
existem na `HistoryScreen` e na `VersSystemScreen`, hoje sem destino.

## 2. Fronteira com as Tasks 05–07 (não duplicar)

- `BatteryScreen`/`HistoryScreen` seguem donas de energia e histórico; aqui
  só listagem, detalhes, planejamento e confirmações de testes.
- `VersSystemScreen` segue dona da montagem; aqui só o acesso visual via
  `onOpenTests`, sem reexibir instalação/config/device.
- Nenhum cálculo, transição local, persistência, sessão, autorização ou
  regra de domínio no cliente (regras 2–3 do roadmap mobile).
- Nenhum comando MQTT, nenhuma presunção de transição concluída; o mobile
  só solicita e representa o estado retornado.

## 3. Propostas a validar pelo programador (regra 11, sem decisão operacional)

- Tela standalone nova `TestsScreen`, em `ScreenShell` + `AppHeader`
  ("Testes"), com `BottomNavigation` herdando a aba de origem (bateria ou
  vers) sem criar aba nova.
- Rota interna no `RootNavigator` (`isTestsVisible`, como `isHistoryVisible`
  da 06a), aberta pelos `onOpenTests` existentes; sem mudar `TAB_ORDER` nem
  `TAB_META`.
- Dados por props + fixtures sintéticas até os contratos F01/F05 existirem;
  datas UTC e unidades exibidas como vierem, sem conversão nem cálculo.
- Mapeamento de contratos públicos (`Api/endpoints.md` +
  `packages/shared-types/src/tests.ts`): `TestRecord` (`id`, `name`,
  `status`, `terrain`, `snapshot`, `startedAt`/`endedAt`, médias, `outcome`,
  `notes`), `TestStatus` (`PLANNED`/`RUNNING`/`COMPLETED`/`FAILED`/
  `CANCELLED`), paginação `page`/`pageSize`/`totalItems` como no envelope.
- Ações por callbacks (`onPageChange`, `onSelectTest`, `onSubmitPlan`,
  `onStart`, `onFinish`, `onCancel`, `onRetry`); conflito `409`
  (`TEST_STATE_CONFLICT`) vira mensagem pública com o estado atual, sem
  lógica de concorrência no cliente.
- Execução exibe só `recentDataLabel` + `connectionLabel` crus por props,
  sem série bruta e sem comandar nada.

## 4. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **08a — scaffold:** nova `TestsScreen` em `ScreenShell` + `AppHeader`
  com voltar opcional; rota interna no `RootNavigator` ligada aos
  `onOpenTests` de Bateria/Histórico/VERS; teste cobra título, lista vazia
  inicial e voltar.
- **08b — listagem paginada:** props `items`/`page`/`pageSize`/`totalItems`/
  `onPageChange`/`onSelectTest`; cada linha com nome, status traduzido e
  período cru; teste cobre paginação visual e seleção por callback.
- **08c — filtros visuais:** props `statusFilter`/`installationFilter` +
  `onFilterChange`; só representam o filtro do contrato, sem filtrar local;
  teste cobre exibição e notificação.
- **08d — detalhes:** prop `selectedTest` (`TestRecord` parcial cru) com
  contexto, configuração (`snapshot`), período, status, qualidade/unidades
  e `outcome`/`notes`; ausente mantém só a lista; teste cobre exibição e
  omissão sem inventar campo.
- **08e — formulário de planejamento:** props `planDraft` + `onSubmitPlan`;
  campos `name`, `terrain` (opções do contrato), `testLocation`,
  `vehicleWeightKg`, `notes`; sem validação de domínio, só repasse;
  teste cobre preenchimento e envio.
- **08f — confirmações, execução e conflitos:** props `onStart`/`onFinish`/
  `onCancel`, `actionState` (`idle`/`confirming`/`conflict`/`unavailable`) e
  `recentDataLabel`/`connectionLabel`; confirmações antes de cada transição,
  conflito com mensagem pública e estado atual, ação indisponível
  desabilitada; teste cobre cada caminho sem presumir transição.
- **08g — acessibilidade + regressão:** nome+papel em lista, filtros,
  detalhes, formulário, confirmações, paginação e abas; `test:unit` total +
  `tsc --noEmit` verdes.

## 5. Padrão de implementação (vale para todos os lotes)

- Props de entrada, callbacks de saída; nunca rede, storage ou cálculo local.
- TDD regra 4 de `.AIs/AGENTS.MD`: teste antes, RED confirmado, depois GREEN.
- Comentários em português no topo do arquivo e em cada função (regra 3).
- Visual via `theme` (`theme.colors/radii/spacing`), `AppCard`/`Feedback`/
  `AppSkeleton`/`PrimaryButton` quando aplicável; sem segunda identidade.
- Nomes e campos vindos dos contratos públicos (`Api/endpoints.md`),
  nunca do schema interno do banco (regra 5 do roadmap).
- Validação por lote em `services/mobile`: `npm.cmd run test:unit`
  + `npx.cmd tsc --noEmit` + `git diff --check`; rebuild/rerodar docker
  quando necessário (regras 4, 10).

## 6. Fora do escopo (explicitamente não fazer)

- Integração real com `/tests`, `/telemetry`, cookies, tokens.
- Máquina de estados local, validação de transição, concorrência, autorização.
- Comandar MQTT ou interpretar série bruta; cálculos de médias/energia.
- Persistência (AsyncStorage/SecureStore), sessão, autorização.
- Diagnóstico do veículo, login Google, recuperação de senha.
- Telas das Tasks 09–13; mudança de `TAB_ORDER`/`TAB_META` sem aprovação.

## 7. Integração esperada (futura, sem implementar agora)

- Consome `GET /tests`, `POST /tests`, `GET /tests/{id}`, `start`/`finish`/
  `cancel` e telemetria/resumos do teste (grupo "Sistema VERS e testes" →
  Backend F01+F05, `mobile-roadmap/README.md`).
- Filtros, paginação, ordenação `createdAt` desc e janela UTC definidos pelo
  contrato; hoje apenas representados por props/fixtures.
- Backend em 26/09/2026 só tem `GET /health/live` e `GET /health/ready`
  implementados (`Api/endpoints.md`); resto é contrato aprovado futuro.

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Novos: `services/mobile/src/screens/TestsScreen.tsx`,
  `services/mobile/src/screens/__tests__/TestsScreen.test.tsx`, possíveis
  `services/mobile/src/components/TestList.tsx` / `TestDetail.tsx` /
  `TestPlanForm.tsx` + testes (só se o arquivo da tela crescer demais).
- Alterados sob aprovação: `services/mobile/src/navigation/RootNavigator.tsx`
  (rota interna sem mudar estrutura),
  `services/mobile/src/screens/BatteryScreen.tsx`,
  `services/mobile/src/screens/HistoryScreen.tsx`,
  `services/mobile/src/screens/VersSystemScreen.tsx` (só ligar `onOpenTests`,
  sem visual novo),
  `services/mobile/src/navigation/__tests__/RootNavigator.test.tsx`.
- Docs desta sessão: este plano + `.AIs/docs/contexts/Context_04_10_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. 08a scaffold + rota interna.
2. 08b listagem paginada.
3. 08c filtros visuais.
4. 08d detalhes.
5. 08e formulário de planejamento.
6. 08f confirmações, execução e conflitos.
7. 08g acessibilidade + regressão.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. Pushs separam
features prontas. RDA sob pedido ou com ~10% de tokens (regra 9).
