/**
 * Implementa a tela de autenticação do usuário conforme o mockup mobile do VERS.
 */

import { useState } from 'react';
import {
  Image,
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
  /** Contador de focos da tela usado para disparar a animação da logo. */
  animationRun?: number;
};

/**
 * Exibe as opções de acesso e mantém somente o estado local dos campos; as
 * integrações reais são delegadas por callbacks para não acoplar UI e API.
 */
export function LoginScreen({ onGoogleLogin, onLogin, onSignUp, animationRun }: LoginScreenProps) {
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
        scrollEnabled={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                secureTextEntry
                textContentType="password"
                value={password}
              />

              <View style={styles.loginButton}>
                <PrimaryButton label="LOGIN" accessibilityLabel="Login" onPress={handleLogin} />
              </View>
            </View>

            <Text style={styles.socialTitle}>OR</Text>
            <Pressable
              accessibilityLabel="Entrar com Google"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onGoogleLogin}
              style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
            >
              <View style={styles.googleCTA}>
                <Image 
                  source={require('../assets/googleIcon.png')} 
                  style={styles.googleIcon} 
                />
                <Text style={styles.accountText}>Continue with Google</Text>
              </View>
            </Pressable>

            <View style={styles.accountRow}>
              <Text style={styles.accountText}>Don't have an account? </Text>
              <Pressable
                accessibilityLabel="Criar uma conta"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onSignUp}
              >
                <Text style={styles.accountLink}>Sing up</Text>
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
    paddingTop: 40,
  },
  logoContainer: {
    marginBottom: 26,
  },
  title: {
    color: colors.primary,
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
  socialTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 43,
  },
  googleButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    textAlign: 'center',
    marginTop: 29,
    maxWidth: 350,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 100,
  },
  googleIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  googleCTA: {
    flexDirection: 'row',
    alignItems: 'center',     // <--- Alinha o ícone e o texto no eixo vertical
    justifyContent: 'center',
    gap: 10,
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
    fontSize: 14,
  },
  accountLink: {
    color: colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
