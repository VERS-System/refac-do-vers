<!-- Permite seleção de período (dois toques) no calendário mensal da Bateria. -->

# Plano — período de tempo no BatteryCalendar

## 1. Contexto e problema

`BatteryCalendar` (usado por `BatteryScreen` e `HistoryScreen`) só
seleciona dias específicos: um toque = um dia, círculo dourado. O
programador pediu (17/10/2026) selecionar um **período de tempo**, com
o intervalo destacado em **amarelo de baixa opacidade**.

## 2. Decisões do programador (regra 11, 17/10/2026)

| Ponto | Decisão |
| --- | --- |
| Interação | Dois toques: 1º marca o início, 2º marca o fim; 3º toque recomeça um novo período; toque em dia anterior ao início inverte a ordem. |
| Visual | Dias intermediários com pílula amarela suave (token novo `primarySoft`, no padrão `errorSoft`) ligando o intervalo; início e fim mantêm o círculo dourado sólido atual. |
| Contrato | Novo callback opcional `onSelectRange(start, end)` ao completar o período; `onSelectDay` continua disparando a cada toque (testes atuais válidos); telas ganham passthrough. |

## 3. Mudanças por arquivo

### `constants/colors.ts`

- Novo token `primarySoft: 'rgba(216, 201, 90, 0.16)'` (transparência
  idêntica ao `errorSoft`; `primary` é `#d8c95a`).

### `components/BatteryCalendar.tsx`

- Estado interno de período: `rangeStart`/`rangeEnd` (`YYYY-MM-DD`);
  `selectedDate` semeia `rangeStart` (compat).
- Máquina de seleção em `selectDay`:
  - sem início ou período completo → novo período (limpa o fim);
  - com início e sem fim → se o dia for anterior ao início, inverte;
    senão fecha o período e dispara `onSelectRange(start, end)`;
  - `onSelectDay` dispara em todo toque (contrato atual preservado).
- Renderização:
  - ponta (`start`/`end`): círculo dourado atual (`daySelected`);
  - intermediário (`start < iso < end`, comparação ISO — vale entre
    meses): fundo `primarySoft` na célula de largura total (pílula
    contínua na linha da semana);
  - dias com dados (`dayWithData`) inalterados, coexistindo com o
    destaque.
- Comentários em português atualizados (regra 3).

### `screens/BatteryScreen.tsx` e `screens/HistoryScreen.tsx`

- Novo prop de passthrough `onSelectRange?: (start, end) => void`
  repassado ao `BatteryCalendar`. Sem mudança visual nas telas.

## 4. Lotes (TDD, um commit pequeno por lote — regra 7)

### Lote 1 — calendário com período

- `colors.ts` (token) + `BatteryCalendar.tsx` (máquina + destaque) +
  `BatteryCalendar.test.tsx`:
  - 1º toque marca âncora com círculo e `onSelectDay` ainda dispara;
  - 2º toque posterior fecha período, pílula nos intermediários e
    `onSelectRange(start, end)`;
  - 2º toque anterior inverte a ordem;
  - 3º toque limpa o período anterior e recomeça;
  - intermediário não ganha círculo (só pílula).

### Lote 2 — passthrough nas telas

- `BatteryScreen.tsx`/`HistoryScreen.tsx` + testes das telas:
  `onSelectRange` chega ao callback do chamador ao completar o período.

## 5. Fora de escopo

- Persistência/agregação do período (pertence à integração F06); as
  telas só repassam o intervalo.
- Controlled range por props (estado segue interno, padrão das tasks
  visuais).

## 6. Validação por lote

`npm run test:unit` (suíte isolada + regressão total) + `tsc --noEmit` +
`diff --check`, no serviço mobile. Registro de cada lote em
`.AIs/docs/contexts/Context_17_10_2026.md` (regra 5).
