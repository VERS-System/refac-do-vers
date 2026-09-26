/**
 * Fornece o placeholder de carregamento do aplicativo mobile do VERS.
 *
 * Existe para representar conteúdo ainda não disponível com as medidas da
 * tela futura, sem animação nativa pesada: mantém o Jest estável e deixa a
 * animação de pulso para uma evolução com `Animated` quando houver demanda.
 */

import { StyleSheet, View, type DimensionValue } from 'react-native';
import { theme } from '../constants/theme';

type AppSkeletonProps = {
  /** Altura do placeholder; padrão de uma linha de texto. */
  height?: DimensionValue;
  /** Largura do placeholder; padrão ocupa a linha toda. */
  width?: DimensionValue;
  /** Raio do placeholder; padrão médio do tema. */
  borderRadius?: number;
  /** Identificador usado nos testes. */
  testID?: string;
  /** Rótulo acessível do placeholder. */
  accessibilityLabel?: string;
};

/**
 * Renderiza um bloco neutro com as dimensões informadas (ou os padrões do
 * tema), anunciando espera sem expor detalhe técnico.
 */
export function AppSkeleton({
  height = 16,
  width = '100%',
  borderRadius = theme.radii.md,
  testID = 'app-skeleton',
  accessibilityLabel = 'Carregando conteúdo',
}: AppSkeletonProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible
      accessibilityRole="image"
      style={[styles.skeleton, { borderRadius, height, width }]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.surface,
  },
});
