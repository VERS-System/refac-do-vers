import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text } from 'react-native';
import { colors } from './src/constants/colors';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>VERS</Text>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}
