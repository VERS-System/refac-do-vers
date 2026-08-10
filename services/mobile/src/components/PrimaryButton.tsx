/**
 * Define o botão principal dourado usado nas ações prioritárias do aplicativo.
 */

import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';

type PrimaryButtonProps = {
  accessibilityLabel?: string;
  label: string;
  onPress: () => void;
};

/**
 * Renderiza uma ação de destaque com resposta visual ao toque e sem acoplar o
 * componente à regra de negócio executada pelo formulário.
 */
export function PrimaryButton({ accessibilityLabel, label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  label: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
});
