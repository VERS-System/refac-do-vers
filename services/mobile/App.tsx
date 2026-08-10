/**
 * Define o ponto de entrada visual do aplicativo mobile do VERS.
 */

import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { SplashScreen } from './src/screens/SplashScreen';

const SPLASH_DURATION_MS = 1500;

/**
 * Renderiza o fluxo inicial e troca a apresentação pela autenticação depois que
 * o tempo mínimo de exposição da marca é concluído.
 */
export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  /** Agenda a saída da Splash e cancela o temporizador se o app for desmontado. */
  useEffect(() => {
    const timeout = setTimeout(() => setIsSplashVisible(false), SPLASH_DURATION_MS);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      {isSplashVisible ? <SplashScreen /> : <AuthNavigator />}
      <StatusBar hidden />
    </>
  );
}
