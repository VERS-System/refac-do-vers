/**
 * Implementa a tela de autenticação do usuário conforme o mockup mobile do VERS.
 *
 * Login social permanece fora do MVP por falta de contrato aprovado (Task 02):
 * a tela expõe apenas email, senha e o atalho para o cadastro.
 */

import { useState } from 'react';
import {
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

type LoginScreenProps = {
  onLogin?: (credentials: LoginCredentials) => void;
  onSignUp?: () => void;
  /** Contador de focos da tela usado para disparar a animação da logo. */
  animationRun?: number;
};

/**
 * Exibe as opções de acesso e mantém somente o estado local dos campos; as
 * integrações reais são delegadas por callbacks para não acoplar UI e API.
 */
export function LoginScreen({ onLogin, onSignUp, animationRun }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  /** Encaminha ao fluxo de autenticação as credenciais atualmente preenchidas. */
  function handleLogin() {
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
                <PrimaryButton label="LOGIN" accessibilityLabel="Login" onPress={handleLogin} />
              </View>
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
