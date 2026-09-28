/**
 * Implementa a tela de bateria e energia do aplicativo VERS.
 *
 * Exibe o resumo do período recebido por props (fixtures até o contrato de
 * resumos do backend). Nenhum valor é calculado aqui: potência, energia e
 * economia chegam prontos; ausências futuras serão `null`, nunca zero.
 */

import { StyleSheet, Text, View } from 'react-native';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type BatteryScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Energia recuperada no período, em `energyUnit`. */
  recoveredEnergyWh?: number;
  /** Potência média válida no período, em `powerUnit`. */
  averagePowerW?: number;
  /** Pico de potência válido no período, em `powerUnit`. */
  peakPowerW?: number;
  /** Período do resumo exibido. */
  periodLabel?: string;
  /** Unidade de energia. */
  energyUnit?: string;
  /** Unidade de potência. */
  powerUnit?: string;
  /** Qualidade dos dados exibidos. */
  qualityLabel?: string;
};

/**
 * Apresenta energia recuperada, potência média e pico do período, delegando
 * a navegação por abas ao chamador.
 */
export function BatteryScreen({
  onTabPress,
  recoveredEnergyWh = 12.4,
  averagePowerW = 3.1,
  peakPowerW = 8.7,
  periodLabel = 'Últimos 30 dias',
  energyUnit = 'Wh',
  powerUnit = 'W',
  qualityLabel = 'dados de amostra',
}: BatteryScreenProps) {
  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="battery" onTabPress={onTabPress} />}
      testID="battery-screen"
    >
      <Text accessibilityRole="header" style={styles.title}>
        Bateria e energia
      </Text>
      <Text style={styles.caption}>
        {periodLabel} · {qualityLabel}
      </Text>

      <View style={styles.summaryBlock}>
        <Text style={styles.summaryLabel}>Energia recuperada</Text>
        <Text style={styles.summaryValue}>
          {recoveredEnergyWh} {energyUnit}
        </Text>
      </View>

      <View style={styles.summaryBlock}>
        <Text style={styles.summaryLabel}>Potência média</Text>
        <Text style={styles.summaryValue}>
          {averagePowerW} {powerUnit}
        </Text>
      </View>

      <View style={styles.summaryBlock}>
        <Text style={styles.summaryLabel}>Pico de potência</Text>
        <Text style={styles.summaryValue}>
          {peakPowerW} {powerUnit}
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
    paddingTop: 30,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 26,
    fontWeight: '600',
  },
  caption: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: 4,
  },
  summaryBlock: {
    alignItems: 'center',
    marginTop: 24,
  },
  summaryLabel: {
    color: theme.colors.white,
    fontSize: 14,
  },
  summaryValue: {
    color: theme.colors.primary,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
});
