/**
 * Implementa a tela de histórico energético (Task 06, lotes 06a–06c).
 *
 * Existe para dar ao histórico uma rota standalone sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback, reutiliza o
 * `BatteryCalendar` da Task 05 como base de navegação mensal e apresenta o
 * resumo pronto do dia selecionado com acesso aos testes por callback. Mês
 * inicial e limites chegam por props e apenas travam a navegação fora deles;
 * a lista de períodos entra nos lotes seguintes e aparece só o vazio inicial.
 * Dados chegam por props (fixtures até o F06); nada é calculado, buscado ou
 * persistido aqui e ausências nunca viram zero.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
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
  onSelectDay?: (isoDate: string) => void;
  onMonthChange?: (month: number, year: number) => void;
};

/**
 * Apresenta cabeçalho, calendário mensal reutilizado com mês inicial e
 * limites por props, resumo do dia quando houver e vazio inicial da lista,
 * delegando voltar, seleção, troca de mês e acesso aos testes por callbacks.
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
        ) : (
          <Text
            accessibilityLabel="Nenhum período disponível."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="history-empty"
          >
            Nenhum período disponível.
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
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
