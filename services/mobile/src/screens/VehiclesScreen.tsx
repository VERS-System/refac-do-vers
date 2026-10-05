/**
 * Implementa a tela de veículos (Task 10, lotes 10a–10b).
 *
 * Existe para dar aos veículos uma rota interna sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback e a
 * `BottomNavigation` com a aba profile de origem. A listagem chega pronta
 * por props (fixtures até F01/F05); detalhes, cadastro, edição, principal e
 * remoção vêm nos lotes seguintes. Nada é calculado, buscado, persistido ou
 * decidido aqui. Sem CPF, CRLV, RENAVAM ou documentos no MVP.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type VehiclesScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Itens vinculados; vêm prontos do contrato. */
  items?: VehicleListItem[];
  /** Seleciona o veículo para detalhes; ausente só exibe as linhas. */
  onSelectVehicle?: (vehicleId: string) => void;
  /** Abre o cadastro; ausente omite o botão. */
  onOpenCreate?: () => void;
};

/** Linha da lista de veículos; vem pronta do contrato. */
export type VehicleListItem = {
  /** Identificador estável do veículo. */
  id: string;
  /** Placa normalizada; imutável após o cadastro. */
  licensePlate: string;
  /** Marca; `null` omite a linha. */
  brand?: string | null;
  /** Modelo; `null` omite a linha. */
  model?: string | null;
  /** Principal da conta. */
  isPrimary?: boolean | null;
};

/**
 * Apresenta cabeçalho e listagem dos veículos, delegando voltar, seleção,
 * cadastro e troca de aba por callbacks.
 */
export function VehiclesScreen({ onTabPress, onBack, items = [], onSelectVehicle, onOpenCreate }: VehiclesScreenProps) {
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
        {onOpenCreate ? (
          <View style={styles.createButton}>
            <PrimaryButton
              accessibilityLabel="Cadastrar veículo"
              label="CADASTRAR"
              onPress={() => onOpenCreate?.()}
            />
          </View>
        ) : null}

        {items.length > 0 ? (
          <View style={styles.listCard} testID="vehicles-list">
            {items.map((item) => (
              <Pressable
                accessibilityLabel={`${item.licensePlate} ${item.model ?? ''}`.trim()}
                accessibilityRole="button"
                key={item.id}
                onPress={() => onSelectVehicle?.(item.id)}
                style={styles.listRow}
              >
                <Text style={styles.plateText}>{item.licensePlate}</Text>
                {item.model ? (
                  <Text style={styles.modelText}>{item.model}</Text>
                ) : null}
                {item.isPrimary ? (
                  <Text style={styles.primarySeal}>Principal</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <Text
            accessibilityLabel="Nenhum veículo vinculado."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="vehicles-empty"
          >
            Nenhum veículo vinculado.
          </Text>
        )}
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
    gap: 16,
    marginTop: 18,
    width: '100%',
  },
  createButton: {
    maxWidth: 350,
    width: '100%',
  },
  listCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    width: '100%',
  },
  listRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  plateText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modelText: {
    color: theme.colors.gray,
    fontSize: 12,
    marginTop: 2,
  },
  primarySeal: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
