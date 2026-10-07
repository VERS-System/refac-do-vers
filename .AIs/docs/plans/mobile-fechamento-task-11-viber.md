<!-- Plano de fechamento visual da Task 11 do mobile (Viber). -->

# Plano — Fechamento da Task 11 mobile (Viber)

## 1. Objetivo

Levar a Task 11 (`mobile-roadmap/11-tela-viber.md`) do estado
"Planejada" ao critério de saída — "a interface está pronta para o
contrato aprovado do Viber, sem antecipar sua lógica ou persistência" —
usando somente estado visual local (props) e fixtures sintéticas. Nenhuma
integração real com backend/ai-service faz parte deste plano.

Ponto de partida confirmado em 07/10/2026 a partir de `.AIs`: Tasks 00–10
`Concluída` no código, Task 11 `Planejada` com dependência visual da
Task 04 (`mobile-roadmap/README.md`). A `HomeScreen` já expõe
`onOpenViber` ("Conversar com o Viber", sem atalho de diagnóstico), mas o
`RootNavigator` não a liga a nenhuma rota. Nenhuma tela de conversa
existe em `services/mobile/src/screens`. O contrato do Viber é futuro
(sem seção em `Api/endpoints.md`); o mobile representa com tipos visuais
locais, sem montar prompts nem acessar dados brutos.

## 2. Fronteira com as demais tasks (não duplicar)

- A Home (Task 04) segue dona do atalho; aqui só conversa, composição,
  avisos e estados visuais.
- Energia, calendário e testes (Tasks 05–08) seguem donos das medições;
  aqui só selo textual e período de referência informados por props.
- Nenhum prompt, seleção de dados, minimização, persistência, chave ou
  chamada de IA no cliente (regras 2–3 do roadmap mobile + Task 11).
- Sem apresentar histórico como tempo real nem simulado como real.

## 3. Decisões do programador em 07/10/2026 (regra 11)

- Rota interna a partir do `Conversar com o Viber` da Home
  (`isViberVisible` no `RootNavigator`, padrão 08a/10a), com voltar por
  callback; sem mudar `TAB_ORDER` nem `TAB_META`.
- Tela cheia de conversa (histórico + composição + envio), bolhas estilo
  iMessage do mockup (cinza Viber, dourada usuário); bolha flutuante
  global fica fora desta task.
- Mensagem visual local: `role` (`user`/`viber`) + texto cru + `kind`
  (`measurement`/`explanation`/`inference`/`recommendation`) com selo
  visível em inferência/recomendação + período de referência cru quando
  informado; resposta de histórico nunca com aparência de tempo real.
- Atalhos `Battery usage` e `Money economy` como chips que só preenchem o
  rascunho (sem navegar, sem buscar dados); seletor de contexto só entre
  recursos autorizados fornecidos por props.
- Rascunho preservado em falha ou indisponibilidade; mensagens longas,
  links permitidos e teclado móvel tratados como layout.

## 4. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **11a — scaffold:** nova `ViberScreen` em `ScreenShell` + `AppHeader`
  ("Viber") com conversa vazia; rota interna no `RootNavigator` ligada ao
  `onOpenViber` da Home; teste cobra título, vazio e voltar.
- **11b — histórico:** props `messages` (`id`/`role`/`text` crus) +
  identificação acessível de usuário vs Viber; sem messages mantém o
  vazio; teste cobre ordem, papéis e omissão.
- **11c — composição:** props `draft`/`onDraftChange`/`onSend` com campo e
  `ENVIAR`; só repasse do texto, sem validação; rascunho interno sem
  props para não travar a rota; teste cobre digitação e envio.
- **11d — selos e referência:** prop `kind` por mensagem + `referenceLabel`
  cru; inferência/recomendação com aviso visível; medição sem selo de
  gerado; teste cobre cada selo sem inventar dado.
- **11e — atalhos e contexto:** chips `Battery usage`/`Money economy`
  preenchendo o rascunho + props `contexts`/`contextId`/`onContextChange`
  (só entre os fornecidos); teste cobre preenchimento e seleção.
- **11f — estados e falha:** props `status` (`idle`/`sending`/`error`/
  `unavailable`/`empty`) + `onRetry`; erro/indisponível sem apagar o
  digitado; teste cobre cada estado com rascunho preservado.
- **11g — acessibilidade e layout:** nome+papel em histórico, composição,
  chips, contexto, erro e abas; mensagens longas sem estourar, links como
  texto permitido, teclado sem cobrir o campo; `test:unit` total +
  `tsc --noEmit` verdes.

## 5. Padrão de implementação (vale para todos os lotes)

- Props de entrada, callbacks de saída; nunca rede, storage, cálculo
  local ou lógica de IA.
- TDD regra 4 de `.AIs/AGENTS.MD`: teste antes, RED confirmado, depois
  GREEN.
- Comentários em português no topo do arquivo e em cada função (regra 3).
- Visual via `theme` (`theme.colors/radii/spacing`), `AppCard`/`Feedback`/
  `AppSkeleton`/`PrimaryButton`/`AuthTextField` quando aplicável; bolhas
  com as cores do mockup (cinza Viber, dourada usuário); sem segunda
  identidade visual.
- Nomes e campos vindos dos contratos públicos quando existirem; tipos de
  mensagem do Viber como tipos visuais locais até o contrato do
  ai-service ser aprovado (regra 5 do roadmap).
- Validação por lote em `services/mobile`: `npm.cmd run test:unit`
  + `npx.cmd tsc --noEmit` + `git diff --check`; rebuild/rerodar docker
  quando necessário (regras 4, 10).

## 6. Fora do escopo (explicitamente não fazer)

- Integração real com backend/ai-service, prompts, streaming, tokens,
  chaves OpenAI, persistência de conversa.
- Cálculos energéticos, busca de dados brutos ou aparência de tempo real.
- Bolha flutuante global, nova aba `TAB_ORDER`/`TAB_META`, login Google,
  recuperação de senha, diagnóstico do veículo.
- Telas das Tasks 12–13; mudança de estrutura de navegação sem aprovação.

## 7. Integração esperada (futura, sem implementar agora)

- Consome contrato futuro do backend/ai-service (grupo "Viber" →
  contrato futuro do serviço de IA, `mobile-roadmap/README.md`); hoje só
  representado com fixtures sintéticas marcadas como amostra.
- Estados de indisponibilidade, renovação de sessão e reconexão refletirão
  o informado pelas camadas de integração quando existirem.

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Novos: `services/mobile/src/screens/ViberScreen.tsx`,
  `services/mobile/src/screens/__tests__/ViberScreen.test.tsx`, possíveis
  `services/mobile/src/components/ViberMessage.tsx` /
  `ViberComposer.tsx` + testes (só se a tela crescer demais).
- Alterados sob aprovação: `services/mobile/src/navigation/RootNavigator.tsx`
  (rota interna sem mudar estrutura),
  `services/mobile/src/navigation/__tests__/RootNavigator.test.tsx`
  (Home→Viber e volta; `HomeScreen`/`HomeScreen.test.tsx` só se o atalho
  mudar — hoje já existe `onOpenViber`).
- Docs desta sessão: este plano + `.AIs/docs/contexts/Context_07_10_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. 11a scaffold + rota interna.
2. 11b histórico.
3. 11c composição.
4. 11d selos e referência.
5. 11e atalhos e contexto.
6. 11f estados e falha.
7. 11g acessibilidade e layout.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. Pushs separam
features prontas. RDA sob pedido ou com ~10% de tokens (regra 9).
