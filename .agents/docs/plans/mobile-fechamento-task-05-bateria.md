<!-- Subdivisão da Task 05 (Bateria e energia) em sub-entregas pequenas e testáveis. -->

# Plano — Task 05 Bateria e energia em sub-entregas

Cada sub-entrega segue TDD (teste antes da tela) e vira um commit pequeno
feito pelo programador. A tela não existe ainda: será criada com fixtures via
props; séries e resumos reais virão do backend depois, sem mudar a interface.
Nenhum cálculo no cliente (potência, energia, economia); valores ausentes são
`null`/ausência, nunca zero.

## 05a — Tela e rota (resumo por período)

- Criar `src/screens/BatteryScreen.tsx` + `__tests__/BatteryScreen.test.tsx`:
  resumo do período com energia recuperada, potência média e pico (props com
  fixtures padrão).
- Ligar a aba `battery` à nova tela (estado de aba ativa; hoje cai na Home).
- Testes: resumo renderiza com unidades; aba battery exibe a tela.
- Aceite: navegar Home ↔ Bateria sem perder estado visual.

## 05b — Calendário mensal (mockup battery1)

- Criar `src/components/BatteryCalendar.tsx` + teste: grade do mês real
  (JS `Date`), navegação `<`/`>` entre meses, seleção de dia (círculo),
  dias com dados em destaque, cabeçalho de semana correto D–S.
- Props: `month`, `year`, `selectedDate`, `daysWithData`, `onSelectDay`,
  `onMonthChange` (fixtures até o F06/Task 06).
- Testes: navega meses, seleciona dia, destaca dias com dados.
- Aceite: calendário funcional e responsivo aos dados.

## 05c — Restyle da BatteryScreen (mockup battery1)

- Cabeçalho "MONTHLY RECORD", donut + legenda
  ("Battery Recovered"/"Battery Used"), card "Today" com gráfico de barras
  e rótulos de hora, card do calendário; reaproveitar `BatteryDonut` e
  `EnergyBarChart`.
- Testes: estrutura do mockup, rótulos de hora, legenda.
- Aceite: fidelidade ao battery1 (semana corrigida para D–S).

## 05d — Tela cheia + Money economy (mockup battery2)

- Botão de expandir no card (`Ionicons` expand/contract); modo expandido
  esconde o calendário e mostra gráficos altos + "Money economy".
- Economia visível enquanto houver premissas nas props (fixtures).
- Testes: alterna compacto/expandido; gráficos respondem aos dados.
- Aceite: fidelidade ao battery2.

## 05e — Medição, calculado, indisponível + qualidade

- Distinguir por rótulo: valor medido, calculado e indisponível; cobertura e
  qualidade dos dados junto à série.
- Testes: cada tipo tem rótulo próprio; indisponível não mostra número.
- Aceite: nenhuma ambiguidade sobre a origem do número.

## 05f — Bateria usada e economia condicionais

- `vehicleEnergyUsedWh` só quando prop de fonte confiável presente;
  economia só quando moeda + tarifa + premissas presentes (props).
- Testes: ausentes sem fonte/premissas; presentes com elas.
- Aceite: sem estimativa inventada.

## 05g — Estados (vazio, parcial, inválido, carregamento, erro)

- Prop `status: BatteryStatus`; `loading` sem números, `invalid` sem
  agregados, erro com nova tentativa (`onRetry`).
- Testes: cada estado; inválido nunca entra como energia válida.
- Aceite: mesmos padrões das Tasks 02–04.

## 05h — Acessibilidade e validação final da Task 05

- Nome+papel em controles/gráficos, ordem de leitura, responsividade;
  regressão total.
- Aceite (critério de saída da Task 05): indicadores consultáveis sem nova
  interpretação dos dados; `test:unit` e `tsc --noEmit` verdes.

Arquivos: `src/screens/BatteryScreen.tsx`,
`src/screens/__tests__/BatteryScreen.test.tsx`, navegação
(`RootNavigator.tsx` + teste na 05a).
