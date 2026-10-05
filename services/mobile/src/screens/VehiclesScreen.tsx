/**
 * Implementa o scaffold da tela de veículos (Task 10, lote 10a).
 *
 * Existe para dar aos veículos uma rota interna sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback e a
 * `BottomNavigation` com a aba profile de origem. Lista, detalhes, cadastro,
 * edição, principal e remoção chegam por props nos lotes seguintes (fixtures
 * até F01/F05); nada é calculado, buscado, persistido ou decidido aqui.
 * Unicidade da placa, vínculo, principal e remoção atômica pertencem ao
 * backend. Sem CPF, CRLV, RENAVAM ou documentos no MVP.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type VehiclesScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
};

/**
 * Apresenta cabeçalho e lista vazia inicial dos veículos, delegando voltar
 * e troca de aba por callbacks.
 */
export function VehiclesScreen({ onTabPress, onBack }: VehiclesScreenProps) {
  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="profile" onTabPress={onTabPress} />}
      testID="vehicles-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Lista, detalhes e cadastro"
        testID="vehicles-header"
        title="Veículos"
      />

      <View style={styles.emptyBlock}>
        <Text
          accessibilityLabel="Nenhum veículo vinculado."
          accessibilityRole="alert"
          style={styles.emptyText}
          testID="vehicles-empty"
        >
          Nenhum veículo vinculado.
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
