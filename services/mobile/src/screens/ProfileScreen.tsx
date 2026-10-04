/**
 * Implementa o scaffold da tela de perfil (Task 09, lote 09a).
 *
 * Existe para dar ao perfil uma rota própria na aba `profile` sem criar
 * pilha nova: usa o `ScreenShell` padrão, o `AppHeader` com voltar por
 * callback e a `BottomNavigation` com a aba profile ativa. Dados da conta,
 * edição, estados, atalhos e saída chegam por props nos lotes seguintes
 * (fixtures até F01/F05); nada é calculado, buscado, persistido ou decidido
 * aqui. Papéis, permissões e encerramento efetivo da sessão pertencem ao
 * backend.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type ProfileScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
};

/**
 * Apresenta cabeçalho e vazio inicial do perfil, delegando voltar e troca
 * de aba por callbacks.
 */
export function ProfileScreen({ onTabPress, onBack }: ProfileScreenProps) {
  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="profile" onTabPress={onTabPress} />}
      testID="profile-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Dados da conta e acessos"
        testID="profile-header"
        title="Perfil"
      />

      <View style={styles.emptyBlock}>
        <Text
          accessibilityLabel="Nenhum perfil disponível."
          accessibilityRole="alert"
          style={styles.emptyText}
          testID="profile-empty"
        >
          Nenhum perfil disponível.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 92,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  emptyBlock: {
    alignItems: 'center',
    marginTop: 18,
    width: '100%',
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
