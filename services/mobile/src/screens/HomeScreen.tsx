/**
 * Implementa o painel inicial de energia do aplicativo VERS.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BatteryDonut } from '../components/BatteryDonut';
import { BottomNavigation, MainTab } from '../components/BottomNavigation';
import { EnergyBarChart } from '../components/EnergyBarChart';
import { AppCard } from '../components/AppCard';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

const BATTERY_VALUES = [52, 48, 72, 57, 75, 50];
const ECONOMY_VALUES = [42, 45, 39, 41, 58, 63, 48, 44, 70, 67, 42];

type HomeScreenProps = {
  onOpenViber?: () => void;
  onTabPress?: (tab: MainTab) => void;
};

/**
 * Apresenta os resumos estáticos da primeira versão e delega os atalhos para
 * que dados reais e rotas adicionais possam ser conectados posteriormente.
 */
export function HomeScreen({ onOpenViber, onTabPress }: HomeScreenProps) {
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

        <View style={styles.topCards}>
          <AppCard accessibilityLabel="Abrir uso da bateria" style={styles.batteryCard}>
            <Text style={styles.cardTitle}>Battery usage</Text>
            <View style={styles.smallChart}>
              <EnergyBarChart height={73} values={BATTERY_VALUES} />
            </View>
          </AppCard>
        </View>

        <AppCard style={styles.economyCard}>
          <Text style={styles.economyTitle}>Money economy</Text>
          <View style={styles.economyChart}>
            <EnergyBarChart height={76} values={ECONOMY_VALUES} />
          </View>
        </AppCard>

        <View style={styles.donutSection}>
          <Text style={styles.recoveredLabel}>Battery Recovered</Text>
          <BatteryDonut recoveredPercentage={65} />
          <Text style={styles.usedLabel}>Battery Used</Text>
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
