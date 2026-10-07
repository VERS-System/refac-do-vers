/**
 * Implementa a tela do Viber (Task 11, lotes 11a–11b).
 *
 * Existe para dar à conversa com o assistente uma rota interna sem criar
 * aba nova: usa o `ScreenShell` padrão, o `AppHeader` com voltar por
 * callback e a `BottomNavigation` com a aba home de origem. O histórico
 * chega por props (fixtures até o contrato do ai-service), com bolhas no
 * padrão da referência (`telaNormal.png`): Viber à esquerda em `surface`
 * com texto `gold` e avatar da marca, usuário à direita em `gold` com
 * texto `dark` e inicial. Composição, selos, atalhos e estados chegam nos
 * próximos lotes. Nada é calculado, buscado, persistido ou decidido aqui;
 * prompts, dados e chaves pertencem ao backend/ai-service.
 */

import { Image, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type ViberScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Mensagens da conversa; vêm prontas, sem buscar nada. */
  messages?: ViberMessage[];
  /** Inicial do usuário no avatar; ausente omite o avatar. */
  userInitial?: string | null;
};

/** Remetente da mensagem, como na conversa com o assistente. */
export type ViberRole = 'user' | 'viber';

/** Mensagem da conversa; só carrega o que a props informa. */
export type ViberMessage = {
  /** Identificador estável da mensagem. */
  id: string;
  /** Quem enviou; define bolha, lado e rótulo acessível. */
  role: ViberRole;
  /** Texto cru; `null` omite a bolha. */
  text?: string | null;
};

/**
 * Renderiza o scaffold da conversa com o Viber e o histórico informado.
 */
export function ViberScreen({ messages, onBack, onTabPress, userInitial }: ViberScreenProps) {
  const visibleMessages = (messages ?? []).filter((message) => message.text != null);

  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="home" onTabPress={onTabPress} />}
      testID="viber-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Assistente do VERS"
        testID="viber-header"
        title="Viber"
      />

      {visibleMessages.length > 0 ? (
        <View testID="viber-history">
          {visibleMessages.map((message) =>
            message.role === 'viber' ? (
              <ViberAnswer
                key={message.id}
                text={message.text as string}
              />
            ) : (
              <UserQuestion
                key={message.id}
                text={message.text as string}
                userInitial={userInitial}
              />
            ),
          )}
        </View>
      ) : (
        <View style={styles.emptyBlock}>
          <Text
            accessibilityLabel="Nenhuma conversa ainda."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="viber-empty"
          >
            Nenhuma conversa ainda.
          </Text>
        </View>
      )}
    </ScreenShell>
  );
}

/**
 * Exibe uma resposta do Viber à esquerda, com avatar da marca.
 */
function ViberAnswer({ text }: { text: string }) {
  return (
    <View style={styles.viberRow}>
      <View style={styles.viberAvatar}>
        <Image
          accessibilityLabel="Avatar do Viber"
          resizeMode="contain"
          source={require('../assets/versAlt.png')}
          style={styles.viberAvatarImage}
        />
      </View>
      <View
        accessibilityLabel={`Viber: ${text}`}
        accessibilityRole="text"
        style={styles.viberBubble}
        testID="viber-message"
      >
        <Text style={styles.viberText}>{text}</Text>
      </View>
    </View>
  );
}

/**
 * Exibe uma mensagem do usuário à direita, com a inicial quando informada.
 */
function UserQuestion({ text, userInitial }: { text: string; userInitial?: string | null }) {
  return (
    <View style={styles.userRow}>
      <View
        accessibilityLabel={`Você: ${text}`}
        accessibilityRole="text"
        style={styles.userBubble}
        testID="viber-message"
      >
        <Text style={styles.userText}>{text}</Text>
      </View>
      {userInitial ? (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{userInitial}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBlock: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.gray,
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  userAvatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
    width: 32,
  },
  userAvatarText: {
    color: theme.colors.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  userBubble: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radii.lg,
    maxWidth: '75%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  userRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  userText: {
    color: theme.colors.dark,
    fontSize: 14,
  },
  viberAvatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    width: 32,
  },
  viberAvatarImage: {
    height: 18,
    width: 18,
  },
  viberBubble: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    maxWidth: '75%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  viberRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  viberText: {
    color: theme.colors.gold,
    fontSize: 14,
  },
});
