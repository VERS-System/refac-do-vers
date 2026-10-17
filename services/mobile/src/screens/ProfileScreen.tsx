/**
 * Implementa a tela de perfil (Task 09, lotes 09a–09f; reestilização R1).
 *
 * Existe para dar ao perfil uma rota própria na aba `profile` sem criar
 * pilha nova, no modelo de `fotoConfig.png`: selo de admin, avatar com anel
 * dourado e nome centralizados, sem barra de título. Usa o `ScreenShell`
 * padrão e a `BottomNavigation` com a aba profile ativa. Leitura, edição,
 * estados, atalhos e saída chegam por props (fixtures até F01/F05); sem
 * props de controle, edição, rascunho e confirmação usam estado visual
 * interno para não travar a rota. Só `displayName` é enviado e nada é
 * encerrado localmente; papéis, permissões e encerramento efetivo pertencem
 * ao backend.
 */

import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppSkeleton } from '../components/AppSkeleton';
import { AuthTextField } from '../components/AuthTextField';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type ProfileScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; sem botão próprio nesta tela. */
  onBack?: () => void;
  /** Exibe o selo de admin; ausente omite o selo. */
  isAdmin?: boolean | null;
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
  /** Abre os veículos; ausente omite o item. */
  onOpenVehicles?: () => void;
  /** Abre a energia na aba VERS; ausente omite o item. */
  onOpenEnergy?: () => void;
  /** Confirmação de saída; ausente usa estado visual interno. */
  confirmingLogout?: boolean | null;
  /** Solicita a saída; ausente só alterna a confirmação interna. */
  onRequestLogout?: () => void;
  /** Confirma a saída sem encerrar nada localmente. */
  onConfirmLogout?: () => void;
  /** Cancela a saída e fecha a confirmação. */
  onCancelLogout?: () => void;
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
 * Apresenta cabeçalho, dados, edição, estados, atalhos e saída do perfil,
 * delegando voltar, edição, salvamento, nova tentativa, retorno ao Login,
 * atalhos, saída e troca de aba por callbacks.
 */
export function ProfileScreen({ onTabPress, profile = null, editing = null, draftName = null, onEdit, onCancelEdit, onDraftChange, onSave, status = 'success', onRetry, onOpenLogin, onOpenVehicles, onOpenEnergy, confirmingLogout = null, onRequestLogout, onConfirmLogout, onCancelLogout, isAdmin = null }: ProfileScreenProps) {
  const [internalEditing, setInternalEditing] = useState(false);
  const [internalDraft, setInternalDraft] = useState<string | null>(null);
  const [internalSaved, setInternalSaved] = useState<string | null>(null);
  const [internalConfirming, setInternalConfirming] = useState(false);
  const isConfirmingLogout = confirmingLogout ?? internalConfirming;
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

  /** Abre a confirmação de saída sem encerrar nada. */
  function requestLogout() {
    if (confirmingLogout == null) {
      setInternalConfirming(true);
    }

    onRequestLogout?.();
  }

  /** Confirma a saída sem encerrar nada localmente. */
  function confirmLogout() {
    if (confirmingLogout == null) {
      setInternalConfirming(false);
    }

    onConfirmLogout?.();
  }

  /** Cancela a saída e fecha a confirmação. */
  function cancelLogout() {
    if (confirmingLogout == null) {
      setInternalConfirming(false);
    }

    onCancelLogout?.();
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
      {isAdmin ? (
        <Text style={styles.adminSeal} testID="profile-admin-seal">
          Área do administrador
        </Text>
      ) : null}

      <View style={styles.emptyBlock}>
        {profile && status !== 'empty' ? (
          <View style={styles.profileBlock} testID="profile-data">
            <View style={styles.avatarBlock}>
              <View style={styles.avatarRing} testID="profile-avatar-ring">
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
              </View>
              {!isEditing ? (
                <Text style={styles.nameText}>
                  {currentName ? currentName : 'Sem nome definido'}
                </Text>
              ) : null}
            </View>
            {isEditing ? (
              <View style={styles.editBlock} testID="profile-edit-block">
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
                <Pressable
                  accessibilityLabel="Cancelar edição"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={cancelEdit}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>CANCELAR</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.divider} testID="profile-section-divider" />
                <Text style={styles.sectionTitle}>Carro</Text>
                {onOpenVehicles ? (
                  <Pressable
                    accessibilityLabel="Informações do carro"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onOpenVehicles?.()}
                    style={styles.sectionItem}
                  >
                    <Text style={styles.itemText}>Informações do carro</Text>
                  </Pressable>
                ) : null}
                {onOpenEnergy ? (
                  <Pressable
                    accessibilityLabel="Informações de energia"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onOpenEnergy?.()}
                    style={styles.sectionItem}
                  >
                    <Text style={styles.itemText}>Informações de energia</Text>
                  </Pressable>
                ) : null}
                <View style={styles.divider} testID="profile-section-divider" />
                <Text style={styles.sectionTitle}>Usuário</Text>
                <Pressable
                  accessibilityLabel="Editar informações de usuário"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={openEdit}
                  style={styles.sectionItem}
                >
                  <Text style={styles.itemText}>Editar informações de usuário</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Sair"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={requestLogout}
                  style={styles.logoutButton}
                >
                  <Text style={styles.logoutText}>SAIR</Text>
                </Pressable>
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
      <Modal
        animationType="fade"
        onRequestClose={cancelLogout}
        transparent
        visible={isConfirmingLogout}
      >
        <Pressable
          accessibilityLabel="Fechar confirmação de saída"
          onPress={cancelLogout}
          style={styles.backdrop}
          testID="profile-logout-backdrop"
        >
          <View
            accessibilityViewIsModal
            style={styles.confirmCard}
            testID="profile-logout-confirm"
          >
            <Text accessibilityRole="alert" style={styles.confirmText}>
              Deseja sair da conta?
            </Text>
            <View style={styles.confirmDivider} testID="profile-logout-confirm-divider" />
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityLabel="Confirmar saída"
                accessibilityRole="button"
                onPress={confirmLogout}
                style={styles.confirmActionRow}
              >
                <Text style={styles.logoutText}>Sair</Text>
              </Pressable>
              <View style={styles.confirmDivider} testID="profile-logout-confirm-divider" />
              <Pressable
                accessibilityLabel="Cancelar saída"
                accessibilityRole="button"
                onPress={cancelLogout}
                style={styles.confirmActionRow}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  profileBlock: {
    width: '100%',
  },
  avatarBlock: {
    alignItems: 'center',
  },
  adminSeal: {
    alignSelf: 'flex-start',
    color: theme.colors.gold,
    fontSize: 12,
  },
  avatarRing: {
    alignItems: 'center',
    borderColor: theme.colors.gold,
    borderRadius: 50,
    borderWidth: 2,
    height: 100,
    justifyContent: 'center',
    width: 100,
  },
  avatar: {
    borderRadius: 46,
    height: 92,
    width: 92,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: theme.colors.tabActive,
    borderRadius: 46,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  initialsText: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  nameText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  /** Divisor de seção na cor da marca. */
  divider: {
    borderTopColor: theme.colors.gold,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 16,
    width: '100%',
  },
  /** Título da seção; dourado à esquerda com respiro até a lista. */
  sectionTitle: {
    color: theme.colors.gold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'left',
  },
  /** Linha do item compacta; só repassa a navegação. */
  sectionItem: {
    paddingVertical: 4,
  },
  /** Texto do item; branco à esquerda, direto na tela. */
  itemText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'left',
  },
  /** Botão de saída em vermelho suave, sem apagar o texto. */
  logoutButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.errorSoft,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    width: '100%',
  },
  /** Texto de saída em vermelho sólido, peso médio. */
  logoutText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
  editBlock: {
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  /** Cancelar em texto, sem pílula; respiro próprio até o SALVAR. */
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  /** Rótulo do cancelar em branco, peso médio. */
  cancelText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '500',
  },
  actionButton: {
    marginTop: 12,
    maxWidth: 350,
    width: '100%',
  },
  /** Fundo escurecido do popup de confirmação de saída. */
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  /** Cartão centralizado do popup, na identidade da marca; sem margem horizontal (divisores cortam ponta a ponta). */
  confirmCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '100%',
  },
  /** Linhas de ação do popup empilhadas, sem respiro (o divisor separa). */
  confirmActions: {
    width: '100%',
  },
  /** Linha de ação do popup em texto, sem fundo. */
  confirmActionRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  /** Divisor entre as linhas do popup. */
  confirmDivider: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  /** Texto da pergunta em branco, centralizado, com respiro vertical próprio. */
  confirmText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
    paddingBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
