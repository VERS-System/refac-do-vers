/**
 * Implementa a tela do Viber (Task 11, lotes 11a–11c).
 *
 * Existe para dar à conversa com o assistente uma rota interna sem criar
 * aba nova e sem exibir as abas: usa o `ScreenShell` padrão, o `AppHeader`
 * com voltar por callback e o composer fixo no rodapé, como na referência
 * (`telaNormal.png`/`telaDigitação.png`). O histórico chega por props
 * (fixtures até o contrato do ai-service), com bolhas no padrão da
 * referência: Viber à esquerda em `surface` com texto `gold` e avatar da
 * marca, usuário à direita em `gold` com texto `dark` e inicial. Selos,
 * atalhos e estados chegam nos próximos lotes. Nada é calculado, buscado,
 * persistido ou decidido aqui; prompts, dados e chaves pertencem ao
 * backend/ai-service.
 */

import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type ViberScreenProps = {
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Mensagens da conversa; vêm prontas, sem buscar nada. */
  messages?: ViberMessage[];
  /** Inicial do usuário no avatar; ausente omite o avatar. */
  userInitial?: string | null;
  /** Rascunho da composição; ausente usa estado visual interno. */
  draft?: string | null;
  /** Edição do rascunho; ausente só atualiza o modo interno. */
  onDraftChange?: (text: string) => void;
  /** Envio do texto; ausente mantém o botão sem efeito. */
  onSend?: (text: string) => void;
  /** Contextos autorizados para a conversa; vêm prontos, sem buscar nada. */
  contexts?: ViberContext[];
  /** Contexto atual; só marca entre os autorizados informados. */
  contextId?: string | null;
  /** Escolha do contexto; ausente mantém os chips sem efeito. */
  onContextChange?: (contextId: string) => void;
  /** Estado visual atual; `idle` é a conversa normal. */
  status?: ViberScreenStatus;
  /** Repete a conversa no erro; ausente mantém o botão sem efeito. */
  onRetry?: () => void;
  /** Quando falso, omite o selo de amostra (dados reais do backend). */
  isSampleData?: boolean;
};

/** Estados visuais do chat; a origem das respostas é o backend (ai-service futuro). */
export type ViberScreenStatus = 'idle' | 'sending' | 'error' | 'unavailable' | 'empty';

/** Remetente da mensagem, como na conversa com o assistente. */
export type ViberRole = 'user' | 'viber';

/** Natureza da resposta do Viber; só exibida, sem decidir nada. */
export type ViberKind = 'measurement' | 'explanation' | 'inference' | 'recommendation';

/** Mensagem da conversa; só carrega o que a props informa. */
export type ViberMessage = {
  /** Identificador estável da mensagem. */
  id: string;
  /** Quem enviou; define bolha, lado e rótulo acessível. */
  role: ViberRole;
  /** Texto cru; `null` omite a bolha. */
  text?: string | null;
  /** Natureza da resposta; só `inference`/`recommendation` ganham selo. */
  kind?: ViberKind | null;
  /** Período ou base da resposta; cru, `null` omite a linha. */
  referenceLabel?: string | null;
};

/** Contexto autorizado da conversa; só exibido entre os informados. */
export type ViberContext = {
  /** Identificador estável do contexto. */
  id: string;
  /** Rótulo cru do recurso autorizado. */
  label: string;
};

/** Atalhos do chat; só preenchem o rascunho, sem navegar nem buscar dados. */
const VIBER_SUGGESTIONS = ['Battery usage', 'Money economy'];

/**
 * Renderiza o scaffold da conversa com o Viber, o histórico e a composição.
 */
export function ViberScreen({
  contextId,
  contexts,
  draft,
  messages,
  onBack,
  onContextChange,
  onDraftChange,
  onRetry,
  onSend,
  status,
  userInitial,
  isSampleData = true,
}: ViberScreenProps) {
  const visibleMessages = (messages ?? []).filter((message) => message.text != null);
  const [innerDraft, setInnerDraft] = useState('');
  const isControlled = draft != null;
  const currentDraft = isControlled ? (draft as string) : innerDraft;

  /** Preenche o rascunho; no modo interno atualiza o campo direto. */
  const applyDraft = (text: string) => {
    if (!isControlled) {
      setInnerDraft(text);
    }
    onDraftChange?.(text);
  };

  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          testID="viber-keyboard-avoid"
        >
          {contexts && contexts.length > 0 ? (
            <ViberContextBar
              contextId={contextId}
              contexts={contexts}
              onContextChange={onContextChange}
            />
          ) : null}
          <ViberSuggestions onSuggest={applyDraft} />
          <ViberComposer
            draft={currentDraft}
            disabled={status === 'sending'}
            onDraftChange={applyDraft}
            onSend={(text) => {
              onSend?.(text);
              if (!isControlled) {
                setInnerDraft('');
              }
            }}
          />
        </KeyboardAvoidingView>
      }
      testID="viber-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Assistente do VERS"
        testID="viber-header"
        title="Viber"
      />

      {isSampleData && (
        <Text style={styles.sampleSeal} testID="viber-sample-seal">
          DADOS DE AMOSTRA
        </Text>
      )}

      {visibleMessages.length > 0 ? (
        <View testID="viber-history">
          {visibleMessages.map((message) =>
            message.role === 'viber' ? (
              <ViberAnswer
                key={message.id}
                kind={message.kind}
                referenceLabel={message.referenceLabel}
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

      {status === 'sending' ? (
        <View style={styles.viberRow} testID="viber-sending">
          <View style={styles.viberAvatar}>
            <Image
              accessibilityLabel="Avatar do Viber"
              resizeMode="contain"
              source={require('../assets/versAlt.png')}
              style={styles.viberAvatarImage}
            />
          </View>
          <View style={styles.viberBubble}>
            <Text style={styles.viberText}>Viber está respondendo…</Text>
          </View>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.stateBlock} testID="viber-error">
          <Text accessibilityRole="alert" style={styles.stateText}>
            Não foi possível conversar com o Viber.
          </Text>
          <PrimaryButton
            accessibilityLabel="Tentar novamente"
            label="TENTAR NOVAMENTE"
            onPress={() => onRetry?.()}
          />
        </View>
      ) : null}

      {status === 'unavailable' ? (
        <View style={styles.stateBlock} testID="viber-unavailable">
          <Text accessibilityRole="alert" style={styles.stateText}>
            Viber indisponível no momento.
          </Text>
        </View>
      ) : null}

    </ScreenShell>
  );
}

/**
 * Lista os atalhos do chat; só preenchem o rascunho, sem navegar.
 */
function ViberSuggestions({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <View style={styles.suggestionsRow} testID="viber-suggestions">
      {VIBER_SUGGESTIONS.map((suggestion) => (
        <Pressable
          accessibilityLabel={suggestion}
          accessibilityRole="button"
          hitSlop={8}
          key={suggestion}
          onPress={() => onSuggest(suggestion)}
          style={styles.suggestionChip}
        >
          <Text style={styles.suggestionText}>{suggestion}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Escolhe o contexto só entre os autorizados informados.
 */
function ViberContextBar({
  contextId,
  contexts,
  onContextChange,
}: {
  contextId?: string | null;
  contexts: ViberContext[];
  onContextChange?: (contextId: string) => void;
}) {
  return (
    <View style={styles.contextsRow} testID="viber-contexts">
      {contexts.map((context) => {
        const selected = contextId === context.id;

        return (
          <Pressable
            accessibilityLabel={context.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={8}
            key={context.id}
            onPress={() => onContextChange?.(context.id)}
            style={[styles.contextChip, selected ? styles.contextChipSelected : null]}
          >
            <Text style={selected ? styles.contextTextSelected : styles.contextText}>
              {context.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Compõe e envia mensagens; só repassa o texto, sem validar nada.
 */
function ViberComposer({
  draft,
  disabled = false,
  onDraftChange,
  onSend,
}: {
  draft: string;
  /** Trava o envio durante a resposta, sem apagar o digitado. */
  disabled?: boolean;
  onDraftChange?: (text: string) => void;
  onSend?: (text: string) => void;
}) {
  const hasText = draft.length > 0;

  return (
    <View style={styles.composerBlock} testID="viber-composer">
      <TextInput
        accessibilityLabel="Mensagem para o Viber"
        onChangeText={onDraftChange}
        placeholder="Fale com o Viber"
        placeholderTextColor={theme.colors.gray}
        selectionColor={theme.colors.gold}
        style={styles.composerInput}
        value={draft}
      />
      <Pressable
        accessibilityLabel="Enviar mensagem"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={8}
        onPress={() => onSend?.(draft)}
        style={styles.sendButton}
      >
        <Text style={hasText ? styles.sendActive : styles.sendIdle}>➤</Text>
      </Pressable>
    </View>
  );
}

/**
 * Exibe uma resposta do Viber à esquerda, com avatar da marca.
 */
function ViberAnswer({
  kind,
  referenceLabel,
  text,
}: {
  kind?: ViberKind | null;
  referenceLabel?: string | null;
  text: string;
}) {
  const seal =
    kind === 'inference'
      ? 'Inferência do Viber — pode conter erros'
      : kind === 'recommendation'
        ? 'Recomendação do Viber — confira antes de agir'
        : null;

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
      <View style={styles.viberColumn}>
        <View
          accessibilityLabel={`Viber: ${text}`}
          accessibilityRole="text"
          style={styles.viberBubble}
          testID="viber-message"
        >
          <Text style={styles.viberText}>{text}</Text>
        </View>
        {seal ? (
          <Text
            accessibilityRole="text"
            style={styles.kindSeal}
            testID="viber-kind-seal"
          >
            {seal}
          </Text>
        ) : null}
        {referenceLabel ? (
          <Text style={styles.referenceText} testID="viber-reference">
            {referenceLabel}
          </Text>
        ) : null}
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
  composerBlock: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    minHeight: 52,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
  },
  composerInput: {
    color: theme.colors.gold,
    flex: 1,
    fontSize: 14,
    paddingVertical: theme.spacing.sm,
  },
  contextChip: {
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  contextChipSelected: {
    backgroundColor: theme.colors.tabActive,
    borderColor: theme.colors.gold,
  },
  contextText: {
    color: theme.colors.gray,
    fontSize: 12,
  },
  contextTextSelected: {
    color: theme.colors.white,
    fontSize: 12,
  },
  contextsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  kindSeal: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: theme.spacing.xs,
    maxWidth: '75%',
  },
  referenceText: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: theme.spacing.xs,
    maxWidth: '75%',
  },
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
  sendActive: {
    color: theme.colors.gold,
    fontSize: 20,
  },
  sendButton: {
    padding: theme.spacing.xs,
  },
  sendIdle: {
    color: theme.colors.gray,
    fontSize: 20,
  },
  stateBlock: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  stateText: {
    color: theme.colors.gray,
    fontSize: 13,
    textAlign: 'center',
  },
  suggestionChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    marginRight: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  suggestionText: {
    color: theme.colors.gold,
    fontSize: 12,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
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
  viberColumn: {
    flex: 1,
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
  /** Selo de amostra; omitido com dados reais do backend. */
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
});
