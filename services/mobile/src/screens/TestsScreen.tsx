/**
 * Implementa a tela de testes experimentais (Task 08, lotes 08a–08c).
 *
 * Existe para dar aos testes uma rota interna sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback e a
 * `BottomNavigation` com a aba de origem. A listagem paginada e os filtros
 * visuais chegam prontos por props (fixtures até F01/F05); detalhes,
 * planejamento e confirmações vêm nos lotes seguintes. Nada é calculado,
 * buscado, persistido ou presumido aqui e nenhuma transição é concluída
 * localmente. Nenhum comando MQTT passa por esta tela.
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
  /** Filtro de estado exibido; `ALL` significa sem filtro. */
  statusFilter?: TestListStatus | 'ALL' | null;
  /** Filtro de instalação exibido como veio do contrato. */
  installationFilter?: string | null;
  /** Troca de filtro; ausente só exibe os rótulos sem notificar. */
  onFilterChange?: (filter: TestFilter) => void;
};

/** Filtro visual da lista; só representa o filtro do contrato. */
export type TestFilter = {
  statusFilter: TestListStatus | 'ALL';
  installationFilter: string | null;
};

/** Opções visuais de filtro de estado, com o rótulo exibido. */
const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: TestListStatus | 'ALL'; label: string }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Planejado', value: 'PLANNED' },
  { label: 'Em execução', value: 'RUNNING' },
  { label: 'Concluído', value: 'COMPLETED' },
  { label: 'Falhou', value: 'FAILED' },
  { label: 'Cancelado', value: 'CANCELLED' },
];

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
 * Apresenta cabeçalho, filtros visuais e listagem paginada dos testes,
 * delegando voltar, filtro, seleção, paginação e troca de aba por callbacks.
 */
export function TestsScreen({ onTabPress, onBack, activeTab = 'battery', items = [], page = 1, pageSize = 20, totalItems, onPageChange, onSelectTest, statusFilter = 'ALL', installationFilter = null, onFilterChange }: TestsScreenProps) {
  const total = totalItems ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentStatus: TestListStatus | 'ALL' = statusFilter ?? 'ALL';
  const currentFilter: TestFilter = { installationFilter: installationFilter ?? null, statusFilter: currentStatus };

  /** Vai à página vizinha dentro dos limites e notifica o chamador. */
  function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) {
      return;
    }

    onPageChange?.(next);
  }

  /** Notifica a troca de filtro sem aplicar regra local. */
  function changeStatusFilter(next: TestListStatus | 'ALL') {
    onFilterChange?.({ ...currentFilter, statusFilter: next });
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
        <View style={styles.filterCard} testID="tests-filters">
          <Text style={styles.filterLabel}>
            {`Filtro: ${currentStatus === 'ALL' ? 'Todos' : TEST_STATUS_LABELS[currentStatus]}`}
          </Text>
          {currentFilter.installationFilter ? (
            <Text style={styles.filterLabel}>{currentFilter.installationFilter}</Text>
          ) : null}
          <View style={styles.filterRow}>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <Pressable
                accessibilityLabel={`Filtrar: ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: currentStatus === option.value }}
                hitSlop={8}
                key={option.value}
                onPress={() => changeStatusFilter(option.value)}
                style={styles.filterChip}
              >
                <Text style={styles.filterChipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

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
    gap: 16,
    marginTop: 18,
    width: '100%',
  },
  filterCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    width: '100%',
  },
  filterLabel: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  filterChip: {
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: {
    color: theme.colors.primary,
    fontSize: 11,
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
