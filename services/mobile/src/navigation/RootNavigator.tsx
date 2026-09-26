/**
 * Define os três estados visuais raiz do aplicativo mobile do VERS.
 *
 * Existe para tirar do `App` a decisão de qual fluxo exibir e deixá-la
 * explícita e testável: apresentação, fluxo público ou área autenticada. Não
 * decide sessão nem autoriza nada; apenas recebe o estado (hoje local, no
 * futuro vindo do bootstrap) e renderiza o fluxo correspondente.
 */

import { AuthNavigator } from './AuthNavigator';
import { HomeScreen } from '../screens/HomeScreen';
import { SplashScreen } from '../screens/SplashScreen';

type RootNavigatorProps = {
  /** Enquanto verdadeiro, a apresentação cobre os fluxos. */
  isSplashVisible: boolean;
  /** Quando verdadeiro (e sem splash), exibe a área autenticada. */
  isAuthenticated: boolean;
  /** Chamado pelo fluxo público ao concluir o login local. */
  onAuthenticated: () => void;
};

/**
 * Renderiza splash, autenticação ou home conforme o estado recebido, sem
 * conter temporizador, sessão ou regra de acesso.
 */
export function RootNavigator({ isSplashVisible, isAuthenticated, onAuthenticated }: RootNavigatorProps) {
  if (isSplashVisible) {
    return <SplashScreen />;
  }

  if (isAuthenticated) {
    return <HomeScreen />;
  }

  return <AuthNavigator onAuthenticated={onAuthenticated} />;
}
