/**
 * Implementa a tela de perfil (Task 09, lotes 09a–09d).
 *
 * Existe para dar ao perfil uma rota própria na aba `profile` sem criar
 * pilha nova: usa o `ScreenShell` padrão, o `AppHeader` com voltar por
 * callback e a `BottomNavigation` com a aba profile ativa. Leitura, edição e
 * estados chegam por props (fixtures até F01/F05); sem props de controle, o
 * modo de edição e o rascunho usam estado visual interno para não travar a
 * rota. O rascunho nunca é limpo pelo erro. Só `displayName` é enviado; nada
 * é calculado, buscado, persistido ou decidido aqui. Papéis, permissões e
 * encerramento efetivo da sessão pertencem ao backend.
 */

import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AppSkeleton } from '../components/AppSkeleton';
import { AuthTextField } from '../components/AuthTextField';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type ProfileScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Dados públicos da conta; ausente mantém o vazio. */
  profile?: UserProfile | null;
  /** Modo de edição; ausente usa estado visual interno. */
  editing?: boolean | null;
  /** Rascunho do nome; ausente usa estado visual interno. */
  draftName?: string | null;
  /** Abre a edição; ausente só alterna o modo interno. */
  onEdit?: () => void;
  /** Cancela a edição e descarta o rascunho. */
  onCancelEdit?: () => void;
  /** Edição do rascunho; ausente só atualiza o modo interno. */
  onDraftChange?: (name: string) => void;
  /** Salva repassando só o `displayName`. */
  onSave?: (displayName: string) => void;
  /** Estado visual atual; `success` exibe os dados. */
  status?: ProfileStatus;
  /** Repete a carga no erro; ausente mantém o botão sem efeito. */
  onRetry?: () => void;
  /** Volta ao Login na expiração; rota do fluxo público. */
  onOpenLogin?: () => void;
  /** Abre os veículos (Task 10); ausente omite o atalho. */
  onOpenVehicles?: () => void;
  /** Abre o suporte (Task 11); ausente omite o atalho. */
  onOpenSupport?: () => void;
};

/** Estados visuais do perfil; a origem dos dados é do backend (F05 futuro). */
export type ProfileStatus = 'loading' | 'success' | 'empty' | 'error' | 'sessionExpired';

/** Dados públicos da conta; vêm prontos do contrato. */
export type UserProfile = {
  /** Nome exibido; `null` mostra o placeholder neutro. */
  displayName?: string | null;
  /** Email da conta; `null` omite a linha. */
  email?: string | null;
  /** Foto; `null` mostra as iniciais. */
  avatarUrl?: string | null;
};

/** Iniciais do nome para o placeholder; `?` sem nome. */
function getInitials(displayName?: string | null) {
  if (!displayName?.trim()) {
    return '?';
  }

  const parts = displayName.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

/**
 * Apresenta cabeçalho, dados, edição, estados e atalhos do perfil,
 * delegando voltar, edição, salvamento, nova tentativa, retorno ao Login,
 * atalhos e troca de aba por callbacks.
 */
export function ProfileScreen({ onTabPress, onBack, profile = null, editing = null, draftName = null, onEdit, onCancelEdit, onDraftChange, onSave, status = 'success', onRetry, onOpenLogin, onOpenVehicles, onOpenSupport }: ProfileScreenProps) {
  const [internalEditing, setInternalEditing] = useState(false);
  const [internalDraft, setInternalDraft] = useState<string | null>(null);
  const [internalSaved, setInternalSaved] = useState<string | null>(null);
  const isEditing = editing ?? internalEditing;
  const currentName = internalSaved ?? profile?.displayName ?? null;
  const draft = draftName ?? internalDraft ?? currentName ?? '';

  /** Abre o modo de edição sem validar nada. */
  function openEdit() {
    if (editing == null) {
      setInternalEditing(true);
    }

    onEdit?.();
  }

  /** Repassa a digitação sem validar domínio. */
  function changeDraft(name: string) {
    if (draftName == null) {
      setInternalDraft(name);
    }

    onDraftChange?.(name);
  }

  /** Cancela e descarta o rascunho, sem salvar nada. */
  function cancelEdit() {
    if (editing == null) {
      setInternalEditing(false);
      setInternalDraft(null);
    }

    onCancelEdit?.();
  }

  /** Salva repassando só o `displayName`. */
  function saveProfile() {
    if (editing == null) {
      setInternalSaved(draft);
      setInternalEditing(false);
      setInternalDraft(null);
    }

    onSave?.(draft);
  }

  if (status === 'loading') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="profile" onTabPress={onTabPress} />}
        testID="profile-screen"
      >
        <View
          accessibilityLabel="Carregando"
          accessibilityRole="progressbar"
          style={styles.stateBlock}
          testID="profile-loading"
        >
          <AppSkeleton height={120} />
          <AppSkeleton height={80} />
        </View>
      </ScreenShell>
    );
  }

  if (status === 'error') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="profile" onTabPress={onTabPress} />}
        testID="profile-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Não foi possível carregar o perfil. Tente novamente."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="profile-error"
          >
            Não foi possível carregar o perfil. Tente novamente.
          </Text>
          <View style={styles.actionButton}>
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

  if (status === 'sessionExpired') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="profile" onTabPress={onTabPress} />}
        testID="profile-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Sessão expirada. Entre novamente para continuar."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="profile-session-expired"
          >
            Sessão expirada. Entre novamente para continuar.
          </Text>
          <View style={styles.actionButton}>
            <PrimaryButton
              accessibilityLabel="Ir para o Login"
              label="IR PARA O LOGIN"
              onPress={() => onOpenLogin?.()}
            />
          </View>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="profile" onTabPress={onTabPress} />}
      testID="profile-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Dados da conta e acessos"
        testID="profile-header"
        title="Perfil"
      />

      <View style={styles.emptyBlock}>
        {profile && status !== 'empty' ? (
          <View style={styles.card} testID="profile-data">
            {profile.avatarUrl ? (
              <Image
                accessibilityLabel="Foto de perfil"
                source={{ uri: profile.avatarUrl }}
                style={styles.avatar}
                testID="profile-avatar-image"
              />
            ) : (
              <View style={styles.avatarFallback} testID="profile-avatar-initials">
                <Text style={styles.initialsText}>{getInitials(currentName)}</Text>
              </View>
            )}
            {isEditing ? (
              <View style={styles.editBlock}>
                <AuthTextField
                  label="Nome:"
                  onChangeText={changeDraft}
                  placeholder="Nome exibido"
                  value={draft}
                />
                <View style={styles.actionButton}>
                  <PrimaryButton
                    accessibilityLabel="Salvar perfil"
                    label="SALVAR"
                    onPress={saveProfile}
                  />
                </View>
                <View style={styles.actionButton}>
                  <PrimaryButton
                    accessibilityLabel="Cancelar edição"
                    label="CANCELAR"
                    onPress={cancelEdit}
                  />
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.nameText}>
                  {currentName ? currentName : 'Sem nome definido'}
                </Text>
                {profile.email ? (
                  <Text style={styles.emailText}>{profile.email}</Text>
                ) : null}
                <View style={styles.actionButton}>
                  <PrimaryButton
                    accessibilityLabel="Editar perfil"
                    label="EDITAR"
                    onPress={openEdit}
                  />
                </View>
                {onOpenVehicles ? (
                  <View style={styles.actionButton}>
                    <PrimaryButton
                      accessibilityLabel="Meus veículos"
                      label="MEUS VEÍCULOS"
                      onPress={() => onOpenVehicles?.()}
                    />
                  </View>
                ) : null}
                {onOpenSupport ? (
                  <View style={styles.actionButton}>
                    <PrimaryButton
                      accessibilityLabel="Ajuda e suporte"
                      label="AJUDA E SUPORTE"
                      onPress={() => onOpenSupport?.()}
                    />
                  </View>
                ) : null}
              </>
            )}
          </View>
        ) : (
          <Text
            accessibilityLabel="Nenhum perfil disponível."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="profile-empty"
          >
            Nenhum perfil disponível.
          </Text>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 92,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  emptyBlock: {
    alignItems: 'center',
    marginTop: 18,
    width: '100%',
  },
  stateBlock: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    width: '100%',
  },
  avatar: {
    borderRadius: 32,
    height: 64,
    width: 64,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: theme.colors.tabActive,
    borderColor: theme.colors.border,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  initialsText: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  nameText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  editBlock: {
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  actionButton: {
    marginTop: 12,
    maxWidth: 350,
    width: '100%',
  },
  emailText: {
    color: theme.colors.gray,
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
