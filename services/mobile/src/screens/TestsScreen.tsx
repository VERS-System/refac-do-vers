/**
 * Implementa a tela de testes experimentais (Task 08, lotes 08a–08b).
 *
 * Existe para dar aos testes uma rota interna sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback e a
 * `BottomNavigation` com a aba de origem. A listagem paginada chega pronta
 * por props (fixtures até F01/F05); filtros, detalhes, planejamento e
 * confirmações vêm nos lotes seguintes. Nada é calculado, buscado,
 * persistido ou presumido aqui e nenhuma transição é concluída localmente.
 * Nenhum comando MQTT passa por esta tela.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type TestsScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Aba de origem herdada na barra; padrão é a bateria. */
  activeTab?: MainTab;
  /** Itens da página atual; vêm fatiados do contrato como no envelope. */
  items?: TestListItem[];
  /** Página atual (base 1), como no `meta` do contrato. */
  page?: number;
  /** Tamanho da página, como no `meta` do contrato. */
  pageSize?: number;
  /** Total de itens, como no `meta` do contrato. */
  totalItems?: number;
  /** Troca de página; ausente só exibe o rótulo sem navegar. */
  onPageChange?: (page: number) => void;
  /** Seleciona o teste para detalhes; ausente só exibe as linhas. */
  onSelectTest?: (testId: string) => void;
};

/** Estado público do teste, como no contrato (F05 futuro). */
export type TestListStatus = 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/** Linha da lista de testes; vem pronta do contrato. */
export type TestListItem = {
  /** Identificador estável do teste. */
  id: string;
  /** Nome do teste como veio do contrato. */
  name: string;
  /** Estado público; exibe o rótulo traduzido. */
  status: TestListStatus;
  /** Período cru como veio do contrato; sem formatação local. */
  periodLabel?: string | null;
};

/** Rótulos públicos de estado; o código cru nunca é exibido. */
const TEST_STATUS_LABELS: Record<TestListStatus, string> = {
  PLANNED: 'Planejado',
  RUNNING: 'Em execução',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

/**
 * Apresenta cabeçalho e listagem paginada dos testes, delegando voltar,
 * seleção, paginação e troca de aba por callbacks.
 */
export function TestsScreen({ onTabPress, onBack, activeTab = 'battery', items = [], page = 1, pageSize = 20, totalItems, onPageChange, onSelectTest }: TestsScreenProps) {
  const total = totalItems ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  /** Vai à página vizinha dentro dos limites e notifica o chamador. */
  function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) {
      return;
    }

    onPageChange?.(next);
  }

  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab={activeTab} onTabPress={onTabPress} />}
      testID="tests-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Criação, acompanhamento e consulta"
        testID="tests-header"
        title="Testes"
      />

      <View style={styles.emptyBlock}>
        {items.length > 0 ? (
          <View style={styles.listCard} testID="tests-list">
            {items.map((item) => (
              <Pressable
                accessibilityLabel={item.name}
                accessibilityRole="button"
                key={item.id}
                onPress={() => onSelectTest?.(item.id)}
                style={styles.listRow}
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowStatus}>{TEST_STATUS_LABELS[item.status]}</Text>
                {item.periodLabel ? (
                  <Text style={styles.rowPeriod}>{item.periodLabel}</Text>
                ) : null}
              </Pressable>
            ))}
            <View style={styles.pagerRow}>
              <Pressable
                accessibilityLabel="Página anterior"
                accessibilityRole="button"
                accessibilityState={{ disabled: page <= 1 }}
                disabled={page <= 1}
                hitSlop={8}
                onPress={() => goToPage(page - 1)}
              >
                <Ionicons color={theme.colors.primary} name="chevron-back" size={20} />
              </Pressable>
              <Text style={styles.pagerLabel}>
                {`Página ${page} de ${totalPages}`}
              </Text>
              <Pressable
                accessibilityLabel="Próxima página"
                accessibilityRole="button"
                accessibilityState={{ disabled: page >= totalPages }}
                disabled={page >= totalPages}
                hitSlop={8}
                onPress={() => goToPage(page + 1)}
              >
                <Ionicons color={theme.colors.primary} name="chevron-forward" size={20} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Text
            accessibilityLabel="Nenhum teste disponível."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="tests-empty"
          >
            Nenhum teste disponível.
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
    marginTop: 18,
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
  rowName: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  rowStatus: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  rowPeriod: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: 2,
  },
  pagerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  pagerLabel: {
    color: theme.colors.gray,
    fontSize: 12,
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
