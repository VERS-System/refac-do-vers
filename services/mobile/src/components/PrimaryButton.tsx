/**
 * Define o botão principal dourado usado nas ações prioritárias do aplicativo.
 */

import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../constants/theme';

type PrimaryButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

/**
 * Renderiza uma ação de destaque com resposta visual ao toque e sem acoplar o
 * componente à regra de negócio executada pelo formulário.
 */
export function PrimaryButton({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.pill,
    height: 39,
    justifyContent: 'center',
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  label: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
});
