/**
 * Fornece o invólucro padrão das telas do aplicativo mobile do VERS.
 *
 * Existe para unificar área segura, ajuste de teclado e rolagem: antes cada
 * tela repetia a trinca com parâmetros divergentes (ex. Login sem rolagem e
 * sem ajuste no Android). A rolagem fica ativa por padrão para suportar telas
 * estreitas e fontes ampliadas. A Splash é a exceção documentada, pois usa
 * `useSafeAreaInsets` direto para a animação centro→topo.
 */

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

type ScreenShellProps = {
  children: React.ReactNode;
  /** Identificador da tela, repassado à área segura. */
  testID: string;
  /** Desativa a rolagem quando a tela garante caber sem ela. */
  scrollEnabled?: boolean;
  /** Estilo extra do container de rolagem (paddings da tela). */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Conteúdo fixo após a rolagem (ex. barra inferior), dentro da área segura. */
  footer?: React.ReactNode;
};

/**
 * Empilha área segura, ajuste de teclado e rolagem com os mesmos parâmetros
 * em todas as telas, delegando o conteúdo interno a cada tela.
 */
export function ScreenShell({ children, testID, scrollEnabled = true, contentContainerStyle, footer }: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.keyboardArea}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
