/**
 * Implementa o painel inicial de energia e diagnóstico do aplicativo VERS.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BatteryDonut } from '../components/BatteryDonut';
import { BottomNavigation, MainTab } from '../components/BottomNavigation';
import { EnergyBarChart } from '../components/EnergyBarChart';
import { colors } from '../constants/colors';

const BATTERY_VALUES = [52, 48, 72, 57, 75, 50];
const ECONOMY_VALUES = [42, 45, 39, 41, 58, 63, 48, 44, 70, 67, 42];

type HomeScreenProps = {
  onOpenDiagnostic?: () => void;
  onOpenViber?: () => void;
  onTabPress?: (tab: MainTab) => void;
};

/**
 * Apresenta os resumos estáticos da primeira versão e delega os atalhos para
 * que dados reais e rotas adicionais possam ser conectados posteriormente.
 */
export function HomeScreen({ onOpenDiagnostic, onOpenViber, onTabPress }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} testID="home-screen">
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Conversar com o Viber"
          accessibilityRole="button"
          onPress={onOpenViber}
          style={styles.viberLink}
        >
          <Text style={styles.viberLead}>Chat with </Text>
          <Text style={styles.viberName}>Viber</Text>
          <Ionicons color={colors.primary} name="chatbox-outline" size={22} />
        </Pressable>

        <View style={styles.topCards}>
          <Pressable
            accessibilityLabel="Abrir uso da bateria"
            accessibilityRole="button"
            style={[styles.card, styles.batteryCard]}
          >
            <Text style={styles.cardTitle}>Battery usage</Text>
            <View style={styles.smallChart}>
              <EnergyBarChart height={73} values={BATTERY_VALUES} />
            </View>
          </Pressable>

          <Pressable
            accessibilityLabel="Abrir diagnóstico do carro"
            accessibilityRole="button"
            onPress={onOpenDiagnostic}
            style={[styles.card, styles.diagnosticCard]}
          >
            <Text style={styles.diagnosticTitle}>Your car{`\n`}Diagnostic</Text>
            <Text style={styles.stateTitle}>Actual state:</Text>
            <Text style={styles.stateCaption}>Working very well</Text>
          </Pressable>
        </View>

        <View style={styles.economyCard}>
          <Text style={styles.economyTitle}>Money economy</Text>
          <View style={styles.economyChart}>
            <EnergyBarChart height={76} values={ECONOMY_VALUES} />
          </View>
        </View>

        <View style={styles.donutSection}>
          <Text style={styles.recoveredLabel}>Battery Recovered</Text>
          <BatteryDonut recoveredPercentage={65} />
          <Text style={styles.usedLabel}>Battery Used</Text>
        </View>
      </ScrollView>

      <BottomNavigation activeTab="home" onTabPress={onTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
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
    color: colors.white,
    fontSize: 20,
  },
  viberName: {
    color: colors.primary,
    fontSize: 20,
    marginRight: 4,
    textDecorationLine: 'underline',
  },
  topCards: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 34,
    maxWidth: 340,
    width: '100%',
  },
  card: {
    borderColor: colors.border,
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth,
    height: 164,
    overflow: 'hidden',
  },
  batteryCard: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  diagnosticCard: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 17,
  },
  cardTitle: {
    color: colors.primary,
    fontSize: 20,
  },
  smallChart: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 35,
  },
  diagnosticTitle: {
    color: colors.primary,
    fontSize: 25,
    lineHeight: 31,
  },
  stateTitle: {
    color: colors.primary,
    fontSize: 18,
    marginTop: 13,
  },
  stateCaption: {
    color: colors.primary,
    fontSize: 11,
    marginLeft: 7,
  },
  economyCard: {
    borderColor: colors.border,
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth,
    height: 164,
    marginTop: 29,
    maxWidth: 350,
    overflow: 'hidden',
    paddingHorizontal: 25,
    paddingTop: 13,
    width: '100%',
  },
  economyTitle: {
    color: colors.primary,
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
    color: colors.primary,
    fontSize: 12,
    marginBottom: 9,
  },
  usedLabel: {
    color: colors.white,
    fontSize: 12,
    marginTop: 10,
    opacity: 0.12,
  },
});
