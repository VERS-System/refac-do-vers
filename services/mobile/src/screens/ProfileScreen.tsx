/**
 * Implementa a tela de perfil (Task 09, lotes 09a–09b).
 *
 * Existe para dar ao perfil uma rota própria na aba `profile` sem criar
 * pilha nova: usa o `ScreenShell` padrão, o `AppHeader` com voltar por
 * callback e a `BottomNavigation` com a aba profile ativa. Os dados em
 * leitura chegam prontos por props (fixtures até F01/F05); edição, estados,
 * atalhos e saída vêm nos lotes seguintes. Nada é calculado, buscado,
 * persistido ou decidido aqui. Papéis, permissões e encerramento efetivo da
 * sessão pertencem ao backend.
 */

import { Image, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type ProfileScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Dados públicos da conta; ausente mantém o vazio. */
  profile?: UserProfile | null;
};

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
 * Apresenta cabeçalho e dados do perfil em leitura, delegando voltar e
 * troca de aba por callbacks.
 */
export function ProfileScreen({ onTabPress, onBack, profile = null }: ProfileScreenProps) {
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
        {profile ? (
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
                <Text style={styles.initialsText}>{getInitials(profile.displayName)}</Text>
              </View>
            )}
            <Text style={styles.nameText}>
              {profile.displayName ? profile.displayName : 'Sem nome definido'}
            </Text>
            {profile.email ? (
              <Text style={styles.emailText}>{profile.email}</Text>
            ) : null}
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
