/**
 * Exibe a apresentação inicial do aplicativo enquanto seus recursos são carregados.
 */

import { SafeAreaView, StyleSheet, useWindowDimensions } from 'react-native';
import { VersLogo } from '../components/VersLogo';
import { colors } from '../constants/colors';

/**
 * Centraliza o símbolo do VERS sobre o fundo institucional e adapta o tamanho da
 * marca à largura disponível sem distorcer sua proporção.
 */
export function SplashScreen() {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(140, width * 0.36);

  return (
    <SafeAreaView style={styles.container} testID="splash-screen">
      <VersLogo size={logoSize} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
