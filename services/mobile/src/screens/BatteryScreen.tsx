/**
 * Implementa a tela de bateria e energia conforme o mockup battery1.
 *
 * Registro mensal (donut + legenda), card "Today" com série horária e card
 * do calendário funcional. Dados chegam por props (fixtures até o F06);
 * nenhum valor é calculado aqui e ausências futuras serão `null`, nunca zero.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BatteryCalendar } from '../components/BatteryCalendar';
import { BatteryDonut } from '../components/BatteryDonut';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { EnergyBarChart } from '../components/EnergyBarChart';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

export type HourlyPoint = {
  label: string;
  value: number;
};

const DEFAULT_HOURLY: HourlyPoint[] = [
  { label: '11 AM', value: 52 },
  { label: '12 PM', value: 48 },
  { label: '1 PM', value: 72 },
  { label: '2 PM', value: 57 },
  { label: '3 PM', value: 75 },
  { label: '4 PM', value: 50 },
];

type BatteryScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  onSelectDay?: (isoDate: string) => void;
  onExpandToday?: () => void;
  /** Porcentagem recuperada do donut. */
  recoveredPercentage?: number;
  /** Série horária do card Today. */
  hourlyData?: HourlyPoint[];
  /** Dias com dados no formato `YYYY-MM-DD`. */
  daysWithData?: string[];
};

/**
 * Apresenta o registro mensal, a série do dia e o calendário, delegando
 * seleção do dia, expansão e navegação por callbacks.
 */
export function BatteryScreen({
  onTabPress,
  onSelectDay,
  onExpandToday,
  recoveredPercentage = 65,
  hourlyData = DEFAULT_HOURLY,
  daysWithData = [],
}: BatteryScreenProps) {
  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
      testID="battery-screen"
    >
      <Text style={styles.recordTitle}>MONTHLY RECORD</Text>

      <View style={styles.donutRow}>
        <BatteryDonut recoveredPercentage={recoveredPercentage} size={150} />
        <View style={styles.legend}>
          <Text style={styles.legendRecovered}>Battery Recovered</Text>
          <Text style={styles.legendUsed}>Battery Used</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today</Text>
          <Pressable
            accessibilityLabel="Expandir gráfico do dia"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onExpandToday}
          >
            <Ionicons color={theme.colors.primary} name="expand" size={18} />
          </Pressable>
        </View>
        <EnergyBarChart
          height={96}
          values={hourlyData.map((point) => point.value)}
        />
        <View style={styles.hourLabels}>
          {hourlyData.map((point) => (
            <Text key={point.label} style={styles.hourLabel}>
              {point.label}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <BatteryCalendar daysWithData={daysWithData} onSelectDay={onSelectDay} />
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
  recordTitle: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
  },
  donutRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  legend: {
    marginBottom: 8,
    marginLeft: 12,
  },
  legendRecovered: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  legendUsed: {
    color: theme.colors.gray,
    fontSize: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    padding: 16,
    width: '100%',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  hourLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
    paddingHorizontal: 5,
  },
  hourLabel: {
    color: theme.colors.primary,
    fontSize: 10,
  },
});
