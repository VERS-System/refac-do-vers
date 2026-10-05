<!-- Plano de fechamento visual da Task 10 do mobile (Veículos). -->

# Plano — Fechamento da Task 10 mobile (Veículos)

## 1. Objetivo

Levar a Task 10 (`mobile-roadmap/10-telas-veiculos.md`) do estado
"Planejada" ao critério de saída — "o fluxo visual de veículos corresponde
integralmente ao contrato compartilhado" — usando somente estado visual
local (props) e fixtures sintéticas. Nenhuma integração real com backend faz
parte deste plano.

Ponto de partida confirmado em 05/10/2026 a partir de `.AIs`: Tasks 00–09
`Concluída` no código (01 `Implementada`), Task 10 `Planejada` com
dependência visual da Task 09 (`mobile-roadmap/README.md`). O atalho
`Meus veículos` existe na `ProfileScreen` mas sem destino (condicional, sem
callback na rota). Nenhuma tela de veículos existe em
`services/mobile/src/screens`.

## 2. Fronteira com as demais tasks (não duplicar)

- O Perfil (Task 09) segue dono da conta; aqui só lista, detalhes, cadastro,
  edição, principal e remoção de veículos.
- Testes e telemetria preservados após exclusão pertencem às Tasks 05–08;
  aqui só o snapshot visual indicado pelo contrato, sem placa reexposta.
- Nenhum cálculo, persistência, sessão, autorização, unicidade de placa ou
  regra de vínculo no cliente (regras 2–3 do roadmap mobile).
- Unicidade da placa, vínculo, principal automático, mutabilidade e remoção
  atômica pertencem ao backend; o mobile só solicita e representa.

## 3. Decisões do programador em 05/10/2026 (regra 11)

- Rota interna a partir do `Meus veículos` do Perfil (`isVehiclesVisible`
  no `RootNavigator`, padrão 08a), com 3 modos (lista → detalhe → form) e
  voltar por callback; sem mudar `TAB_ORDER` nem `TAB_META`.
- Formulário pelo **contrato puro**: `licensePlate`, `brand`, `model`,
  `modelYear`; placa obrigatória no cadastro e imutável na edição; **sem**
  CPF, CRLV, RENAVAM ou documentos (vale para o código; o texto do
  `features.md` segue mantido como histórico).
- Principal: selo `Principal` na lista + botão `Tornar principal` no
  detalhe (promove e rebaixa o anterior — transação do backend, aqui só
  solicitação).
- Remoção: confirmação inline + seletor do substituto (`replacementVehicleId`)
  quando o principal tem 2+ candidatos; regras de promoção automática só
  representadas.
- Lista mínima: placa + modelo + selo `Principal` quando aplicável (selo
  exigido pela task); sem selo de vínculo; botão `Cadastrar` no cabeçalho
  (necessário para o fluxo).
- Detalhe completo: placa, marca, modelo, ano, principal e vínculo
  (`OWNER`/`DRIVER`/`ADMIN` só como selo textual) + `Editar` e `Remover`.
- Conflitos com mensagens públicas específicas (`Placa já cadastrada`,
  validação) sem revelar dados de terceiros; ausente ou sem acesso vira
  `404` visual neutro.
- Marca/modelo/ano como texto livre; ano numérico sem validação de domínio
  (só repasse).

## 4. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **10a — scaffold:** nova `VehiclesScreen` em `ScreenShell` + `AppHeader`
  ("Veículos") com lista vazia; rota interna no `RootNavigator` ligada ao
  `onOpenVehicles` do Perfil; teste cobra título, vazio e voltar.
- **10b — listagem:** props `items`/`onSelectVehicle`/`onOpenCreate`; linhas
  com placa + modelo + selo `Principal`; botão `Cadastrar`; teste cobre
  selo, seleção e atalho.
- **10c — detalhes:** prop `selectedVehicle` (placa, marca, modelo, ano,
  principal, vínculo crus) + `onEditVehicle`/`onRemoveVehicle`/
  `onMakePrimary`; ausente mantém só a lista; teste cobre exibição, omissão
  e callbacks sem inventar campo.
- **10d — cadastro:** form com `licensePlate`/`brand`/`model`/`modelYear` +
  `onSubmitCreate`; só repasse dos 4 campos, sem CPF/docs; teste cobre
  preenchimento e envio.
- **10e — edição:** mesmos campos com placa travada (só leitura) +
  `onSubmitUpdate` (mutáveis); `isPrimary` só via `Tornar principal`;
  teste cobre placa imutável e envio restrito.
- **10f — principal e remoção:** confirmação inline de remoção +
  seletor de substituto (`replacementVehicleId`) quando exigido +
  mensagem de conflito `Placa já cadastrada`; teste cobre cada caminho sem
  presumir regra do backend.
- **10g — estados, conflitos e acessibilidade:** `loading` (skeleton),
  `empty` neutro com CTA, `error` com `onRetry`; nome+papel em lista,
  detalhes, form, confirmações, paginação e abas; `test:unit` total +
  `tsc --noEmit` verdes.

## 5. Padrão de implementação (vale para todos os lotes)

- Props de entrada, callbacks de saída; nunca rede, storage ou cálculo local.
- TDD regra 4 de `.AIs/AGENTS.MD`: teste antes, RED confirmado, depois GREEN.
- Comentários em português no topo do arquivo e em cada função (regra 3).
- Visual via `theme` (`theme.colors/radii/spacing`), `AppCard`/`Feedback`/
  `AppSkeleton`/`PrimaryButton`/`AuthTextField` quando aplicável; sem
  segunda identidade visual.
- Nomes e campos vindos dos contratos públicos (`Api/endpoints.md` +
  `packages/shared-types/src/vehicles.ts`), nunca do schema interno do
  banco (regra 5 do roadmap).
- Validação por lote em `services/mobile`: `npm.cmd run test:unit`
  + `npx.cmd tsc --noEmit` + `git diff --check`; rebuild/rerodar docker
  quando necessário (regras 4, 10).

## 6. Fora do escopo (explicitamente não fazer)

- Integração real com `/vehicles`, unicidade, vínculo, cookies, tokens.
- Promoção/remoção atômica, substituição automática ou qualquer regra de
  vínculo no cliente.
- Solicitar CPF, CRLV, RENAVAM, documentos ou upload.
- Persistência (AsyncStorage/SecureStore), sessão, autorização.
- Diagnóstico do veículo, login Google, recuperação de senha.
- Telas das Tasks 11–13; mudança de `TAB_ORDER`/`TAB_META` sem aprovação.

## 7. Integração esperada (futura, sem implementar agora)

- Consome `GET /vehicles`, `POST /vehicles`, `GET/PATCH/DELETE`
  `/vehicles/{id}` (grupo "Perfil e veículos" → Backend F01+F05,
  `mobile-roadmap/README.md`).
- Placa normalizada única e imutável, primeiro veículo principal
  automático, `replacementVehicleId` na remoção do principal com 2+
  candidatos — tudo definido pelo contrato; hoje só representado.
- Backend em 26/09/2026 só tem `GET /health/live` e `GET /health/ready`
  implementados (`Api/endpoints.md`); resto é contrato aprovado futuro.

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Novos: `services/mobile/src/screens/VehiclesScreen.tsx`,
  `services/mobile/src/screens/__tests__/VehiclesScreen.test.tsx`, possíveis
  `services/mobile/src/components/VehicleList.tsx` / `VehicleDetail.tsx` /
  `VehicleForm.tsx` + testes (só se a tela crescer demais).
- Alterados sob aprovação: `services/mobile/src/navigation/RootNavigator.tsx`
  (rota interna sem mudar estrutura),
  `services/mobile/src/screens/ProfileScreen.tsx` (só ligar `onOpenVehicles`,
  sem visual novo),
  `services/mobile/src/navigation/__tests__/RootNavigator.test.tsx`,
  `services/mobile/src/screens/__tests__/ProfileScreen.test.tsx` (se o
  atalho mudar).
- Docs desta sessão: este plano + `.AIs/docs/contexts/Context_05_10_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. 10a scaffold + rota interna.
2. 10b listagem.
3. 10c detalhes.
4. 10d cadastro.
5. 10e edição.
6. 10f principal e remoção.
7. 10g estados, conflitos e acessibilidade.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. Pushs separam
features prontas. RDA sob pedido ou com ~10% de tokens (regra 9).
