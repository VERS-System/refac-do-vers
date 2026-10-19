<!-- Plano de fechamento visual da Task 12 do mobile (Suporte e revisão). -->

# Plano — Fechamento da Task 12 mobile (Suporte e revisão)

## 1. Objetivo

Levar a Task 12 (`mobile-roadmap/12-telas-suporte-revisao.md`) do estado
"Planejada" ao critério de saída — "o usuário consegue solicitar e
acompanhar revisão sem canais paralelos na UI" — usando somente estado
visual local (props) e fixtures sintéticas. Nenhuma integração real com o
backend faz parte deste plano (decisão do programador em 16/10/2026: fechar
o MVP visual primeiro, integração em fase futura dedicada).

Ponto de partida confirmado em 16/10/2026 a partir de `.AIs`: Tasks 00–11
`Concluída` no código, Task 12 `Planejada` com dependência visual das
Tasks 07 e 09 (`mobile-roadmap/README.md`). A `ProfileScreen` já expõe
`onOpenSupport` ("AJUDA E SUPORTE") e a `VersSystemScreen` já expõe
`onOpenSupport` ("SOLICITAR REVISÃO"), ambas com teste, mas o
`RootNavigator` não liga nenhum dos dois a rota (só tem `isVehiclesVisible`
e `isViberVisible`). Nenhuma tela de suporte existe em
`services/mobile/src/screens`. O contrato de suporte existe e está
implementado no backend (F05 lote 7: `GET/POST /support-requests`,
`GET /support-requests/{id}` em `Api/endpoints.md` + `openapi.yaml`;
tipos em `packages/shared-types/src/support.ts`); o mobile apenas espelha
seus campos/status, sem sessão, cookies, CSRF ou HTTP.

## 2. Fronteira com as demais tasks (não duplicar)

- O Perfil (Task 09) e o Sistema VERS (Task 07) seguem donos dos atalhos;
  aqui só lista, detalhes, formulário, confirmação e estados visuais.
- Veículos e instalações (Tasks 07/10) seguem donos dos seus dados; aqui só
  seleção entre opções fornecidas por props, sem cadastrar veículo.
- Nenhuma validação de domínio, autorização, vínculo, unicidade, transição
  de status, persistência, sessão ou regra de filtro no cliente (regras 2–3
  do roadmap mobile).
- Unicidade, vínculo conta/veículo/instalação, filtro de solicitante,
  paginação do servidor e transições de estado pertencem ao backend; o
  mobile só solicita e representa.
- Sem apresentar fixture como dado real nem histórico como tempo real.

## 3. Decisões do programador em 16/10/2026 (regra 11)

- Rota interna a partir dos dois atalhos existentes (`isSupportVisible` no
  `RootNavigator`, padrão 08a/10a/11a), com voltar por callback; sem mudar
  `TAB_ORDER` nem `TAB_META`.
- Estrutura em 3 modos internos (lista → detalhe → form), padrão da
  Task 10, com voltar por callback entre modos.
- Formulário pelo **contrato puro**: `vehicleId` (obrigatório),
  `installationId` (opcional) e `reason` (texto até 1000); só repasse, sem
  CPF, CRLV, RENAVAM, placa digitável, documentos ou upload; aviso visível
  de que documentos e anexos não fazem parte do fluxo inicial; confirmação
  inline antes do envio.
- Status com os valores do contrato (`OPEN`, `IN_REVIEW`, `SCHEDULED`,
  `RESOLVED`, `CANCELLED`) e textos PT mapeados; referências a veículo ou
  instalação podem ser `null` (histórico preservado após exclusão).

## 4. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **12a — scaffold:** nova `SupportScreen` em `ScreenShell` + `AppHeader`
  ("Suporte") com lista vazia; rota interna `isSupportVisible` no
  `RootNavigator` ligada aos dois `onOpenSupport` (Perfil e Sistema VERS);
  teste cobra título, vazio e voltar.
- **12b — listagem:** props `items` (`id`/`status`/`createdAt` crus) +
  `onSelectRequest`; linhas com selo textual de status; ausente ou vazio
  mantém o vazio neutro com CTA; teste cobre selo, seleção e omissão.
- **12c — detalhes:** prop `selectedRequest` (`id`, `vehicleId`,
  `installationId`, `reason`, `status`, `createdAt`, `updatedAt` crus) +
  voltar à lista; `vehicleId`/`installationId` `null` representados como
  histórico sem reexpor identificadores; ausente mantém só a lista; teste
  cobre exibição, nulos e omissão sem inventar campo.
- **12d — formulário:** campos `vehicleId`/`installationId` (seleção só
  entre opções fornecidas por props) + `reason` + `onSubmitCreate`; só
  repasse dos 3 campos, sem documentos; teste cobre preenchimento e envio.
- **12e — confirmação e envio:** confirmação inline antes do envio
  (confirmar/cancelar) + estado de envio concluído; falha ou
  indisponibilidade sem apagar o digitado; teste cobre cada caminho.
- **12f — estados e erros:** props `status` (`loading`/`empty`/`error`/
  `sending`/`success`) + `onRetry`; `loading` com skeleton, `error` com
  `TENTAR NOVAMENTE`; ausente ou sem acesso vira `404` visual neutro;
  motivo inválido vira erro genérico sem ecoar o conteúdo; teste cobre cada
  estado com rascunho preservado.
- **12g — acessibilidade e layout:** nome+papel em lista, detalhes, form,
  confirmações, erro e abas; foco e alvos de toque; `test:unit` total +
  `tsc --noEmit` verdes.

## 5. Padrão de implementação (vale para todos os lotes)

- Props de entrada, callbacks de saída; nunca rede, storage, cálculo local
  ou lógica de domínio.
- TDD regra 4 de `.AIs/AGENTS.MD`: teste antes, RED confirmado, depois
  GREEN.
- Comentários em português no topo do arquivo e em cada função (regra 3).
- Visual via `theme` (`theme.colors/radii/spacing`), `AppCard`/`Feedback`/
  `AppSkeleton`/`PrimaryButton`/`AuthTextField` quando aplicável; sem
  segunda identidade visual.
- Nomes e campos vindos dos contratos públicos (`Api/endpoints.md` +
  `packages/shared-types/src/support.ts`), nunca do schema interno do
  banco (regra 5 do roadmap).
- Fixtures sintéticas marcadas como amostra; nunca apresentar simulado
  como real.
- Validação por lote em `services/mobile`: `npm.cmd run test:unit`
  + `npx.cmd tsc --noEmit` + `git diff --check`; rebuild/rerodar docker
  quando necessário (regras 4, 10).

## 6. Fora do escopo (explicitamente não fazer)

- Integração real com `/support-requests` (HTTP, sessão, cookies, tokens,
  CSRF/`Origin`, refresh, logout real).
- Transição de status, paginação do servidor, autorização, vínculo ou
  qualquer regra de domínio no cliente.
- Solicitar CPF, CRLV, RENAVAM, placa digitável, documentos, upload ou
  anexos.
- Persistência (AsyncStorage/SecureStore), sessão, autorização.
- Diagnóstico do veículo, login Google, recuperação de senha.
- Telas da Task 13; mudança de `TAB_ORDER`/`TAB_META` sem aprovação.

## 7. Integração esperada (futura, sem implementar agora)

- Consome `GET /support-requests`, `POST /support-requests`,
  `GET /support-requests/{id}` (grupo "Suporte" → Backend F01+F05,
  `mobile-roadmap/README.md`).
- Solicitante, `status`, `createdAt`/`updatedAt` definidos pelo servidor;
  `installationId` opcional compatível com o veículo; transições de estado
  por operação futura — tudo definido pelo contrato; hoje só representado.
- Estados de indisponibilidade, renovação de sessão e reconexão refletirão
  o informado pelas camadas de integração quando existirem (fase de
  integração pós-MVP visual).

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Novos: `services/mobile/src/screens/SupportScreen.tsx`,
  `services/mobile/src/screens/__tests__/SupportScreen.test.tsx`, possíveis
  `services/mobile/src/components/SupportList.tsx` / `SupportDetail.tsx` /
  `SupportForm.tsx` + testes (só se a tela crescer demais).
- Alterados sob aprovação: `services/mobile/src/navigation/RootNavigator.tsx`
  (rota interna `isSupportVisible` sem mudar estrutura),
  `services/mobile/src/navigation/__tests__/RootNavigator.test.tsx`
  (Perfil→Suporte, Sistema VERS→Suporte e volta; `ProfileScreen`/
  `VersSystemScreen` e seus testes só se o atalho mudar — hoje já existe
  `onOpenSupport` nos dois).
- Docs desta sessão: este plano + `.AIs/docs/contexts/Context_16_10_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. 12a scaffold + rota interna.
2. 12b listagem.
3. 12c detalhes.
4. 12d formulário.
5. 12e confirmação e envio.
6. 12f estados e erros.
7. 12g acessibilidade e layout.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. Pushs separam
features prontas. RDA sob pedido ou com ~10% de tokens (regra 9).
