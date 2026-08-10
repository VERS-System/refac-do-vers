/**
 * Implementa a tela de autenticação do usuário conforme o mockup mobile do VERS.
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthTextField } from '../components/AuthTextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { VersLogo } from '../components/VersLogo';
import { colors } from '../constants/colors';

export type LoginCredentials = {
  email: string;
  password: string;
};

type LoginScreenProps = {
  onGoogleLogin?: () => void;
  onLogin?: (credentials: LoginCredentials) => void;
  onSignUp?: () => void;
};

/**
 * Exibe as opções de acesso e mantém somente o estado local dos campos; as
 * integrações reais são delegadas por callbacks para não acoplar UI e API.
 */
export function LoginScreen({ onGoogleLogin, onLogin, onSignUp }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /** Encaminha ao fluxo de autenticação as credenciais atualmente preenchidas. */
  function handleLogin() {
    onLogin?.({ email, password });
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="login-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>
              LOGIN
            </Text>

            <View style={styles.form}>
              <AuthTextField
                autoComplete="email"
                keyboardType="email-address"
                label="Email:"
                onChangeText={setEmail}
                placeholder="Emailexample@example.com.ex"
                textContentType="emailAddress"
                value={email}
              />
              <AuthTextField
                autoComplete="current-password"
                label="Password:"
                onChangeText={setPassword}
                placeholder="Password123!!"
                secureTextEntry
                textContentType="password"
                value={password}
              />

              <View style={styles.loginButton}>
                <PrimaryButton label="LOGIN" accessibilityLabel="Login" onPress={handleLogin} />
              </View>
            </View>

            <Text style={styles.socialTitle}>OR LOGIN WITH:</Text>
            <Pressable
              accessibilityLabel="Entrar com Google"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onGoogleLogin}
              style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
            >
              <Text style={styles.googleMark}>G</Text>
            </Pressable>

            <View style={styles.accountRow}>
              <Text style={styles.accountText}>Do not have an account? </Text>
              <Pressable
                accessibilityLabel="Criar uma conta"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onSignUp}
              >
                <Text style={styles.accountLink}>Sing-up here</Text>
              </Pressable>
            </View>

            <View style={styles.logoContainer}>
              <VersLogo size={98} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
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
    paddingBottom: 38,
    paddingHorizontal: 40,
    paddingTop: 82,
  },
  title: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 28,
  },
  form: {
    gap: 29,
    maxWidth: 300,
    width: '100%',
  },
  loginButton: {
    marginHorizontal: 35,
    marginTop: 31,
  },
  socialTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 43,
  },
  googleButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginTop: 10,
    width: 48,
  },
  googleMark: {
    color: '#4285f4',
    fontSize: 37,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.7,
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 29,
  },
  accountText: {
    color: colors.white,
    fontSize: 12,
  },
  accountLink: {
    color: colors.primary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  logoContainer: {
    marginTop: 84,
  },
});
