/**
 * Implementa o scaffold da tela de histórico energético (Task 06, lote 06a).
 *
 * Existe para dar ao histórico uma rota standalone sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback e reutiliza o
 * `BatteryCalendar` da Task 05 como base de navegação mensal. A lista de
 * períodos entra nos lotes seguintes; aqui há só o vazio inicial.
 * Dados chegam por props (fixtures até o F06); nada é calculado, buscado ou
 * persistido aqui.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BatteryCalendar } from '../components/BatteryCalendar';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type HistoryScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Dia selecionado no formato `YYYY-MM-DD`. */
  selectedDate?: string | null;
  /** Dias com resumo, em destaque, no formato `YYYY-MM-DD`. */
  daysWithData?: string[];
  onSelectDay?: (isoDate: string) => void;
  onMonthChange?: (month: number, year: number) => void;
};

/**
 * Apresenta cabeçalho, calendário mensal reutilizado e vazio inicial da
 * lista, delegando voltar, seleção e troca de mês por callbacks puros.
 */
export function HistoryScreen({
  onTabPress,
  onBack,
  selectedDate,
  daysWithData = [],
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
          onMonthChange={onMonthChange}
          onSelectDay={onSelectDay}
          selectedDate={selectedDate}
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
