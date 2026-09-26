/**
 * Fornece o cartão padrão das telas do aplicativo mobile do VERS.
 *
 * Existe para eliminar a duplicação de borda, raio e recorte que cada tela
 * repetia; a altura e os paddings continuam com o chamador para não mudar o
 * visual atual das telas.
 */

import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

type AppCardProps = {
  children: React.ReactNode;
  /** Identificador usado nos testes. */
  testID?: string;
  /** Rótulo acessível do cartão quando ele representa uma região ou ação. */
  accessibilityLabel?: string;
  /** Estilo extra (altura, paddings) específico da tela. */
  style?: StyleProp<ViewStyle>;
  /** Quando informado, o cartão vira um botão acessível sem acoplar navegação. */
  onPress?: () => void;
};

/**
 * Renderiza um contêiner com borda, raio do tema e recorte, delegando o
 * conteúdo e as medidas específicas à tela que o utiliza. Com `onPress`,
 * vira `Pressable` com papel de botão; sem, permanece `View`.
 */
export function AppCard({ children, testID, accessibilityLabel, style, onPress }: AppCardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.card, style]}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
      style={[styles.card, style]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
