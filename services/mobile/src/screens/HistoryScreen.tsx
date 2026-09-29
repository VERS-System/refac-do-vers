/**
 * Implementa a tela de histórico energético (Task 06, lotes 06a–06b).
 *
 * Existe para dar ao histórico uma rota standalone sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback e reutiliza o
 * `BatteryCalendar` da Task 05 como base de navegação mensal. Mês inicial e
 * limites chegam por props e apenas trava a navegação fora deles; a lista de
 * períodos entra nos lotes seguintes e aqui há só o vazio inicial.
 * Dados chegam por props (fixtures até o F06); nada é calculado, buscado ou
 * persistido aqui.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BatteryCalendar, type CalendarMonthLimit } from '../components/BatteryCalendar';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

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
  onSelectDay?: (isoDate: string) => void;
  onMonthChange?: (month: number, year: number) => void;
};

/**
 * Apresenta cabeçalho, calendário mensal reutilizado com mês inicial e
 * limites por props e vazio inicial da lista, delegando voltar, seleção e
 * troca de mês por callbacks puros.
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
  onSelectDay,
  onMonthChange,
}: HistoryScreenProps) {
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
        <Text
          accessibilityLabel="Nenhum período disponível."
          accessibilityRole="alert"
          style={styles.emptyText}
          testID="history-empty"
        >
          Nenhum período disponível.
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
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
