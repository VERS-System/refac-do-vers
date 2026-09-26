/**
 * Apresenta a proporção mensal entre bateria recuperada e utilizada.
 */

import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../constants/theme';

type BatteryDonutProps = {
  recoveredPercentage: number;
  size?: number;
  strokeWidth?: number;
};

/**
 * Converte a porcentagem recuperada em um arco SVG, preservando nitidez e
 * proporção em diferentes densidades de tela.
 */
export function BatteryDonut({
  recoveredPercentage,
  size = 190,
  strokeWidth = 23,
}: BatteryDonutProps) {
  const percentage = Math.max(0, Math.min(100, recoveredPercentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentage / 100);

  return (
    <View
      accessibilityLabel={`${percentage}% da bateria foi recuperada`}
      accessibilityRole="image"
      style={[styles.container, { height: size, width: size }]}
    >
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={theme.colors.white}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          origin={`${size / 2}, ${size / 2}`}
          r={radius}
          rotation="-90"
          stroke={theme.colors.primary}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="butt"
          strokeWidth={strokeWidth}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
