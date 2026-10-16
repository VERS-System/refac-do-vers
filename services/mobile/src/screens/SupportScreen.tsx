/**
 * Implementa a tela de Suporte (Task 12, lote 12a).
 *
 * Existe para dar às solicitações de revisão do sistema VERS uma rota
 * interna sem criar aba nova: usa o `ScreenShell` padrão e o `AppHeader`
 * com voltar por callback. A lista, os detalhes, o formulário, a
 * confirmação e os estados chegam por props nos próximos lotes (fixtures
 * até F01/F05, campos e status do contrato de suporte). Nada é calculado,
 * buscado, persistido ou decidido aqui; autorização, vínculo e transições
 * de estado pertencem ao backend.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type SupportScreenProps = {
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
};

/**
 * Renderiza o scaffold do suporte com a lista vazia; lista, detalhes e
 * formulário chegam nos próximos lotes por props.
 */
export function SupportScreen({ onBack }: SupportScreenProps) {
  return (
    <ScreenShell testID="support-screen">
      <AppHeader
        onBack={onBack}
        subtitle="Revisão do sistema VERS"
        testID="support-header"
        title="Suporte"
      />
      <View style={styles.emptyBlock}>
        <Text
          accessibilityLabel="Nenhuma solicitação ainda."
          accessibilityRole="alert"
          style={styles.emptyText}
          testID="support-empty"
        >
          Nenhuma solicitação ainda.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /** Bloco do vazio; só espaçamento, sem identidade própria. */
  emptyBlock: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  /** Texto do vazio; cor neutra do tema, sem dado inventado. */
  emptyText: {
    color: theme.colors.gray,
    fontSize: 14,
    textAlign: 'center',
  },
});
