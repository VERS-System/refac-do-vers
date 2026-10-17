/**
 * Renderiza o símbolo da marca VERS como vetor, replicando o logotipo oficial
 * e permitindo animações de transição sem perda de nitidez.
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { theme } from '../constants/theme';
import {
  getLogoAnimationPlan,
  getLogoTravelDistance,
  LogoAnimationKind,
  LogoBar,
} from './logoAnimation';

const LOGO_WIDTH = 140;
const LOGO_HEIGHT = 93;

/**
 * Polígono de cada barra nas coordenadas do viewBox 140x93, medido pixel a
 * pixel no versLogo.png: largura constante (~24px) até y=49 e afilamento
 * acentuado só no terço inferior (formato de pincelada da identidade).
 */
const BAR_POINTS: Record<LogoBar, string> = {
  left: '42,0 66,0 43,49 12,92 0,92',
  center: '80,0 104,0 81,49 50,92 38,92',
  right: '116,0 140,0 117,49 86,92 74,92',
};

/** Cor de preenchimento de cada barra do logotipo. */
const BAR_FILL: Record<LogoBar, string> = {
  left: theme.colors.logoLight,
  center: theme.colors.logoGold,
  right: theme.colors.logoLight,
};

type VersLogoProps = {
  size?: number;
  /** Direção da animação de entrada; sem valor a logo permanece estática. */
  animation?: LogoAnimationKind;
  /** Contador usado para disparar/repetir a animação a cada foco da tela. */
  animationRun?: number;
};

/**
 * Reproduz fielmente as três barras inclinadas do logotipo PNG (140x93) usando
 * polígonos SVG. Cada barra vive em uma camada própria que pode ser animada
 * com um spring escalonado, simulando o encaixe da marca.
 */
export function VersLogo({ size = 140, animation, animationRun = 0 }: VersLogoProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = size;
  const height = (size * LOGO_HEIGHT) / LOGO_WIDTH;

  /** Translação horizontal de cada barra; começa centralizada na tela. */
  const translate = useRef({
    left: new Animated.Value(0),
    center: new Animated.Value(0),
    right: new Animated.Value(0),
  }).current;

  /**
   * A cada foco, cada barra sai pela lateral da tela, reaparece pelo outro lado
   * e volta ao centro com spring, respeitando a ordem escalonada da direção.
   */
  useEffect(() => {
    if (animation === undefined || animationRun === 0) {
      return;
    }

    const plan = getLogoAnimationPlan(animation);
    const travel = getLogoTravelDistance(screenWidth);

    plan.bars.forEach(({ bar }) => translate[bar].setValue(0));

    Animated.parallel(
      plan.bars.map(({ bar, delayMs, direction, exitDurationMs, friction, tension }) =>
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(translate[bar], {
            duration: exitDurationMs,
            toValue: direction * travel,
            useNativeDriver: true,
          }),
          Animated.timing(translate[bar], {
            duration: 0,
            toValue: -direction * travel,
            useNativeDriver: true,
          }),
          Animated.spring(translate[bar], {
            friction,
            tension,
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    ).start();
  }, [animation, animationRun, screenWidth, translate]);

  return (
    <View
      accessibilityLabel="Logotipo do VERS"
      accessibilityRole="image"
      style={[styles.container, { height, width }]}
      testID="vers-logo"
    >
      {(['left', 'center', 'right'] as const).map((bar) => (
        <Animated.View
          key={bar}
          style={[styles.barLayer, { transform: [{ translateX: translate[bar] }] }]}
          testID={`vers-logo-slide-${bar}`}
        >
          <Svg height="100%" viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`} width="100%">
            <Polygon
              fill={BAR_FILL[bar]}
              points={BAR_POINTS[bar]}
              testID={`vers-logo-bar-${bar}`}
            />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});