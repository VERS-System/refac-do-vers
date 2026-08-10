/**
 * Avalia e apresenta as regras de senha exigidas no Cadastro do VERS.
 */

import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

export type PasswordRequirementState = {
  hasMinimumLength: boolean;
  hasNoSpaces: boolean;
  hasSpecialCharacter: boolean;
  hasUppercase: boolean;
};

type PasswordRequirementsProps = {
  password: string;
};

type RequirementRowProps = {
  accessibilityLabel: string;
  isMet: boolean;
  label: string;
};

/**
 * Calcula cada regra separadamente para que a interface e o envio compartilhem
 * a mesma fonte de verdade durante a validação.
 */
export function evaluatePassword(password: string): PasswordRequirementState {
  return {
    hasMinimumLength: password.length >= 8,
    hasNoSpaces: password.length > 0 && !/\s/.test(password),
    hasSpecialCharacter: /[^A-Za-z0-9\s]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };
}

/** Renderiza uma regra com símbolo e estado acessível para tecnologias assistivas. */
function RequirementRow({ accessibilityLabel, isMet, label }: RequirementRowProps) {
  const status = isMet ? 'atendido' : 'não atendido';

  return (
    <View
      accessibilityLabel={`${accessibilityLabel}: ${status}`}
      accessible
      style={styles.requirementRow}
    >
      <Text style={[styles.requirementText, isMet && styles.requirementMet]}>
        {isMet ? '☑' : '☒'} {label}
      </Text>
    </View>
  );
}

/**
 * Exibe a lista completa de critérios e atualiza seus marcadores conforme o
 * usuário digita, reproduzindo a caixa de requisitos presente no mockup.
 */
export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = evaluatePassword(password);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Requires:</Text>
      <View style={styles.box}>
        <RequirementRow
          accessibilityLabel="Mínimo de 8 caracteres"
          isMet={requirements.hasMinimumLength}
          label="8 Characters Minimum"
        />
        <RequirementRow
          accessibilityLabel="Uma letra maiúscula"
          isMet={requirements.hasUppercase}
          label="1 Capital Letters"
        />
        <RequirementRow
          accessibilityLabel="Um caractere especial"
          isMet={requirements.hasSpecialCharacter}
          label="1 Special Characters"
        />
        <RequirementRow
          accessibilityLabel="Sem espaços"
          isMet={requirements.hasNoSpaces}
          label="No Spaces Between the Words"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 9,
    width: '100%',
  },
  title: {
    color: colors.primary,
    fontSize: 13,
  },
  box: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 27,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  requirementRow: {
    minHeight: 18,
    justifyContent: 'center',
  },
  requirementText: {
    color: colors.gray,
    fontSize: 14,
  },
  requirementMet: {
    color: colors.primary,
  },
});
