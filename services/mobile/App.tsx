/**
 * Define o ponto de entrada visual do aplicativo mobile do VERS.
 */

import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { HomeScreen } from './src/screens/HomeScreen';
import { SplashScreen } from './src/screens/SplashScreen';

const SPLASH_DURATION_MS = 1500;

/**
 * Renderiza o fluxo inicial e troca a apresentação pela autenticação depois que
 * o tempo mínimo de exposição da marca é concluído.
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
      {isSplashVisible ? (
        <SplashScreen />
      ) : isAuthenticated ? (
        <HomeScreen />
      ) : (
        <AuthNavigator onAuthenticated={handleAuthenticated} />
      )}
      <StatusBar hidden />
    </SafeAreaProvider>
  );
}
