<!-- Plano da tela Viber do app desktop (Fase 4 do roadmap do frontend desktop), escrito antes da implementação. -->

# Plano — Tela Viber (desktop)

Parte da Fase 4 do [roadmap do frontend desktop](desktop-frontend-roadmap.md).
Referência visual: `services/dashboard/design-reference/06-viber-ia`.
Alinhado à task da equipe [D11 — Viber](desktop-roadmap/11-tela-viber.md) e à
tela Viber do mobile (`services/mobile/src/screens/ViberScreen.tsx`): tipos
de resposta medição, explicação, inferência e recomendação; selos só em
inferência ("Inferência do Viber — pode conter erros") e recomendação
("Recomendação do Viber — confira antes de agir"); linha de referência;
contextos autorizados.

## 1. Decisão do usuário (14/10/2026)

Sem backend de IA, as sugestões respondem com textos montados a partir dos
dados calculados, sempre com a fonte; perguntas livres recebem "disponível
com o backend da Viber"; as conversas recentes são derivadas da base.

## 2. Divergências com o Stitch

| Onde | Stitch | Implementação | Motivo |
|---|---|---|---|
| "Ontem recuperou 1,64 mWh, 8% abaixo da média" | 1,64 mWh, −8% | 168 mWh, −39% (domingo 04/10 vs média 274 mWh) | base de exemplo |
| Comparação | SP-348 3,62 mWh vs Centro 1,07 mWh, vibração 3,8 vs 2,9 m/s² | #021 (passeio de domingo) vs #022 (rodovia de hoje): energia e potência média dos resumos | testes da base; o resumo do teste não tem vibração |
| "+238% densidade energética" | texto | fora | não é um cálculo do contrato |
| Horários | 14:02 | 18:02 e 18:03 | o "agora" é 18:05 |
| Contexto | Hoje 00h–14h, 3.412 amostras, P3 82%, P4 0,0 mW | contexto escolhido; amostras do #023; P1–P4 da cadeia ao vivo e bateria 68% | dados da base |

## 3. Comportamento

- O repositório faz o papel do ai-service: `obterContextosViber`,
  `obterConversasViber`, `obterMensagensViber(conversaId)`,
  `criarConversaViber()` e `enviarMensagemViber({ conversaId, texto,
  contextoId, sugestao? })`, que devolve as respostas. Pergunta livre (sem
  sugestão) é recusada com o código `indisponivel`; a tela mostra o aviso e
  **mantém o rascunho** (D11).
- Sugestões: "Por que a eficiência caiu?" (medição + inferência), "Resumo
  …" do contexto escolhido (Hoje, Semana ou Teste #023) e "Quando revisar os
  piezos?" (recomendação).
- Conversa inicial e três conversas recentes montadas dos dados (falha do
  #017, pico de 412 mW da quinta, recalibração do LTC3588).
- "Nova conversa" cria uma conversa vazia ("Escolha uma sugestão para
  começar.").
- Estados: carregando, enviando ("Viber está respondendo…"), erro e vazio.
- A lista de mensagens é um `role="log"` (anúncio educado das respostas).

## 4. Arquivos

- Novos: `data/viberEmMemoria.ts` (conversas e respostas), `components/viber/`
  (mensagem, conversa, contexto, recentes), `pages/ViberIaPage.test.tsx` e
  testes.
- Alterados: `data/tipos.ts`, `data/erros.ts` (`indisponivel`),
  `data/repositorio.tsx`, `data/repositorioMock.ts`, `hooks/useDados.ts`,
  `pages/ViberIaPage.tsx`.

## 5. Validação

TDD, `npm run test:unit`, `npm run build`, Prettier, prints em 1280 e 1512
px. Sem commit (regra 7).

## 6. Execução (madrugada de 14/10/2026)

Implementado conforme o plano, aguardando revisão e commit do programador.

- TDD: 20 testes falharam pelo motivo certo com esboços; depois 54 arquivos
  de teste e 403 testes passando, sem avisos; build OK; Prettier aplicado.
- Conversas e respostas em `data/viberEmMemoria.ts`, alimentado pelo
  repositório (resumos, testes, telemetria, revisões e configurações).
- Componentes em `components/viber/` (`Mensagem.tsx`, `PainelConversa.tsx`,
  `PainelLateral.tsx`).
- Números da conversa inicial: domingo 168 mWh, 39% abaixo da média de 274
  mWh; #022 com 191 mW de potência média contra 168 mW do #021.

## 7. A validar pelo programador

- O repositório de exemplo simula o ai-service; o contrato real da Viber
  ainda não existe em `packages/shared-types`.
- Textos das respostas e a inferência sobre rodovia × passeio.
- Contextos oferecidos (Hoje, Semana, Teste em andamento).
