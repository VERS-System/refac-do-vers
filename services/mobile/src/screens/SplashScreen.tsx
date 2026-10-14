/**
 * Exibe a apresentação inicial do aplicativo enquanto seus recursos são
 * carregados e leva a logo do centro da tela até o topo, onde ela ficará nas
 * telas de Login e Cadastro.
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VersLogo } from '../components/VersLogo';
import { getSplashCenterOffset } from '../components/logoAnimation';
import { theme } from '../constants/theme';

/** Margem do topo onde a logo se acomoda, igual ao espaçamento das telas. */
const SPLASH_TOP_MARGIN = 40;

/**
 * Centraliza o símbolo do VERS e, na sequência, sobe a marca até o topo para
 * dar continuidade visual com a transição para as telas de autenticação.
 */
export function SplashScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const logoWidth = Math.min(140, width * 0.36);
  const logoHeight = (logoWidth * 93) / 140;
  const topTarget = insets.top + SPLASH_TOP_MARGIN;
  const startOffset = getSplashCenterOffset(height, logoHeight, topTarget);

  /** Translação vertical da logo; já inicia no centro para evitar salto visual. */
  const translateY = useRef(new Animated.Value(startOffset)).current;

  /** Sobe a logo do centro até o topo com um leve bounce. */
  useEffect(() => {
    Animated.spring(translateY, {
      friction: 8,
      tension: 50,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  return (
    <View style={[styles.container, { paddingTop: topTarget }]} testID="splash-screen">
      <Animated.View style={{ transform: [{ translateY }] }} testID="splash-logo-move">
        <VersLogo size={logoWidth} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
  },
});