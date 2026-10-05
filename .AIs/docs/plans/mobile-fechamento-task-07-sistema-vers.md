<!-- Plano de fechamento visual da Task 07 do mobile (Sistema VERS). -->

# Plano — Fechamento da Task 07 mobile (Sistema VERS)

## 1. Objetivo

Levar a Task 07 (`mobile-roadmap/07-tela-sistema-vers.md`) do estado
"Planejada" ao critério de saída — "o usuário entende qual montagem VERS
está associada ao veículo sem acessar dados operacionais restritos" —
usando somente estado visual local (props) e fixtures sintéticas. Nenhuma
integração real com backend faz parte deste plano.

Ponto de partida confirmado em 04/10/2026 a partir de `.AIs`: Tasks 00–06
`Concluída`, Task 05 corrigida para `Concluída` nesta sessão (código
05a–05h fechado em 28/09, 131 testes), Task 06 fechada em `Context_29_09_2026.md`
(06a–06g, 157 testes, merge #14 `078ed55`), Task 07 `Planejada` com
dependência visual da Task 04 (`mobile-roadmap/README.md`).

## 2. Fronteira com as Tasks 04–06 (não duplicar)

- A `HomeScreen` (`services/mobile/src/screens/HomeScreen.tsx`) já expõe o
  atalho `onOpenVersSystem` ("Abrir sistema VERS"); ele passa a abrir a
  nova tela, sem mudar seu visual.
- A aba `vers` (`services/mobile/src/navigation/tabs.ts`, `TAB_ORDER`) hoje
  cai no `HomeScreen` via `RootNavigator`; esta task liga a aba à nova
  tela, sem mudar `TAB_ORDER` nem `TAB_META`.
- Nada de energia/histórico (`BatteryScreen`/`HistoryScreen`) é duplicado
  aqui: só acesso visual a testes via callback `onOpenTests`.
- Nenhum cálculo, persistência, sessão, autorização ou regra de domínio no
  cliente (regras 2–3 do roadmap mobile).

## 3. Propostas a validar pelo programador (regra 11, sem decisão operacional)

- Tela standalone nova `VersSystemScreen`, em `ScreenShell` + `AppHeader`
  ("Sistema VERS"), com `BottomNavigation activeTab="vers"`.
- Dados por props + fixtures sintéticas até os contratos F01/F05 existirem
  no backend; datas UTC exibidas como vierem, sem conversão local.
- Mapeamento de contratos públicos (`Api/endpoints.md` +
  `packages/shared-types/src/installations.ts`): `Installation`
  (`systemModel`, `status`, `installedAt`, `activeDevice`), `Configuration`
  (`activePiezoCount`, `piezoAssociation`, `installationPoint`,
  `storageType`, `version`), `PublicDevice` (só `name`,
  `firmwareVersion`, `status`, `lastSeenAt`).
- Rota: aba `vers` no `RootNavigator` renderiza a nova tela; `HomeScreen`
  `onOpenVersSystem` navega para ela; sem pilha nova nem mudança de
  `tabs.ts`.
- Status públicos distintos: `ACTIVE`, `MAINTENANCE`, `INACTIVE`, `FAULT` e
  `indisponível`; dispositivo `PROVISIONING`/`ONLINE`/`OFFLINE`/`REVOKED`/
  `FAULT` só como selo textual.

## 4. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **07a — scaffold:** nova `VersSystemScreen` em `ScreenShell` + `AppHeader`
  com voltar opcional; rota na aba `vers` no `RootNavigator` sem mudar
  `TAB_ORDER`; `HomeScreen onOpenVersSystem` abre a tela; teste cobra
  título, aba ativa e vazio inicial.
- **07b — identificação da instalação:** props `installation` (`systemModel`,
  `status`, `installedAt` como rótulos crus); selo de status por texto
  (`Ativo`, `Em manutenção`, `Inativo`, `Falha`); teste cobre cada rótulo
  e ausência sem inventar valor.
- **07c — configuração ativa:** prop `configuration` (`activePiezoCount`,
  `piezoAssociation`, `installationPoint`, `storageType`, `version`/`name`);
  rótulos vindos do dicionário, sem conversão; ausente omite o bloco;
  teste cobre bloco exibido e omissão.
- **07d — dispositivo público:** prop `device` (`name`, `firmwareVersion`,
  `status`, `lastSeenAt` crus); nunca `deviceUid`, MQTT, tópicos ou série;
  `null` omite o bloco; teste cobra metadados e guarda anti-segredo.
- **07e — estados:** prop `status`: `loading` (skeleton, sem números),
  `empty`/`noInstallation` (sem instalação ≠ falha), `error` (com
  `onRetry`); `MAINTENANCE`/`FAULT` mantêm conteúdo com aviso; teste cobre
  cada estado.
- **07f — atalhos testes + revisão:** props `onOpenTests`/`onOpenSupport`;
  botões só quando o callback existe ("VER TESTES", "SOLICITAR REVISÃO");
  teste cobre callbacks e omissão.
- **07g — acessibilidade + regressão:** nome+papel em voltar, atalhos,
  paginação de config (se houver) e abas; `selected` na aba `vers`;
  `test:unit` total + `tsc --noEmit` verdes.

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

- Integração real com `/installations`, `/configurations`, cookies, tokens.
- Exibir ou manipular `deviceUid`, credenciais MQTT, tópicos, série.
- Cálculos de potência/energia/economia; normalização temporal real.
- Persistência (AsyncStorage/SecureStore), sessão, autorização.
- Diagnóstico do veículo, login Google, recuperação de senha.
- Telas das Tasks 08–13; mudança de `TAB_ORDER`/`TAB_META` sem aprovação.

## 7. Integração esperada (futura, sem implementar agora)

- Consome instalações, configurações e metadados públicos de dispositivos
  (grupo "Sistema VERS e testes" → Backend F01+F05,
  `mobile-roadmap/README.md`).
- Paginação de configurações e ordenação `version` desc definidas pelo
  contrato; hoje apenas representadas por props/fixtures.
- Backend em 26/09/2026 só tem `GET /health/live` e `GET /health/ready`
  implementados (`Api/endpoints.md`); resto é contrato aprovado futuro.

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Novos: `services/mobile/src/screens/VersSystemScreen.tsx`,
  `services/mobile/src/screens/__tests__/VersSystemScreen.test.tsx`,
  possível `services/mobile/src/components/VersStatusBadge.tsx` + teste.
- Alterados sob aprovação: `services/mobile/src/navigation/RootNavigator.tsx`
  (aba `vers`), `services/mobile/src/screens/HomeScreen.tsx` (ligar
  `onOpenVersSystem`, sem visual novo),
  `services/mobile/src/navigation/__tests__/RootNavigator.test.tsx`.
- Docs desta sessão: este plano + `.AIs/docs/contexts/Context_04_10_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. 07a scaffold + rota na aba `vers`.
2. 07b identificação da instalação.
3. 07c configuração ativa.
4. 07d dispositivo público.
5. 07e estados.
6. 07f atalhos testes + revisão.
7. 07g acessibilidade + regressão.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. Pushs separam
features prontas. RDA sob pedido ou com ~10% de tokens (regra 9).
