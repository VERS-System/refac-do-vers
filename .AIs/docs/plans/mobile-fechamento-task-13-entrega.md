<!-- Plano de fechamento visual da Task 13 do mobile (Estados globais e entrega). -->

# Plano — Fechamento da Task 13 mobile (Estados globais e entrega)

## 1. Objetivo

Levar a Task 13 (`mobile-roadmap/13-estados-globais-entrega.md`) do estado
"Planejada" ao critério de saída — "o aplicativo possui todas as telas
planejadas, consistentes e prontas para consumir os contratos do backend
sem duplicar suas responsabilidades" — revisando o conjunto das 12 telas
como uma experiência coerente. Nenhuma integração real com o backend faz
parte deste plano (decisão do programador em 16/10/2026: fechar o MVP
visual primeiro, integração em fase futura dedicada).

Ponto de partida confirmado em 16/10/2026 a partir de `.AIs` e de grep em
`services/mobile/src`: Tasks 00–12 `Concluída` no código (33 suítes,
**305 testes**). Gaps levantados: `sessionExpired` só em Login e Perfil;
`unavailable` em Login/History/Viber/Testes (ação); Suporte e Veículos sem
indisponível/expirada/offline; selo "dados de amostra" só na Home (demais
telas só comentam fixtures no código); sem padrão global de offline,
expirada ou reconexão — cada tela ad hoc; `responsiveness.test.tsx` cobre
só Home/Login/Splash em 320px; sem README de execução/builds do mobile.

## 2. Fronteira com as demais tasks (não duplicar)

- Nenhuma tela nova e nenhuma mudança de navegação (`TAB_ORDER`,
  `TAB_META`, rotas internas seguem intactas).
- Nenhuma regra de autorização, cálculo, persistência, sessão real,
  renovação de token ou reconexão automática no cliente (regras 2–3 do
  roadmap mobile); estados só representam o informado por props.
- Nenhuma integração HTTP; fixtures seguem sintéticas e marcadas.
- Cada lote mantém `test:unit` + `tsc --noEmit` verdes antes e depois.

## 3. Decisões do programador em 16/10/2026 (regra 11)

- Escopo: revisão completa em lotes por frente (não só gaps nem só
  validação).
- Validação em aparelho/emulador (Android/iOS, dimensões representativas)
  executada pelo programador a partir de checklist preparado pela IA.
- Plano com lotes TDD pequenos (13a–13g, um commit pequeno por lote feito
  pelo programador).

## 4. Lotes TDD (RED→GREEN, um por commit pequeno do programador)

- **13a — indisponibilidade:** cobrir `unavailable`/offline onde falta
  (Suporte, Veículos e demais aplicáveis), no padrão de History/Viber
  (texto neutro + sem apagar contexto); teste cobre cada tela tocada.
- **13b — sessão expirada:** cobrir `sessionExpired` onde aplicável além de
  Login/Perfil (retorno ao login por callback, sem decidir sessão);
  teste cobre cada tela tocada.
- **13c — selo de amostra:** estender o selo "dados de amostra" da Home às
  telas com fixtures (Bateria, Calendário/Histórico, Testes, Sistema VERS,
  Viber, Suporte), omitido quando houver dados reais; teste cobre selo e
  omissão por tela.
- **13d — envios duplicados:** travar `disabled` durante `sending` e nas
  confirmações onde falta (ex. Suporte), no padrão Login/Register;
  teste cobre botão desabilitado e rascunho preservado.
- **13e — textos e unidades:** revisar PT, unidades (Wh/V/A), datas UTC
  cruas sem conversão e timezone; teste cobre rótulos e omissões.
- **13f — acessibilidade e responsividade transversal:** nome+papel,
  contraste, foco e `hitSlop` nas telas 00–09 onde faltar; estender
  `responsiveness.test.tsx` (320px + fonte ampliada) às telas novas
  (Viber, Veículos, Testes, Suporte); `test:unit` total + `tsc` verdes.
- **13g — entrega:** documentar execução local (`Expo`, `EXPO_HOST`) e
  geração dos builds previstos; checklist de validação em aparelho para o
  programador executar; atualizar roadmap (13→Concluída) com aprovação.

## 5. Padrão de implementação (vale para todos os lotes)

- Props de entrada, callbacks de saída; nunca rede, storage, cálculo local
  ou lógica de domínio.
- TDD regra 4 de `.AIs/AGENTS.MD`: teste antes, RED confirmado, depois
  GREEN.
- Comentários em português no topo do arquivo e em cada função (regra 3).
- Visual via `theme`, componentes compartilhados e padrões já fechados nas
  Tasks 00–12; sem segunda identidade visual.
- Validação por lote em `services/mobile`: `npm.cmd run test:unit`
  + `npx.cmd tsc --noEmit` + `git diff --check`; rebuild/rerodar docker
  quando necessário (regras 4, 10).

## 6. Fora do escopo (explicitamente não fazer)

- Integração real com o backend (HTTP, sessão, cookies, CSRF, refresh).
- Renovação automática de sessão, reconexão automática ou fila offline.
- Novas telas, novas rotas, mudança de `TAB_ORDER`/`TAB_META`.
- Login Google, recuperação de senha, diagnóstico do veículo.
- Fase de integração pós-MVP (plano próprio futuro).

## 7. Integração esperada (futura, sem implementar agora)

- Cada tela utiliza apenas os contratos públicos correspondentes;
  offline, expirada e reconexão refletirão o informado pelas camadas de
  integração e pelo backend quando existirem.

## 8. Arquivos previstos (informados antes da edição, regra 1)

- Alterados sob aprovação, um lote por vez: telas em
  `services/mobile/src/screens/*.tsx` e seus testes, `responsiveness.test.tsx`,
  possíveis ajustes em `components/` compartilhados + testes.
- Novos em 13g (proposta): `services/mobile/README.md` (execução local e
  builds) + checklist de aparelho embutido no plano ou no contexto.
- Alterado sob aprovação em 13g: `mobile-roadmap/README.md`
  (13→Concluída).
- Docs desta sessão: este plano + `.AIs/docs/contexts/Context_16_10_2026.md`.
- Nenhum `.env` lido/exposto/versionado (regra 2).

## 9. Entregas (commits pequenos feitos pelo programador, regra 7)

1. 13a indisponibilidade.
2. 13b sessão expirada.
3. 13c selo de amostra.
4. 13d envios duplicados.
5. 13e textos e unidades.
6. 13f acessibilidade e responsividade transversal.
7. 13g entrega + roadmap.

Cada entrega só fecha após `test:unit` e `tsc --noEmit` verdes. Pushs separam
features prontas. RDA sob pedido ou com ~10% de tokens (regra 9).
