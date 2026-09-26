/**
 * Renderiza gráficos compactos de barras para os indicadores energéticos.
 */

import { StyleSheet, View } from 'react-native';
import { theme } from '../constants/theme';

type EnergyBarChartProps = {
  height?: number;
  values: number[];
};

/**
 * Normaliza cada valor entre zero e cem e o converte em uma barra vertical,
 * mantendo o componente independente da origem futura dos dados.
 */
export function EnergyBarChart({ height = 84, values }: EnergyBarChartProps) {
  return (
    <View
      accessibilityLabel={`Gráfico de barras com ${values.length} valores`}
      accessibilityRole="image"
      style={[styles.container, { height }]}
    >
      <View style={styles.baseline} />
      <View style={styles.bars}>
        {values.map((value, index) => {
          const normalizedValue = Math.max(8, Math.min(100, value));

          return (
            <View
              key={`${index}-${value}`}
              style={[styles.bar, { height: `${normalizedValue}%` }]}
              testID="energy-bar"
            />
          );
        })}
      </View>
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
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  bar: {
    backgroundColor: theme.colors.primary,
    width: 2,
  },
});
