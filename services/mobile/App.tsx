/**
 * Define o ponto de entrada visual do aplicativo mobile do VERS.
 */

import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

const SPLASH_DURATION_MS = 1500;

/**
 * Mantém o bootstrap local (temporizador e sessão provisória) e delega ao
 * `RootNavigator` a escolha do fluxo visível.
 */
export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /** Agenda a saída da Splash e cancela o temporizador se o app for desmontado. */
  useEffect(() => {
    const timeout = setTimeout(() => setIsSplashVisible(false), SPLASH_DURATION_MS);

    return () => clearTimeout(timeout);
  }, []);

  /** Libera apenas localmente a área principal até a API de autenticação existir. */
  function handleAuthenticated() {
    setIsAuthenticated(true);
  }

  return (
    <SafeAreaProvider>
      <RootNavigator
        isAuthenticated={isAuthenticated}
        isSplashVisible={isSplashVisible}
        onAuthenticated={handleAuthenticated}
      />
      <StatusBar hidden />
    </SafeAreaProvider>
  );
}
