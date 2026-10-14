/**
 * Implementa o painel inicial de energia do aplicativo VERS.
 */

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BatteryDonut } from '../components/BatteryDonut';
import { BottomNavigation, MainTab } from '../components/BottomNavigation';
import { EnergyBarChart } from '../components/EnergyBarChart';
import { AppCard } from '../components/AppCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

const BATTERY_VALUES = [52, 48, 72, 57, 75, 50];
const ECONOMY_VALUES = [42, 45, 39, 41, 58, 63, 48, 44, 70, 67, 42];

/** Estados visuais da Home; a origem dos dados é do backend (F06 futuro). */
export type HomeStatus =
  | 'loading'
  | 'success'
  | 'noData'
  | 'error'
  | 'noInstallation'
  | 'insufficientQuality';

type HomeScreenProps = {
  onOpenViber?: () => void;
  onTabPress?: (tab: MainTab) => void;
  onRetry?: () => void;
  /** Abre os detalhes de energia (Task 05 futura). */
  onOpenBattery?: () => void;
  /** Abre os detalhes do sistema VERS (Task 07 futura). */
  onOpenVersSystem?: () => void;
  /** Estado visual atual; `success` exibe os indicadores. */
  status?: HomeStatus;
  /** Quando falso, omite o selo de amostra (dados reais do backend). */
  isSampleData?: boolean;
  /** Período dos indicadores exibidos. */
  periodLabel?: string;
  /** Unidade de energia dos indicadores exibidos. */
  energyUnit?: string;
  /** Qualidade dos dados exibidos. */
  qualityLabel?: string;
};

/**
 * Apresenta os resumos estáticos da primeira versão e delega os atalhos para
 * que dados reais e rotas adicionais possam ser conectados posteriormente.
 */
export function HomeScreen({
  onOpenViber,
  onTabPress,
  onRetry,
  onOpenBattery,
  onOpenVersSystem,
  status = 'success',
  isSampleData = true,
  periodLabel = 'Últimos 30 dias',
  energyUnit = 'Wh',
  qualityLabel = 'dados de amostra',
}: HomeScreenProps) {
  const caption = `${periodLabel} · ${energyUnit} · ${qualityLabel}`;

  if (status === 'loading') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="home" onTabPress={onTabPress} />}
        testID="home-screen"
      >
        <View style={styles.stateBlock}>
          <ActivityIndicator
            accessibilityLabel="Carregando"
            color={theme.colors.primary}
            size="large"
            testID="home-loading"
          />
        </View>
      </ScreenShell>
    );
  }

  if (status === 'noData') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="home" onTabPress={onTabPress} />}
        testID="home-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Nenhum dado disponível para o período."
            accessibilityRole="alert"
            style={styles.stateText}
            testID="home-no-data"
          >
            Nenhum dado disponível para o período.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  if (status === 'error') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="home" onTabPress={onTabPress} />}
        testID="home-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Não foi possível carregar os dados. Tente novamente."
            accessibilityRole="alert"
            style={styles.stateText}
            testID="home-error"
          >
            Não foi possível carregar os dados. Tente novamente.
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

  if (status === 'noInstallation') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="home" onTabPress={onTabPress} />}
        testID="home-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Nenhum sistema VERS vinculado. Cadastre um veículo para começar."
            accessibilityRole="alert"
            style={styles.stateText}
            testID="home-no-installation"
          >
            Nenhum sistema VERS vinculado. Cadastre um veículo para começar.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  if (status === 'insufficientQuality') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="home" onTabPress={onTabPress} />}
        testID="home-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Dados insuficientes para exibir os indicadores."
            accessibilityRole="alert"
            style={styles.stateText}
            testID="home-insufficient-quality"
          >
            Dados insuficientes para exibir os indicadores.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="home" onTabPress={onTabPress} />}
      testID="home-screen"
    >
        <Pressable
          accessibilityLabel="Conversar com o Viber"
          accessibilityRole="button"
          onPress={onOpenViber}
          style={styles.viberLink}
        >
          <Text style={styles.viberLead}>Chat with </Text>
          <Text style={styles.viberName}>Viber</Text>
          <Ionicons color={theme.colors.primary} name="chatbox-outline" size={22} />
        </Pressable>

        {isSampleData && (
          <Text style={styles.sampleSeal} testID="home-sample-seal">
            DADOS DE AMOSTRA
          </Text>
        )}

        <View style={styles.topCards}>
          <AppCard
            accessibilityLabel="Abrir uso da bateria"
            onPress={onOpenBattery}
            style={styles.batteryCard}
          >
            <Text style={styles.cardTitle}>Battery usage</Text>
            <Text style={styles.caption}>{caption}</Text>
            <View style={styles.smallChart}>
              <EnergyBarChart height={73} values={BATTERY_VALUES} />
            </View>
          </AppCard>
        </View>

        <AppCard
          accessibilityLabel="Abrir detalhes de energia"
          onPress={onOpenBattery}
          style={styles.economyCard}
        >
          <Text style={styles.economyTitle}>Money economy</Text>
          <Text style={styles.caption}>{caption}</Text>
          <View style={styles.economyChart}>
            <EnergyBarChart height={76} values={ECONOMY_VALUES} />
          </View>
        </AppCard>

        <Pressable
          accessibilityLabel="Abrir sistema VERS"
          accessibilityRole="button"
          onPress={onOpenVersSystem}
          style={styles.donutSection}
        >
          <Text style={styles.recoveredLabel}>Battery Recovered</Text>
          <BatteryDonut recoveredPercentage={65} />
          <Text style={styles.usedLabel}>Battery Used</Text>
          <Text style={styles.caption}>{caption}</Text>
        </Pressable>
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
  viberLink: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  viberLead: {
    color: theme.colors.white,
    fontSize: 20,
  },
  viberName: {
    color: theme.colors.primary,
    fontSize: 20,
    marginRight: theme.spacing.xs,
    textDecorationLine: 'underline',
  },
  topCards: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 34,
    maxWidth: 340,
    width: '100%',
  },
  batteryCard: {
    flex: 1,
    height: 164,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  cardTitle: {
    color: theme.colors.primary,
    fontSize: 20,
  },
  caption: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  sampleSeal: {
    borderColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  smallChart: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 35,
  },
  economyCard: {
    height: 164,
    marginTop: 29,
    maxWidth: 350,
    paddingHorizontal: 25,
    paddingTop: 13,
    width: '100%',
  },
  economyTitle: {
    color: theme.colors.primary,
    fontSize: 23,
    textAlign: 'center',
  },
  economyChart: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 25,
    paddingTop: 17,
  },
  donutSection: {
    alignItems: 'center',
    marginTop: 31,
  },
  recoveredLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    marginBottom: 9,
  },
  usedLabel: {
    color: theme.colors.white,
    fontSize: 12,
    marginTop: 10,
    opacity: 0.12,
  },
});
