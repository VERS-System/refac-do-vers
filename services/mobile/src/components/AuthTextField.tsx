/**
 * Fornece um campo de texto padronizado para os formulários de autenticação.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../constants/theme';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  /** Elemento à direita dentro do campo (ex. alternador de visibilidade). */
  trailing?: ReactNode;
};

/**
 * Une rótulo e entrada em um componente acessível, preservando as propriedades
 * nativas necessárias para email, senha e demais campos de autenticação. O
 * adorno opcional divide a borda do campo com a entrada.
 */
export function AuthTextField({ label, style, trailing, ...inputProps }: AuthTextFieldProps) {
  const accessibilityLabel = label.replace(/:\s*$/, '');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          autoCapitalize="none"
          placeholderTextColor={theme.colors.gray}
          selectionColor={theme.colors.primary}
          style={[styles.input, style]}
          {...inputProps}
        />
        {trailing}
      </View>
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
  inputRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 39,
    paddingLeft: 20,
    paddingRight: 12,
    shadowColor: theme.colors.white,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  input: {
    color: theme.colors.primary,
    flex: 1,
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
  },
});
