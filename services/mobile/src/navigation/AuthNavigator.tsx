/**
 * Organiza as rotas públicas de Login e Cadastro do aplicativo mobile.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Conecta o link de Cadastro do Login à rota correspondente. */
function LoginRoute({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  /** Abre a tela de criação de conta sem remover o Login do histórico. */
  function handleSignUp() {
    navigation.navigate('Register');
  }

  return <LoginScreen onSignUp={handleSignUp} />;
}

/** Conecta o link inferior do Cadastro ao retorno para a tela de Login. */
function RegisterRoute({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Register'>) {
  /** Retorna ao Login preservado na pilha de autenticação. */
  function handleLogin() {
    navigation.goBack();
  }

  return <RegisterScreen onLogin={handleLogin} />;
}

/**
 * Renderiza o navegador público sem cabeçalho nativo para respeitar o layout
 * integral definido nos mockups de autenticação.
 */
export function AuthNavigator() {
  return (
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
  );
}
