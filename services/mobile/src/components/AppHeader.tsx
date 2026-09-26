/**
 * Fornece o cabeçalho padrão das telas do aplicativo mobile do VERS.
 *
 * Existe para que todas as telas futuras compartilhem título, subtítulo,
 * voltar e ação auxiliar com os mesmos tokens, sem navegação interna: as
 * ações são callbacks puros para não colocar regra de autorização no cliente.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

type AppHeaderProps = {
  /** Título da tela, anunciado como cabeçalho. */
  title: string;
  /** Linha auxiliar abaixo do título. */
  subtitle?: string;
  /** Quando informado, exibe o botão voltar de 44+ pontos de toque. */
  onBack?: () => void;
  /** Conteúdo auxiliar à direita (ex. ação ou indicador). */
  trailing?: React.ReactNode;
  /** Identificador usado nos testes. */
  testID?: string;
};

/**
 * Renderiza a linha de topo com voltar opcional, bloco de título e área
 * auxiliar, usando apenas tokens do tema.
 */
export function AppHeader({ title, subtitle, onBack, trailing, testID }: AppHeaderProps) {
  return (
    <View style={styles.container} testID={testID}>
      {onBack ? (
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons color={theme.colors.primary} name="chevron-back" size={24} />
        </Pressable>
      ) : null}

      <View style={styles.titleBlock}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
  },
  subtitle: {
    color: theme.colors.gray,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: theme.typography.caption.fontWeight,
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
