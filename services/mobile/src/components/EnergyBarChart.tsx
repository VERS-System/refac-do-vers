/**
 * Renderiza gráficos compactos de barras para os indicadores energéticos.
 *
 * Barras e rótulos compartilham a mesma distribuição de slots flex (um slot
 * por valor), garantindo alinhamento por construção mesmo após o thinning
 * de rótulos em séries longas — prontos para a série horária real do F06.
 */

import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

type EnergyBarChartProps = {
  height?: number;
  values: number[];
  /**
   * Teto de escala das barras; a altura vira `value / max * 100`. O padrão 100
   * preserva o comportamento percentual das fixtures atuais, e a futura
   * integração passa o teto real (ex.: maior Wh do período) para receber
   * valores absolutos sem saturar.
   */
  max?: number;
  /**
   * Rótulo por barra (um por índice de `values`); ausente omite a linha de
   * rótulos (Home e Money economy). Índices sem rótulo viram slot vazio.
   */
  labels?: string[];
  /**
   * Quantidade máxima de rótulos visíveis; padrão 8. Séries longas exibem
   * rótulo a cada `ceil(n / max)` índices, sempre começando no primeiro.
   */
  maxVisibleLabels?: number;
};

/**
 * Normaliza cada valor contra o teto `max` e o converte em uma barra
 * vertical: zero e negativos viram altura 0 (sem energia não vira barrinha),
 * positivos abaixo de 8% têm piso de visibilidade. O componente aceita
 * qualquer escala desde que o chamador informe o teto.
 */
export function EnergyBarChart({
  height = 84,
  values,
  max = 100,
  labels,
  maxVisibleLabels = 8,
}: EnergyBarChartProps) {
  /** Teto inválido cai no padrão percentual 100 (guarda defensiva). */
  const scaleMax = max > 0 ? max : 100;
  /** Limite de rótulos inválido cai em "sem thinning" (guarda defensiva). */
  const labelLimit = maxVisibleLabels > 0 ? maxVisibleLabels : values.length;
  /** Passo do thinning: 1 mantém todos; 24 rótulos com teto 8 → passo 3. */
  const labelStep = Math.ceil(values.length / labelLimit);
  const hasLabels = labels != null && labels.length > 0;

  return (
    <View accessibilityLabel={`Gráfico de barras com ${values.length} valores`} accessibilityRole="image">
      <View style={[styles.container, { height }]}>
        <View style={styles.baseline} />
        <View style={styles.bars}>
          {values.map((value, index) => {
            const normalizedValue =
              value <= 0 ? 0 : Math.max(8, Math.min(100, (value / scaleMax) * 100));

            return (
              <View key={`${index}-${value}`} style={styles.slot}>
                <View
                  style={[styles.bar, { height: `${normalizedValue}%` }]}
                  testID="energy-bar"
                />
              </View>
            );
          })}
        </View>
      </View>
      {hasLabels && (
        <View style={styles.labels}>
          {values.map((_, index) => {
            const label = labels[index];
            const isVisible = label != null && index % labelStep === 0;

            return (
              <View key={`label-${index}`} style={styles.slot} testID="energy-label-slot">
                {isVisible && (
                  <Text style={styles.label} testID="energy-label">
                    {label}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  baseline: {
    backgroundColor: theme.colors.primary,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: '100%',
    paddingHorizontal: 5,
  },
  bar: {
    backgroundColor: theme.colors.primary,
    width: 2,
  },
  /** Slot flex idêntico nas duas linhas: alinhamento barra×rótulo por construção. */
  slot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  labels: {
    flexDirection: 'row',
    marginTop: 6,
    paddingHorizontal: 5,
  },
  label: {
    color: theme.colors.primary,
    fontSize: 10,
  },
});
