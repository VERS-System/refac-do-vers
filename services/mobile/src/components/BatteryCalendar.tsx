/**
 * Fornece o calendário mensal da tela de bateria (mockup battery1).
 *
 * Existe para navegar entre meses e selecionar o dia de referência dos
 * indicadores: a grade usa o calendário real (JS `Date`), os dias com dados
 * aparecem em destaque e o dia selecionado recebe o círculo. Datas e dados
 * chegam por props (fixtures até o F06/Task 06); o componente não busca nada.
 * Os limites `minMonth`/`maxMonth` (base da Task 06) travam a navegação sem
 * notificar; ausentes, a navegação é livre como na Task 05.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Monta o identificador `YYYY-MM-DD` de um dia do mês exibido. */
function toIsoDate(year: number, month: number, day: number): string {
  const paddedMonth = String(month + 1).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');

  return `${year}-${paddedMonth}-${paddedDay}`;
}

/** Limite mensal aceito (mês 0–11 + ano); ausente significa sem limite. */
export type CalendarMonthLimit = {
  month: number;
  year: number;
};

type BatteryCalendarProps = {
  month?: number;
  year?: number;
  /** Dia selecionado no formato `YYYY-MM-DD`. */
  selectedDate?: string | null;
  /** Dias com dados, em destaque, no formato `YYYY-MM-DD`. */
  daysWithData?: string[];
  /** Mês mínimo navegável; anterior a ele trava sem notificar. */
  minMonth?: CalendarMonthLimit;
  /** Mês máximo navegável; posterior a ele trava sem notificar. */
  maxMonth?: CalendarMonthLimit;
  onSelectDay?: (isoDate: string) => void;
  onMonthChange?: (month: number, year: number) => void;
};

/**
 * Renderiza o cabeçalho do mês com navegação e a grade de dias; a troca de
 * mês e a seleção são locais e apenas notificadas por callbacks.
 */
export function BatteryCalendar({
  month: initialMonth,
  year: initialYear,
  selectedDate,
  daysWithData = [],
  minMonth,
  maxMonth,
  onSelectDay,
  onMonthChange,
}: BatteryCalendarProps) {
  const today = new Date();
  const [month, setMonth] = useState(initialMonth ?? today.getMonth());
  const [year, setYear] = useState(initialYear ?? today.getFullYear());
  const [selected, setSelected] = useState<string | null>(selectedDate ?? null);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  /** Verdadeiro quando o mês exibido já é o mínimo aceito. */
  const isAtMin =
    minMonth != null &&
    (year < minMonth.year || (year === minMonth.year && month <= minMonth.month));
  /** Verdadeiro quando o mês exibido já é o máximo aceito. */
  const isAtMax =
    maxMonth != null &&
    (year > maxMonth.year || (year === maxMonth.year && month >= maxMonth.month));

  /** Move o mês exibido, virando o ano nas bordas, e notifica o chamador. */
  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    const nextMonth = next.getMonth();
    const nextYear = next.getFullYear();

    if (
      delta < 0 &&
      minMonth != null &&
      (nextYear < minMonth.year ||
        (nextYear === minMonth.year && nextMonth < minMonth.month))
    ) {
      return;
    }

    if (
      delta > 0 &&
      maxMonth != null &&
      (nextYear > maxMonth.year ||
        (nextYear === maxMonth.year && nextMonth > maxMonth.month))
    ) {
      return;
    }

    setMonth(nextMonth);
    setYear(nextYear);
    onMonthChange?.(nextMonth, nextYear);
  }

  /** Marca o dia como selecionado e notifica o chamador. */
  function selectDay(day: number) {
    const isoDate = toIsoDate(year, month, day);

    setSelected(isoDate);
    onSelectDay?.(isoDate);
  }

  return (
    <View testID="battery-calendar">
      <View style={styles.header}>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <View style={styles.navButtons}>
          <Pressable
            accessibilityLabel="Mês anterior"
            accessibilityRole="button"
            accessibilityState={{ disabled: isAtMin }}
            disabled={isAtMin}
            hitSlop={8}
            onPress={() => changeMonth(-1)}
          >
            <Ionicons color={theme.colors.primary} name="chevron-back" size={20} />
          </Pressable>
          <Pressable
            accessibilityLabel="Próximo mês"
            accessibilityRole="button"
            accessibilityState={{ disabled: isAtMax }}
            disabled={isAtMax}
            hitSlop={8}
            onPress={() => changeMonth(1)}
          >
            <Ionicons color={theme.colors.primary} name="chevron-forward" size={20} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEK_DAYS.map((weekDay) => (
          <Text key={weekDay} style={styles.weekDay}>
            {weekDay}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const isoDate = toIsoDate(year, month, day);
          const isSelected = isoDate === selected;
          const hasData = daysWithData.includes(isoDate);

          return (
            <View key={isoDate} style={styles.dayCell}>
              <Pressable
                accessibilityLabel={`${day}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                hitSlop={4}
                onPress={() => selectDay(day)}
                style={[styles.dayButton, isSelected && styles.daySelected]}
              >
                <Text style={[styles.dayText, hasData && styles.dayWithData]}>
                  {day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthLabel: {
    color: theme.colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  weekDay: {
    color: theme.colors.white,
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  dayCell: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  dayButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  daySelected: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    color: theme.colors.white,
    fontSize: 14,
  },
  dayWithData: {
    color: theme.colors.primary,
  },
});
