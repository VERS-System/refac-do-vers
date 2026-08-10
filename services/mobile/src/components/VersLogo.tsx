/**
 * Renderiza o símbolo da marca VERS com três faixas responsivas e reutilizáveis.
 */

import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';

type VersLogoProps = {
  size?: number;
};

/**
 * Compõe o logotipo com Views nativas para manter nitidez em diferentes telas
 * e permitir seu reaproveitamento na Splash, no Login e no Cadastro.
 */
export function VersLogo({ size = 140 }: VersLogoProps) {
  const stripeWidth = size * 0.16;
  const stripeHeight = size * 0.68;
  const stripeGap = size * 0.08;

  return (
    <View
      accessibilityLabel="Logotipo do VERS"
      accessibilityRole="image"
      style={[styles.container, { width: size, height: size * 0.72, gap: stripeGap }]}
      testID="vers-logo"
    >
      <View
        style={[styles.stripe, styles.lightStripe, { width: stripeWidth, height: stripeHeight }]}
        testID="vers-logo-stripe-left"
      />
      <View
        style={[styles.stripe, styles.goldStripe, { width: stripeWidth, height: stripeHeight }]}
        testID="vers-logo-stripe-center"
      />
      <View
        style={[styles.stripe, styles.lightStripe, { width: stripeWidth, height: stripeHeight }]}
        testID="vers-logo-stripe-right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  stripe: {
    transform: [{ skewX: '-27deg' }],
  },
  lightStripe: {
    backgroundColor: colors.logoLight,
  },
  goldStripe: {
    backgroundColor: colors.primary,
  },
});
