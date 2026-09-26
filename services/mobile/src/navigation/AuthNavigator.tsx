/**
 * Organiza as rotas públicas de Login e Cadastro do aplicativo mobile.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createContext, useContext } from 'react';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();
const AuthenticatedContext = createContext<(() => void) | undefined>(undefined);

/** Conecta o link de Cadastro do Login à rota correspondente. */
function LoginRoute({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const onAuthenticated = useContext(AuthenticatedContext);

  /** Abre a tela de criação de conta sem remover o Login do histórico. */
  function handleSignUp() {
    navigation.navigate('Register');
  }

  return <LoginScreen onLogin={onAuthenticated} onSignUp={handleSignUp} />;
}

/** Conecta o link inferior do Cadastro ao retorno para a tela de Login. */
function RegisterRoute({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Register'>) {
  const onAuthenticated = useContext(AuthenticatedContext);

  /** Retorna ao Login preservado na pilha de autenticação. */
  function handleLogin() {
    navigation.goBack();
  }

  return <RegisterScreen onLogin={handleLogin} onRegister={onAuthenticated} />;
}

type AuthNavigatorProps = {
  onAuthenticated?: () => void;
};

/**
 * Renderiza o navegador público sem cabeçalho nativo para respeitar o layout
 * integral definido nos mockups de autenticação.
 */
export function AuthNavigator({ onAuthenticated }: AuthNavigatorProps) {
  return (
    <AuthenticatedContext.Provider value={onAuthenticated}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            animation: 'fade',
            contentStyle: { backgroundColor: '#0c0c0c' },
            headerShown: false,
          }}
        >
          <Stack.Screen component={LoginRoute} name="Login" />
          <Stack.Screen component={RegisterRoute} name="Register" />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthenticatedContext.Provider>
  );
}
