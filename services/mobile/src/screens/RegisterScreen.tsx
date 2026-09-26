/**
 * Implementa a tela de criação de conta conforme o mockup mobile do VERS.
 */

import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthTextField } from '../components/AuthTextField';
import { PasswordRequirements, evaluatePassword } from '../components/PasswordRequirements';
import { PrimaryButton } from '../components/PrimaryButton';
import { VersLogo } from '../components/VersLogo';
import { theme } from '../constants/theme';

export type RegisterCredentials = {
  email: string;
  password: string;
};

type RegisterScreenProps = {
  onLogin?: () => void;
  onRegister?: (credentials: RegisterCredentials) => void;
  /** Contador de focos da tela usado para disparar a animação da logo. */
  animationRun?: number;
};

/**
 * Mantém os dados locais, apresenta a validação em tempo real e só libera o
 * envio quando todos os critérios e a confirmação de senha estiverem válidos.
 */
export function RegisterScreen({ onLogin, onRegister, animationRun }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const canSubmit = useMemo(() => {
    const requirements = evaluatePassword(password);
    const isPasswordValid = Object.values(requirements).every(Boolean);

    return email.trim().length > 0 && isPasswordValid && password === confirmPassword;
  }, [confirmPassword, email, password]);

  /** Envia as credenciais somente após a validação completa do formulário. */
  function handleRegister() {
    if (!canSubmit) {
      return;
    }

    onRegister?.({ email: email.trim(), password });
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="register-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.keyboardArea}
      >
        <ScrollView
          scrollEnabled={true}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <VersLogo animation="register" animationRun={animationRun} size={100} />

            <Text accessibilityRole="header" style={styles.title}>
              Create account
            </Text>

            <View style={styles.form}>
              <AuthTextField
                autoComplete="email"
                keyboardType="email-address"
                label="Email:"
                onChangeText={setEmail}
                placeholder="Enter your email"
                textContentType="emailAddress"
                value={email}
              />
              <AuthTextField
                autoComplete="new-password"
                label="Password:"
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                textContentType="newPassword"
                value={password}
              />

              <PasswordRequirements password={password} />

              <AuthTextField
                autoComplete="new-password"
                label="Confirm Password:"
                onChangeText={setConfirmPassword}
                placeholder="Enter your password"
                secureTextEntry
                textContentType="newPassword"
                value={confirmPassword}
              />

              <View style={styles.signUpButton}>
                <PrimaryButton
                  accessibilityLabel="Sign up"
                  disabled={!canSubmit}
                  label="SING UP"
                  onPress={handleRegister}
                />
              </View>
            </View>

            <View style={styles.accountRow}>
              <Text style={styles.accountText}>Already have an account? </Text>
              <Pressable
                accessibilityLabel="Voltar para o Login"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onLogin}
              >
                <Text style={styles.accountLink}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    paddingBottom: 48,
    paddingTop: 48,
  },
  title: {
    marginTop: 28,
    color: theme.colors.primary,
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 22,
  },
  form: {
    gap: 26,
    maxWidth: 350,
    width: '100%',
  },
  signUpButton: {
    width: '100%',
    maxWidth: 350,
    marginTop: 34,
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 31,
  },
  accountText: {
    color: theme.colors.white,
    fontSize: 14,
  },
  accountLink: {
    color: theme.colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
