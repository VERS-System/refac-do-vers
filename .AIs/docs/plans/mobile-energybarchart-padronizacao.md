<!-- Padroniza o EnergyBarChart para escala real, valor zero e rótulos alinhados. -->

# Plano — padronização do EnergyBarChart (escala, zero e rótulos)

## 1. Contexto e problema

`EnergyBarChart` é compartilhado por `BatteryScreen` (série Today e Money
economy) e `HomeScreen` (Battery usage e economy). Auditoria em 17/10/2026
identificou três riscos para a futura integração com o backend (F06):

1. **Escala implícita 0–100**: `Math.max(8, Math.min(100, value))` assume
   valores percentuais; dados reais em Wh (ex.: 240) saturariam em barra
   cheia.
2. **Piso de 8% para tudo**: um horário com 0 Wh ainda renderiza
   barrinha visível de 8% — com dado real, "sem energia" ficaria mentiroso.
3. **Rótulos de hora fora do componente**: a fila de labels vive no
   `BatteryScreen` e o alinhamento barras×rótulos depende de dois
   `space-around` coincidentes; séries longas (24 pontos) sobreporiam os
   rótulos (fontSize 10, ~35px cada).

## 2. Decisões do programador (regra 11, 17/10/2026)

| Ponto | Decisão |
| --- | --- |
| Escala | Nova prop `max` no componente (padrão 100); normalização `value/max*100` interna. |
| Zero/negativo | Altura zero; piso de 8% mantido só para valores positivos. |
| Rótulos | Entram no componente com alinhamento por construção (slots flex) + thinning em séries longas; `BatteryScreen` deixa de renderizar a fila separada. |

## 3. Novo contrato de `EnergyBarChart`

```ts
type EnergyBarChartProps = {
  height?: number;              // altura da área de barras; padrão 84
  values: number[];
  max?: number;                 // teto de escala; padrão 100 (compat fixtures)
  labels?: string[];            // rótulo por barra; ausente = sem linha (Home, Money)
  maxVisibleLabels?: number;    // thinning; padrão 8
};
```

Regras:

- Normalização: `pct = value / max * 100`, saturado em 100; `max <= 0`
  trata-se como 100 (guarda).
- `value <= 0` → altura 0%; `0 < value` normalizado < 8 → piso 8%.
- Labels: uma coluna flex por índice (`flex: 1`) em ambas as linhas —
  barra centrada no slot e rótulo centrado no mesmo slot; alinhamento por
  construção, sem depender de `space-around`.
- Thinning: `step = ceil(labels.length / maxVisibleLabels)`; renderiza
  rótulo quando `index % step === 0` (sempre o primeiro; no máximo
  `maxVisibleLabels` visíveis). Barras nunca são omitidas.
- Acessibilidade: label existente (`Gráfico de barras com N valores`)
  preservado.
- Comentários em português (regra 3).

## 4. Lotes (TDD, um commit pequeno por lote — regra 7)

### Lote 1 — escala `max` e altura zero

- `EnergyBarChart.tsx`: props `max` + normalização + regra de zero.
- `EnergyBarChart.test.tsx` (RED→GREEN):
  - com `max`, valor é proporcional ao teto (ex.: 240/max 1000 → 24%);
  - valor acima do teto satura em 100%;
  - zero e negativo viram altura 0%;
  - positivo < 8% mantém o piso 8%;
  - sem `max`, comportamento atual preservado.

### Lote 2 — labels internos com slots flex + thinning

- `EnergyBarChart.tsx`: linha de rótulos interna, slots flex por índice,
  thinning por `maxVisibleLabels`.
- `BatteryScreen.tsx`: remove a fila `hourLabels` externa e passa
  `labels={visibleHourly.map((p) => p.label)}` no gráfico Today; Money
  economy continua sem labels. Estilos `hourLabels`/`hourLabel` removidos.
- Testes: novos no componente (labels renderizados, um slot por valor,
  thinning limita a quantidade, primeiro rótulo sempre visível);
  `BatteryScreen.test.tsx` mantém as asserções de texto (`11 AM`,
  `4 PM`) — mesmo texto, origem mudou.

### Lote 3 — trava de responsividade da Bateria

- `responsiveness.test.tsx`: Bateria entra no rol em 320px com rolagem
  ativa (gap da 13f).
- Sem mudança de produção; só teste.

## 5. Fora de escopo

- `HomeScreen.tsx`: sem alteração — fixtures ≤ 100 seguem idênticas com
  `max` padrão; sem labels já hoje.
- Normalização de Wh → escala caberá no mapper da futura integração; com
  `max` o componente fica pronto para receber o teto real.
- Mudança de aparência das barras (largura 2px, cor, baseline).

## 6. Validação por lote

`npm run test:unit` (suíte isolada + regressão total) + `tsc --noEmit` +
`diff --check`, no serviço mobile. Registro de cada lote em
`.AIs/docs/contexts/Context_17_10_2026.md` (regra 5).
