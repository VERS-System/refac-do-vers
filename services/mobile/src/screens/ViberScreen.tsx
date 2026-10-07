/**
 * Implementa a tela do Viber (Task 11, lote 11a).
 *
 * Existe para dar à conversa com o assistente uma rota interna sem criar
 * aba nova: usa o `ScreenShell` padrão, o `AppHeader` com voltar por
 * callback e a `BottomNavigation` com a aba home de origem. Histórico,
 * composição, selos, atalhos e estados chegam por props nos próximos
 * lotes (fixtures até o contrato do ai-service). Nada é calculado,
 * buscado, persistido ou decidido aqui; prompts, dados e chaves pertencem
 * ao backend/ai-service.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type ViberScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
};

/**
 * Renderiza o scaffold da conversa com o Viber, hoje só título e vazio.
 */
export function ViberScreen({ onBack, onTabPress }: ViberScreenProps) {
  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="home" onTabPress={onTabPress} />}
      testID="viber-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Assistente do VERS"
        testID="viber-header"
        title="Viber"
      />

      <View style={styles.emptyBlock}>
        <Text
          accessibilityLabel="Nenhuma conversa ainda."
          accessibilityRole="alert"
          style={styles.emptyText}
          testID="viber-empty"
        >
          Nenhuma conversa ainda.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  emptyBlock: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.gray,
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
});
