/**
 * Fornece um campo de texto padronizado para os formulários de autenticação.
 */

import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../constants/theme';

type AuthTextFieldProps = TextInputProps & {
  label: string;
};

/**
 * Une rótulo e entrada em um componente acessível, preservando as propriedades
 * nativas necessárias para email, senha e demais campos de autenticação.
 */
export function AuthTextField({ label, style, ...inputProps }: AuthTextFieldProps) {
  const accessibilityLabel = label.replace(/:\s*$/, '');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        placeholderTextColor={theme.colors.gray}
        selectionColor={theme.colors.primary}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: '100%',
  },
  label: {
    color: theme.colors.primary,
    fontSize: 13,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    color: theme.colors.primary,
    fontSize: 15,
    height: 39,
    paddingHorizontal: 20,
    shadowColor: theme.colors.white,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
});
