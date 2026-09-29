/**
 * Implementa a tela de histórico energético (Task 06, lotes 06a–06e).
 *
 * Existe para dar ao histórico uma rota standalone sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback, reutiliza o
 * `BatteryCalendar` da Task 05 como base de navegação mensal, apresenta o
 * resumo pronto do dia selecionado com acesso aos testes, a lista histórica
 * paginada espelhando o envelope do contrato e os estados visuais por prop.
 * Mês inicial e limites chegam por props e apenas travam a navegação fora
 * deles; vazio e indisponível mantêm o calendário (mês sem dados não parece
 * falha) e só carregamento e erro tomam a tela.
 * Dados chegam por props (fixtures até o F06); nada é calculado, buscado ou
 * persistido aqui e ausências nunca viram zero.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { AppSkeleton } from '../components/AppSkeleton';
import { BatteryCalendar, type CalendarMonthLimit } from '../components/BatteryCalendar';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

/** Resumo do dia selecionado; vem pronto do contrato (F06 futuro). */
export type HistoryDaySummary = {
  /** Rótulo do dia como veio do contrato; sem formatação local. */
  dateLabel: string;
  /** Energia recuperada em Wh; `null` é ausência, nunca vira zero. */
  recoveredEnergyWh: number | null;
  /** Unidade exibida. */
  energyUnit?: string;
  /** Qualidade dos dados exibidos. */
  qualityLabel?: string;
};

/** Estados visuais do histórico; a origem dos dados é do backend (F06 futuro). */
export type HistoryStatus =
  | 'loading'
  | 'success'
  | 'empty'
  | 'unavailable'
  | 'error';

/** Linha da lista histórica; vem pronta do contrato (F06 futuro). */
export type HistoryPeriodItem = {
  /** Identificador estável do período (ex. `2025-04-24`). */
  id: string;
  /** Rótulo do período como veio do contrato; sem formatação local. */
  periodLabel: string;
  /** Energia recuperada em Wh; `null` é ausência, nunca vira zero. */
  recoveredEnergyWh: number | null;
  /** Unidade exibida. */
  energyUnit?: string;
  /** Qualidade dos dados exibidos. */
  qualityLabel?: string;
};

type HistoryScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Mês inicial do calendário (0–11); padrão é o mês atual. */
  month?: number;
  /** Ano inicial do calendário; padrão é o ano atual. */
  year?: number;
  /** Dia selecionado no formato `YYYY-MM-DD`. */
  selectedDate?: string | null;
  /** Dias com resumo, em destaque, no formato `YYYY-MM-DD`. */
  daysWithData?: string[];
  /** Mês mínimo navegável; ausente significa sem limite. */
  minMonth?: CalendarMonthLimit;
  /** Mês máximo navegável; ausente significa sem limite. */
  maxMonth?: CalendarMonthLimit;
  /** Resumo do dia selecionado; ausente mantém o vazio inicial. */
  summary?: HistoryDaySummary | null;
  /** Abre os testes relacionados ao resumo; ausente omite o atalho. */
  onOpenTests?: () => void;
  /** Itens da página atual; vêm fatiados do contrato como no envelope. */
  items?: HistoryPeriodItem[];
  /** Página atual (base 1), como no `meta` do contrato. */
  page?: number;
  /** Tamanho da página, como no `meta` do contrato. */
  pageSize?: number;
  /** Total de itens, como no `meta` do contrato. */
  totalItems?: number;
  /** Troca de página; ausente só exibe o rótulo sem navegar. */
  onPageChange?: (page: number) => void;
  /** Estado visual atual; `success` exibe calendário, resumo e lista. */
  status?: HistoryStatus;
  /** Repete a carga no erro; ausente mantém o botão sem efeito. */
  onRetry?: () => void;
  onSelectDay?: (isoDate: string) => void;
  onMonthChange?: (month: number, year: number) => void;
};

/**
 * Apresenta cabeçalho, calendário mensal reutilizado com mês inicial e
 * limites por props, resumo do dia, lista paginada e estados visuais,
 * delegando voltar, seleção, troca de mês, paginação, nova tentativa e acesso
 * aos testes por callbacks.
 */
export function HistoryScreen({
  onTabPress,
  onBack,
  month,
  year,
  selectedDate,
  daysWithData = [],
  minMonth,
  maxMonth,
  summary = null,
  onOpenTests,
  items = [],
  page = 1,
  pageSize = 20,
  totalItems,
  onPageChange,
  status = 'success',
  onRetry,
  onSelectDay,
  onMonthChange,
}: HistoryScreenProps) {
  const total = totalItems ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  /** Vai à página vizinha dentro dos limites e notifica o chamador. */
  function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) {
      return;
    }

    onPageChange?.(next);
  }

  if (status === 'loading') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
        testID="history-screen"
      >
        <View
          accessibilityLabel="Carregando"
          accessibilityRole="progressbar"
          style={styles.stateBlock}
          testID="history-loading"
        >
          <AppSkeleton height={220} />
          <AppSkeleton height={140} />
        </View>
      </ScreenShell>
    );
  }

  if (status === 'error') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
        testID="history-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Não foi possível carregar o histórico. Tente novamente."
            accessibilityRole="alert"
            style={styles.stateText}
            testID="history-error"
          >
            Não foi possível carregar o histórico. Tente novamente.
          </Text>
          <View style={styles.retryButton}>
            <PrimaryButton
              accessibilityLabel="Tentar novamente"
              label="TENTAR NOVAMENTE"
              onPress={() => onRetry?.()}
            />
          </View>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
      testID="history-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Dias com resumo e períodos disponíveis"
        testID="history-header"
        title="Histórico"
      />

      <View style={styles.calendarCard}>
        <BatteryCalendar
          daysWithData={daysWithData}
          maxMonth={maxMonth}
          minMonth={minMonth}
          month={month}
          onMonthChange={onMonthChange}
          onSelectDay={onSelectDay}
          selectedDate={selectedDate}
          year={year}
        />
      </View>

      <View style={styles.emptyBlock}>
        {summary ? (
          <View style={styles.summaryCard} testID="history-summary">
            <Text style={styles.summaryDate}>{summary.dateLabel}</Text>
            {summary.recoveredEnergyWh != null && (
              <Text style={styles.summaryValue}>
                {`${summary.recoveredEnergyWh} ${summary.energyUnit ?? 'Wh'}`}
              </Text>
            )}
            {summary.qualityLabel ? (
              <Text style={styles.summaryQuality}>{summary.qualityLabel}</Text>
            ) : null}
            {onOpenTests && (
              <View style={styles.testsButton}>
                <PrimaryButton
                  accessibilityLabel="Ver testes do dia"
                  label="VER TESTES"
                  onPress={() => onOpenTests?.()}
                />
              </View>
            )}
          </View>
        ) : null}

        {items.length > 0 ? (
          <View style={styles.listCard} testID="history-list">
            {items.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <Text style={styles.rowPeriod}>{item.periodLabel}</Text>
                {item.recoveredEnergyWh != null && (
                  <Text style={styles.rowValue}>
                    {`${item.recoveredEnergyWh} ${item.energyUnit ?? 'Wh'}`}
                  </Text>
                )}
                {item.qualityLabel ? (
                  <Text style={styles.rowQuality}>{item.qualityLabel}</Text>
                ) : null}
              </View>
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
        ) : null}

        {!summary && items.length === 0 ? (
          status === 'unavailable' ? (
            <Text
              accessibilityLabel="Período indisponível para consulta."
              accessibilityRole="alert"
              style={styles.stateText}
              testID="history-unavailable"
            >
              Período indisponível para consulta.
            </Text>
          ) : (
            <Text
              accessibilityLabel="Nenhum período disponível."
              accessibilityRole="alert"
              style={styles.emptyText}
              testID="history-empty"
            >
              Nenhum período disponível.
            </Text>
          )
        ) : null}
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
  calendarCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    padding: 16,
    width: '100%',
  },
  emptyBlock: {
    alignItems: 'center',
    marginTop: 18,
    width: '100%',
  },
  stateBlock: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stateText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    maxWidth: 350,
    width: '100%',
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    width: '100%',
  },
  summaryDate: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryValue: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryQuality: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: 4,
  },
  testsButton: {
    marginTop: 12,
    maxWidth: 350,
    width: '100%',
  },
  listCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    padding: 16,
    width: '100%',
  },
  listRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  rowPeriod: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  rowValue: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  rowQuality: {
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
