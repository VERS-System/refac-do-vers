<!-- Plano de fechamento visual da Task 09 do mobile (Perfil). -->

# Plano — Fechamento da Task 09 mobile (Perfil)

## 1. Objetivo

Levar a Task 09 (`mobile-roadmap/09-tela-perfil.md`) do estado
"Planejada" ao critério de saída — "o usuário visualiza e atualiza o
perfil permitido com estados claros" — usando somente estado visual local
(props) e fixtures sintéticas. Nenhuma integração real com backend faz
parte deste plano.

Ponto de partida confirmado em 04/10/2026 a partir de `.AIs`: Tasks 00–08
`Concluída` no código (08 código fechado, roadmap a atualizar), Task 09
`Planejada` com dependência visual da Task 04 (`mobile-roadmap/README.md`).
A aba `profile` (`TAB_ORDER`) hoje cai no `HomeScreen` via `RootNavigator`;
nenhuma `ProfileScreen` existe em `services/mobile/src/screens`.

## 2. Fronteira com as demais tasks (não duplicar)

- Energia, histórico, sistema VERS e testes seguem donos das Tasks 05–08;
  aqui só dados da conta e acessos.
- Veículos (Task 10) e suporte/revisão (Task 11) ainda não existem: os
  atalhos são condicionais (só com callback), no padrão 07f/08a.
- Nenhum cálculo, persistência, sessão, autorização, papéis ou regra de
  domínio no cliente (regras 2–3 do roadmap mobile).
- O encerramento efetivo da sessão, papéis e permissões pertencem ao
  backend; o mobile só solicita e representa.

## 3. Decisões do programador em 04/10/2026 (regra 11)

- Campos exibidos: `displayName`, `email`, `avatarUrl` — sem selo
  administrativo, sem status, sem datas, mesmo que o backend retorne.
- Layout: topo com avatar + nome, bloco de dados, atalhos
  (`Meus veículos`, `Ajuda e suporte`), `Sair` no fim.
- Avatar **só leitura**: foto do backend ou iniciais sobre fundo neutro;
  sem campo de link e sem upload no app. Upload real depende de endpoint
  inexistente no contrato — futuro, fora do MVP.
- Fotos para demonstração: via fixtures/props (dev-only, documentado como
  não-produção); nenhum caminho de demo sobe para produção.
- Nome vazio: `Sem nome definido` (neutro, sem parecer falha).
- Logout: só `Sair` (`POST /auth/logout`), com confirmação **inline**
  (`Deseja sair?` + `Sair`/`Cancelar`). `logout-all` fora do MVP.
- Expiração: padrão da Task 02 (aviso informativo + retorno ao Login).
- Rota: ligar a aba `profile` à nova tela sem mudar `TAB_ORDER` nem
  `TAB_META` (padrão 07a).
- Edição: botão `Editar` abre modo com `Salvar`/`Cancelar`; sucesso volta
  sozinho à leitura; erro mantém o digitado com nova tentativa. Só
  `displayName` é enviado (único campo editável na UI); email e avatar não
  são editáveis.
- Estados: padrão das telas (`loading` com skeleton, vazio neutro, erro
  com tentar de novo).
- Mockup mantido (`features.md` com CPF/documento do carro) por decisão
  explícita, com divergência registrada: o contrato (`Api/endpoints.md`) e
  a Task 10 **vetam** CPF/CRLV/RENAVAM/docs. Reconciliar na Task 10 antes
  de codar o form de veículos.

## 4. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **09a — scaffold:** nova `ProfileScreen` em `ScreenShell` + `AppHeader`
  ("Perfil"), rota na aba `profile` no `RootNavigator` sem mudar
  `TAB_ORDER`; teste cobra título, aba ativa e vazio inicial.
- **09b — dados em leitura:** props `profile` (`displayName`, `email`,
  `avatarUrl` crus); avatar ou iniciais, `Sem nome definido` quando vazio;
  teste cobre cada linha e omissão sem inventar valor.
- **09c — edição:** props `editing`/`onEdit`/`onCancelEdit`/`onSave` com
  rascunho do nome; `Salvar` repassa só `displayName`; sucesso volta à
  leitura; erro mantém o digitado; teste cobre cada caminho sem validar
  domínio.
- **09d — estados:** prop `status` (`loading`/`success`/`empty`/`error`/
  `sessionExpired`) + `onRetry`/`onOpenLogin`; `loading` com `AppSkeleton`
  sem dados; `sessionExpired` no padrão da Task 02; teste cobre cada estado.
- **09e — atalhos:** props `onOpenVehicles`/`onOpenSupport`; botões
  `Meus veículos` e `Ajuda e suporte` só com callback; teste cobre
  callbacks e omissão.
- **09f — sair:** props `confirmingLogout`/`onRequestLogout`/
  `onConfirmLogout`/`onCancelLogout`; confirmação inline
  (`Deseja sair?` + `Sair`/`Cancelar`); teste cobre fluxo sem encerrar nada
  localmente.
- **09g — acessibilidade + regressão:** nome+papel em editar, salvar,
  cancelar, atalhos, sair e abas; `selected` na aba `profile`; `test:unit`
  total + `tsc --noEmit` verdes.

## 5. Padrão de implementação (vale para todos os lotes)

- Props de entrada, callbacks de saída; nunca rede, storage ou cálculo local.
- TDD regra 4 de `.AIs/AGENTS.MD`: teste antes, RED confirmado, depois GREEN.
- Comentários em português no topo do arquivo e em cada função (regra 3).
- Visual via `theme` (`theme.colors/radii/spacing`), `AppCard`/`Feedback`/
  `AppSkeleton`/`PrimaryButton`/`AuthTextField` quando aplicável; sem
  segunda identidade visual.
- Nomes e campos vindos dos contratos públicos (`Api/endpoints.md` +
  `packages/shared-types/src/users.ts`), nunca do schema interno do banco
  (regra 5 do roadmap).
- Validação por lote em `services/mobile`: `npm.cmd run test:unit`
  + `npx.cmd tsc --noEmit` + `git diff --check`; rebuild/rerodar docker
  quando necessário (regras 4, 10).

## 6. Fora do escopo (explicitamente não fazer)

- Integração real com `/users/me`, `/auth/logout`, cookies, tokens.
- Exibir ou inferir papéis, permissões, status ou datas da conta.
- Edição de email, avatar por link/upload, ou qualquer campo fora de
  `displayName` na UI.
- `logout-all`, recuperação de senha, login Google.
- Diagnóstico do veículo; solicitar CPF, CRLV, RENAVAM ou documentos.
- Telas das Tasks 10–13; mudança de `TAB_ORDER`/`TAB_META` sem aprovação.

## 7. Integração esperada (futura, sem implementar agora)

- Consome `GET /users/me`, `PATCH /users/me` (só `displayName` da UI) e
  `POST /auth/logout` (grupo "Perfil e veículos" → Backend F01+F05,
  `mobile-roadmap/README.md`).
- Allowlist do contrato: campos extras nunca enviados; resto é decisão do
  backend.
- Backend em 26/09/2026 só tem `GET /health/live` e `GET /health/ready`
  implementados (`Api/endpoints.md`); resto é contrato aprovado futuro.

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Novos: `services/mobile/src/screens/ProfileScreen.tsx`,
  `services/mobile/src/screens/__tests__/ProfileScreen.test.tsx`.
- Alterados sob aprovação: `services/mobile/src/navigation/RootNavigator.tsx`
  (aba `profile`), `services/mobile/src/navigation/__tests__/RootNavigator.test.tsx`.
- Docs desta sessão: este plano + `.AIs/docs/contexts/Context_04_10_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. 09a scaffold + rota na aba `profile`.
2. 09b dados em leitura.
3. 09c edição.
4. 09d estados.
5. 09e atalhos.
6. 09f sair.
7. 09g acessibilidade + regressão.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. Pushs separam
features prontas. RDA sob pedido ou com ~10% de tokens (regra 9).
