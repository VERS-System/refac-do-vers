/**
 * Organiza as rotas públicas de Login e Cadastro do aplicativo mobile.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createContext, useContext } from 'react';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { useFocusLogoAnimationRun } from './focusRunCounter';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();
const AuthenticatedContext = createContext<(() => void) | undefined>(undefined);

/**
 * Opções das telas de autenticação. A transição é instantânea (`none`) porque
 * a suavização padrão cruza as telas e deixa uma "sombra" da logo durante o
 * movimento das barras.
 */
export const AUTH_SCREEN_OPTIONS = {
  animation: 'none',
  contentStyle: { backgroundColor: '#0c0c0c' },
  headerShown: false,
} as const;

/** Conecta o link de Cadastro do Login à rota correspondente. */
function LoginRoute({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const onAuthenticated = useContext(AuthenticatedContext);
  /** Não anima a logo na primeira exibição, logo após a splash. */
  const animationRun = useFocusLogoAnimationRun(true);

  /** Abre a tela de criação de conta sem remover o Login do histórico. */
  function handleSignUp() {
    navigation.navigate('Register');
  }

  return (
    <LoginScreen
      animationRun={animationRun}
      onLogin={onAuthenticated}
      onSignUp={handleSignUp}
    />
  );
}

/** Conecta o link inferior do Cadastro ao retorno para a tela de Login. */
function RegisterRoute({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Register'>) {
  const onAuthenticated = useContext(AuthenticatedContext);
  /** Anima a logo já na primeira exibição, pois a tela só é alcançada navegando. */
  const animationRun = useFocusLogoAnimationRun(false);

  /** Retorna ao Login preservado na pilha de autenticação. */
  function handleLogin() {
    navigation.goBack();
  }

  return (
    <RegisterScreen
      animationRun={animationRun}
      onLogin={handleLogin}
      onRegister={onAuthenticated}
    />
  );
}

type AuthNavigatorProps = {
  onAuthenticated?: () => void;
};

/**
 * Renderiza o navegador público sem cabeçalho nativo para respeitar o layout
 * integral definido nos mockups de autenticação. Ao focar cada tela, dispara a
 * animação de encaixe das barras da logo.
 */
export function AuthNavigator({ onAuthenticated }: AuthNavigatorProps) {
  return (
    <AuthenticatedContext.Provider value={onAuthenticated}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={AUTH_SCREEN_OPTIONS}>
          <Stack.Screen component={LoginRoute} name="Login" />
          <Stack.Screen component={RegisterRoute} name="Register" />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthenticatedContext.Provider>
  );
}