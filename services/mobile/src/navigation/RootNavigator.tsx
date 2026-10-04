/**
 * Define os três estados visuais raiz do aplicativo mobile do VERS.
 *
 * Existe para tirar do `App` a decisão de qual fluxo exibir e deixá-la
 * explícita e testável: apresentação, fluxo público ou área autenticada. Não
 * decide sessão nem autoriza nada; apenas recebe o estado (hoje local, no
 * futuro vindo do bootstrap) e renderiza o fluxo correspondente. A aba ativa
 * da área autenticada é estado local de navegação, sem relação com sessão.
 */

import { useState } from 'react';
import { AuthNavigator } from './AuthNavigator';
import { BatteryScreen } from '../screens/BatteryScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { VersSystemScreen } from '../screens/VersSystemScreen';
import type { MainTab } from '../components/BottomNavigation';
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
 * Renderiza splash, autenticação ou a aba ativa da área autenticada conforme
 * o estado recebido, sem conter temporizador, sessão ou regra de acesso.
 */
export function RootNavigator({ isSplashVisible, isAuthenticated, onAuthenticated }: RootNavigatorProps) {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [isHistoryVisible, setHistoryVisible] = useState(false);

  if (isSplashVisible) {
    return <SplashScreen />;
  }

  if (isAuthenticated) {
    if (isHistoryVisible) {
      return <HistoryScreen onBack={() => setHistoryVisible(false)} onTabPress={setActiveTab} />;
    }

    if (activeTab === 'battery') {
      return <BatteryScreen onOpenHistory={() => setHistoryVisible(true)} onTabPress={setActiveTab} />;
    }

    if (activeTab === 'vers') {
      return <VersSystemScreen onTabPress={setActiveTab} />;
    }

    return <HomeScreen onOpenVersSystem={() => setActiveTab('vers')} onTabPress={setActiveTab} />;
  }

  return <AuthNavigator onAuthenticated={onAuthenticated} />;
}
