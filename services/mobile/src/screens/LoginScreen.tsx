/**
 * Implementa a tela de autenticação do usuário conforme o mockup mobile do VERS.
 *
 * Login social permanece fora do MVP por falta de contrato aprovado (Task 02):
 * a tela expõe apenas email, senha e o atalho para o cadastro.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthTextField } from '../components/AuthTextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { VersLogo } from '../components/VersLogo';
import { theme } from '../constants/theme';

export type LoginCredentials = {
  email: string;
  password: string;
};

/** Estados visuais do acesso; a origem (rede, bloqueio, sessão) é do backend. */
export type LoginStatus =
  | 'idle'
  | 'sending'
  | 'genericError'
  | 'unavailable'
  | 'temporarilyBlocked'
  | 'sessionExpired';

type LoginScreenProps = {
  onLogin?: (credentials: LoginCredentials) => void;
  onSignUp?: () => void;
  /** Estado visual atual; `idle` libera o envio. */
  status?: LoginStatus;
  /** Contador de focos da tela usado para disparar a animação da logo. */
  animationRun?: number;
};

/**
 * Exibe as opções de acesso e mantém somente o estado local dos campos; as
 * integrações reais são delegadas por callbacks para não acoplar UI e API.
 */
export function LoginScreen({ onLogin, onSignUp, status = 'idle', animationRun }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSending = status === 'sending';
  const isGenericError = status === 'genericError';
  const isUnavailable = status === 'unavailable';

  /** Encaminha ao fluxo de autenticação as credenciais atualmente preenchidas. */
  function handleLogin() {
    if (isSending) {
      return;
    }

    onLogin?.({ email, password });
  }

  return (
    <ScreenShell testID="login-screen">
      <View style={styles.content}>
            <View style={styles.logoContainer}>
              <VersLogo animation="login" animationRun={animationRun} size={98} />
            </View>

            <Text accessibilityRole="header" style={styles.title}>
              Welcome back
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
                autoComplete="current-password"
                label="Password:"
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!isPasswordVisible}
                textContentType="password"
                trailing={
                  <Pressable
                    accessibilityLabel={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                  >
                    <Ionicons
                      color={theme.colors.primary}
                      name={isPasswordVisible ? 'eye' : 'eye-outline'}
                      size={20}
                    />
                  </Pressable>
                }
                value={password}
              />

              <View style={styles.loginButton}>
                <PrimaryButton
                  accessibilityLabel="Login"
                  disabled={isSending}
                  label="LOGIN"
                  onPress={handleLogin}
                />
              </View>
              {isGenericError && (
                <Text
                  accessibilityLabel="Não foi possível entrar. Verifique email e senha e tente novamente."
                  accessibilityRole="alert"
                  style={styles.errorText}
                  testID="login-error"
                >
                  Não foi possível entrar. Verifique email e senha e tente novamente.
                </Text>
              )}
              {isUnavailable && (
                <View style={styles.retryBlock}>
                  <Text
                    accessibilityLabel="Serviço indisponível no momento. Tente novamente em instantes."
                    accessibilityRole="alert"
                    style={styles.errorText}
                    testID="login-unavailable"
                  >
                    Serviço indisponível no momento. Tente novamente em instantes.
                  </Text>
                  <PrimaryButton
                    accessibilityLabel="Tentar novamente"
                    label="TENTAR NOVAMENTE"
                    onPress={handleLogin}
                  />
                </View>
              )}
              {isSending && (
                <ActivityIndicator
                  accessibilityLabel="Enviando"
                  color={theme.colors.primary}
                  style={styles.sendingIndicator}
                  testID="login-sending"
                />
              )}
            </View>

            <View style={styles.accountRow}>
              <Text style={styles.accountText}>Don't have an account? </Text>
              <Pressable
                accessibilityLabel="Criar uma conta"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onSignUp}
              >
                <Text style={styles.accountLink}>Sign up</Text>
              </Pressable>
            </View>
          </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flex: 1,
    paddingBottom: 38,
    paddingTop: 40,
  },
  logoContainer: {
    marginBottom: 26,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 28,
  },
  form: {
    gap: 29,
    maxWidth: 350,
    width: '100%',
  },
  loginButton: {
    marginTop: 31,
    width: '100%',
  },
  sendingIndicator: {
    marginTop: 16,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  retryBlock: {
    gap: 16,
    marginTop: 16,
    maxWidth: 350,
    width: '100%',
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 29,
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
