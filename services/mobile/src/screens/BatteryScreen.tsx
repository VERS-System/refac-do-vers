/**
 * Implementa a tela de bateria e energia conforme o mockup battery1.
 *
 * Registro mensal (donut + legenda), card "Today" com série horária e card
 * do calendário funcional. Dados chegam por props (fixtures até o F06);
 * nenhum valor é calculado aqui e ausências futuras serão `null`, nunca zero.
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BatteryCalendar } from '../components/BatteryCalendar';
import { BatteryDonut } from '../components/BatteryDonut';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { EnergyBarChart } from '../components/EnergyBarChart';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

export type HourlyPoint = {
  label: string;
  value: number;
  /** Origem do ponto; `unavailable` omite a barra sem zerar. */
  origin?: 'measured' | 'calculated' | 'unavailable';
};

const DEFAULT_HOURLY: HourlyPoint[] = [
  { label: '11 AM', value: 52 },
  { label: '12 PM', value: 48 },
  { label: '1 PM', value: 72 },
  { label: '2 PM', value: 57 },
  { label: '3 PM', value: 75 },
  { label: '4 PM', value: 50 },
];

const DEFAULT_MONEY: HourlyPoint[] = [
  { label: '11 AM', value: 42 },
  { label: '12 PM', value: 45 },
  { label: '1 PM', value: 39 },
  { label: '2 PM', value: 41 },
  { label: '3 PM', value: 58 },
  { label: '4 PM', value: 63 },
  { label: '5 PM', value: 48 },
  { label: '6 PM', value: 44 },
  { label: '7 PM', value: 70 },
  { label: '8 PM', value: 67 },
];

/** Estados visuais da bateria; a origem dos dados é do backend (F06 futuro). */
export type BatteryStatus =
  | 'loading'
  | 'success'
  | 'empty'
  | 'partial'
  | 'invalid'
  | 'error';

type BatteryScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  onSelectDay?: (isoDate: string) => void;
  onExpandToday?: () => void;
  onRetry?: () => void;
  /** Estado visual atual; `success` e `partial` exibem os gráficos. */
  status?: BatteryStatus;
  /** Porcentagem recuperada do donut. */
  recoveredPercentage?: number;
  /** Série horária do card Today. */
  hourlyData?: HourlyPoint[];
  /** Série de economia exibida no modo expandido. */
  moneyData?: HourlyPoint[];
  /** Moeda da economia; ausente omite o Money economy. */
  currencyCode?: string | null;
  /** Tarifa usada no cálculo; ausente omite o Money economy. */
  energyTariffPerKwh?: number | null;
  /** Energia usada só com fonte confiável; ausente omite o bloco. */
  vehicleEnergyUsedWh?: number | null;
  /** Rótulo da fonte da energia usada. */
  energySourceLabel?: string;
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
  onRetry,
  status = 'success',
  recoveredPercentage = 65,
  hourlyData = DEFAULT_HOURLY,
  moneyData = DEFAULT_MONEY,
  currencyCode = 'BRL',
  energyTariffPerKwh = 0.0875,
  vehicleEnergyUsedWh = null,
  energySourceLabel = '',
  daysWithData = [],
}: BatteryScreenProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /** Pontos válidos; indisponíveis saem da série sem virar zero. */
  const visibleHourly = hourlyData.filter((point) => point.origin !== 'unavailable');
  const coverageLabel = `cobertura ${visibleHourly.length} de ${hourlyData.length} horas`;
  const hasMoneyPremises = currencyCode != null && energyTariffPerKwh != null;
  const hasUsedSource = vehicleEnergyUsedWh != null;

  /** Alterna o modo expandido e notifica o chamador. */
  function toggleExpanded() {
    setIsExpanded((expanded) => !expanded);
    onExpandToday?.();
  }

  if (status === 'loading') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
        testID="battery-screen"
      >
        <View style={styles.stateBlock}>
          <ActivityIndicator
            accessibilityLabel="Carregando"
            color={theme.colors.primary}
            size="large"
            testID="battery-loading"
          />
        </View>
      </ScreenShell>
    );
  }

  if (status === 'empty') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
        testID="battery-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Nenhum dado de energia para o período."
            accessibilityRole="alert"
            style={styles.stateText}
            testID="battery-empty"
          >
            Nenhum dado de energia para o período.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  if (status === 'invalid') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
        testID="battery-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Dados inválidos para o período."
            accessibilityRole="alert"
            style={styles.stateText}
            testID="battery-invalid"
          >
            Dados inválidos para o período.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  if (status === 'error') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
        testID="battery-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Não foi possível carregar a energia. Tente novamente."
            accessibilityRole="alert"
            style={styles.stateText}
            testID="battery-error"
          >
            Não foi possível carregar a energia. Tente novamente.
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
      testID="battery-screen"
    >
      <Text style={styles.recordTitle}>MONTHLY RECORD</Text>

      {status === 'partial' && (
        <Text
          accessibilityLabel="Dados parciais para o período."
          accessibilityRole="alert"
          style={styles.partialNotice}
          testID="battery-partial"
        >
          Dados parciais para o período.
        </Text>
      )}

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
            accessibilityLabel={isExpanded ? 'Recolher gráfico do dia' : 'Expandir gráfico do dia'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={toggleExpanded}
          >
            <Ionicons
              color={theme.colors.primary}
              name={isExpanded ? 'contract' : 'expand'}
              size={18}
            />
          </Pressable>
        </View>
        <EnergyBarChart
          height={isExpanded ? 180 : 96}
          values={visibleHourly.map((point) => point.value)}
        />
        <View style={styles.hourLabels}>
          {visibleHourly.map((point) => (
            <Text key={point.label} style={styles.hourLabel}>
              {point.label}
            </Text>
          ))}
        </View>
        <View style={styles.originRow}>
          <Text style={styles.originText}>● Medido</Text>
          <Text style={styles.originText}>● Calculado</Text>
          <Text style={styles.originText}>○ Indisponível</Text>
        </View>
        <Text style={styles.coverageText}>{coverageLabel}</Text>

        {isExpanded && hasMoneyPremises && (
          <View style={styles.moneySection}>
            <Text style={styles.cardTitle}>Money economy</Text>
            <Text style={styles.tariffCaption}>
              {currencyCode} {energyTariffPerKwh}/kWh
            </Text>
            <EnergyBarChart
              height={150}
              values={moneyData.map((point) => point.value)}
            />
          </View>
        )}
      </View>

      {hasUsedSource && (
        <View style={styles.usedBlock}>
          <Text style={styles.usedLabel}>Bateria usada</Text>
          <Text style={styles.usedValue}>
            {vehicleEnergyUsedWh} Wh
          </Text>
          <Text style={styles.usedSource}>fonte: {energySourceLabel}</Text>
        </View>
      )}

      {!isExpanded && (
        <View style={styles.card}>
          <BatteryCalendar daysWithData={daysWithData} onSelectDay={onSelectDay} />
        </View>
      )}
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
  partialNotice: {
    color: theme.colors.primary,
    fontSize: 12,
    marginTop: 8,
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
  originRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  originText: {
    color: theme.colors.gray,
    fontSize: 10,
  },
  coverageText: {
    color: theme.colors.gray,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  moneySection: {
    marginTop: 24,
  },
  tariffCaption: {
    color: theme.colors.gray,
    fontSize: 10,
    marginTop: 2,
  },
  usedBlock: {
    alignItems: 'center',
    marginTop: 18,
  },
  usedLabel: {
    color: theme.colors.white,
    fontSize: 12,
  },
  usedValue: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  usedSource: {
    color: theme.colors.gray,
    fontSize: 10,
    marginTop: 2,
  },
});
