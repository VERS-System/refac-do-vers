/**
 * Implementa o scaffold da tela do sistema VERS (Task 07, lote 07a).
 *
 * Existe para dar ao sistema VERS uma rota própria na aba `vers` sem criar
 * pilha nova: usa o `ScreenShell` padrão, o `AppHeader` com voltar por
 * callback e a `BottomNavigation` com a aba vers ativa. Dados e rótulos
 * virão por props nos lotes seguintes (fixtures até F01/F05); nada é
 * calculado, buscado, persistido ou reinterpretado aqui e ausências nunca
 * viram zero. Nenhum segredo operacional (deviceUid, MQTT, tópicos, série)
 * passa por esta tela.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type VersSystemScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
};

/**
 * Apresenta cabeçalho e vazio inicial do sistema VERS, delegando voltar e
 * troca de aba por callbacks.
 */
export function VersSystemScreen({ onTabPress, onBack }: VersSystemScreenProps) {
  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="vers" onTabPress={onTabPress} />}
      testID="vers-system-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Montagem associada ao veículo"
        testID="vers-system-header"
        title="Sistema VERS"
      />

      <View style={styles.emptyBlock}>
        <Text
          accessibilityLabel="Nenhum sistema VERS vinculado."
          accessibilityRole="alert"
          style={styles.emptyText}
          testID="vers-empty"
        >
          Nenhum sistema VERS vinculado.
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
