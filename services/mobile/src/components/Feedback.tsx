/**
 * Fornece os estados de feedback compartilhados do aplicativo mobile do VERS.
 *
 * Existe para que toda tela represente carregamento, vazio, erro e offline
 * com o mesmo visual e vocabulário, sem recriar mensagens e botões: cada
 * variante recebe só textos e callbacks, sem regra de negócio ou navegação.
 */

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { theme } from '../constants/theme';

type WithChildren = {
  children?: React.ReactNode;
  /** Identificador usado nos testes. */
  testID?: string;
};

type LoadingProps = WithChildren & {
  /** Mensagem de espera; padrão em português. */
  message?: string;
};

type EmptyProps = WithChildren & {
  /** Título do estado vazio. */
  title: string;
  /** Detalhe opcional abaixo do título. */
  message?: string;
  /** Rótulo da ação principal; sem ele (ou sem onAction) não há botão. */
  actionLabel?: string;
  /** Ação principal do estado vazio. */
  onAction?: () => void;
};

type ErrorProps = WithChildren & {
  /** Mensagem pública do erro, sem detalhe técnico. */
  message: string;
  /** Quando informado, exibe o botão de repetição. */
  onRetry?: () => void;
  /** Rótulo do botão de repetição. */
  retryLabel?: string;
};

type OfflineProps = WithChildren & {
  /** Mensagem de indisponibilidade. */
  message?: string;
  /** Quando informado, exibe o botão de repetição. */
  onRetry?: () => void;
  /** Rótulo do botão de repetição. */
  retryLabel?: string;
};

/** Linha de espera com indicador e mensagem. */
function Loading({ children, testID, message = 'Carregando...' }: LoadingProps) {
  return (
    <View style={styles.container} testID={testID}>
      <ActivityIndicator color={theme.colors.primary} size="small" />
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

/** Estado sem conteúdo, com ação opcional. */
function Empty({ children, testID, title, message, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Ionicons color={theme.colors.gray} name="file-tray-outline" size={28} />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Estado de falha, com repetição opcional. */
function ErrorState({ children, testID, message, onRetry, retryLabel = 'Tentar novamente' }: ErrorProps) {
  return (
    <View accessibilityLiveRegion="assertive" style={styles.container} testID={testID}>
      <Ionicons color={theme.colors.error} name="alert-circle-outline" size={28} />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <PrimaryButton label={retryLabel} onPress={onRetry} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Estado de indisponibilidade de rede, com repetição opcional. */
function Offline({ children, testID, message = 'Sem conexão.', onRetry, retryLabel = 'Tentar novamente' }: OfflineProps) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container} testID={testID}>
      <Ionicons color={theme.colors.gray} name="cloud-offline-outline" size={28} />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <PrimaryButton label={retryLabel} onPress={onRetry} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Agrupa as quatro variantes de feedback sob um único ponto de importação,
 * mantendo cada estado independente e combinável com conteúdo auxiliar.
 */
export const Feedback = {
  Loading,
  Empty,
  Error: ErrorState,
  Offline,
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    width: '100%',
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    textAlign: 'center',
  },
  message: {
    color: theme.colors.white,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
  action: {
    marginTop: theme.spacing.sm,
    maxWidth: 350,
    width: '100%',
  },
});
