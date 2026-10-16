<!-- Plano de reestilização da tela de Perfil conforme fotoConfig.png. -->

# Plano — Reestilização do Perfil (referência `fotoConfig.png`)

## 1. Objetivo

Reestilizar a `ProfileScreen` (Task 09, já `Concluída`) ao modelo de design
de `services/mobile/src/assets/fotoConfig.png`, sem mudar contratos,
rotas, regras ou lógica: só layout, selo, avatar, seções em texto e Sair
vermelho. Nenhuma integração com backend faz parte deste plano.

## 2. Leitura da referência (16/10/2026)

- Fundo preto, layout centralizado, sem barra de título "Perfil".
- Topo à esquerda, pequeno em dourado: "Área do administrador".
- Avatar em foto circular (~100px) com anel dourado; nome em dourado abaixo.
- Divisor, seção "Carro" (dourado, centralizada): itens em texto dourado
  "Informações do carro", "Informações de energia".
- Divisor, seção "Usuário": itens "Informações do usuário", "Perfil".
- BottomNavigation em pílula (já existente, sem mexer).

## 3. Decisões do programador em 16/10/2026 (regra 11)

- "Informações do carro" → rota interna de Veículos (`onOpenVehicles`);
  "Informações de energia" → aba Sistema VERS (novo `onOpenEnergy` que
  troca a aba, sem rota nova).
- Seção Usuário com **outros itens**: "Editar informações de usuário"
  (abre o modo de edição existente) e "Sair" (vermelho `error`, confirmação
  existente).
- Selo "Área do administrador" por prop `isAdmin` (omitido sem ela);
  saída com confirmação mantida.
- Avatar circular maior (~100px) com anel dourado, mantendo foto/inicial
  atuais e seus `testID`s.

## 4. Chamadas de julgamento da IA (valem se o plano for aprovado)

- Botão "AJUDA E SUPORTE" sai do Perfil (fora da referência; suporte segue
  alcançável pela aba Sistema VERS) — prop `onOpenSupport` removida da tela
  e do `RootNavigator`; teste de rota Perfil→Suporte removido.
- Linha de email sai do cartão (fora da referência); testes ajustados.
- Título "Perfil" do `AppHeader` sai com o cabeçalho; teste do título
  atualizado. Nome acessível "Sair" mantido no botão vermelho.

## 5. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **R1 — selo, avatar e nome:** remove `AppHeader`; selo
  `Área do administrador` por `isAdmin`; avatar 100px com anel dourado +
  nome em dourado (foto/inicial preservadas); teste cobre selo, omissão,
  avatar e nome.
- **R2 — seções e navegação:** divisores + "Carro" (itens em texto:
  `Informações do carro`→`onOpenVehicles`, `Informações de energia`→
  `onOpenEnergy`) e "Usuário" (`Editar informações de usuário`→edição);
  remove botões antigos e `onOpenSupport`; `RootNavigator` ganha
  `onOpenEnergy` (troca para aba `vers`); testes de tela e de rota
  atualizados.
- **R3 — Sair e edição:** item "Sair" em vermelho (`error`) com a
  confirmação existente; modo de edição (campo + SALVAR/CANCELAR) ajustado
  ao layout; teste cobre saída, confirmação e edição.
- **R4 — acessibilidade e fechamento:** nome+papel, `hitSlop`, foco;
  `test:unit` total + `tsc --noEmit` verdes; sem mudança no roadmap
  (Task 09 segue `Concluída`).

## 6. Padrão (vale para todos os lotes)

- Props de entrada, callbacks de saída; nunca rede, storage ou regra local.
- TDD regra 4 de `.AIs/AGENTS.MD`: teste antes, RED confirmado, depois
  GREEN (testes antigos impactados são atualizados no próprio lote).
- Comentários em português no topo e nas funções (regra 3); visual via
  `theme`, sem segunda identidade.
- Validação por lote: `npm.cmd run test:unit` + `npx.cmd tsc --noEmit` +
  `git diff --check`.

## 7. Fora do escopo (explicitamente não fazer)

- Novas telas/rotas ("Informações" dedicadas), mudança de `TAB_ORDER`.
- Regras de admin, sessão, logout real ou qualquer lógica de domínio.
- Login Google, integração com backend, alteração em outras telas.

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Alterados sob aprovação: `services/mobile/src/screens/ProfileScreen.tsx`,
  `services/mobile/src/screens/__tests__/ProfileScreen.test.tsx`,
  `services/mobile/src/navigation/RootNavigator.tsx` (`onOpenEnergy`, sai
  `onOpenSupport` do Perfil),
  `services/mobile/src/navigation/__tests__/RootNavigator.test.tsx`
  (nomes de rota novos; sai o teste Perfil→Suporte).
- Docs: este plano + `.AIs/docs/contexts/Context_16_10_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. R1 selo, avatar e nome.
2. R2 seções e navegação.
3. R3 Sair e edição.
4. R4 acessibilidade e fechamento.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. RDA sob
pedido ou com ~10% de tokens (regra 9).
