/**
 * Implementa a tela do sistema VERS (Task 07, lotes 07a–07b).
 *
 * Existe para dar ao sistema VERS uma rota própria na aba `vers` sem criar
 * pilha nova: usa o `ScreenShell` padrão, o `AppHeader` com voltar por
 * callback e a `BottomNavigation` com a aba vers ativa. A identificação da
 * instalação chega pronta por props (fixtures até F01/F05); nada é
 * calculado, buscado, persistido ou reinterpretado aqui e ausências nunca
 * viram zero. Nenhum segredo operacional (deviceUid, MQTT, tópicos, série)
 * passa por esta tela.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type VersSystemScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Identificação pública da instalação; ausente mantém o vazio. */
  installation?: VersInstallation | null;
};

/** Status público da instalação, como no contrato (F05 futuro). */
export type VersInstallationStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'FAULT';

/** Identificação pública da instalação; vem pronta do contrato. */
export type VersInstallation = {
  /** Modelo do sistema VERS; `null` omite a linha. */
  systemModel?: string | null;
  /** Estado público; `null` omite a linha. */
  status?: VersInstallationStatus | null;
  /** Data de instalação em UTC crua; `null` omite a linha. */
  installedAt?: string | null;
};

/** Rótulos públicos de status; o código cru nunca é exibido. */
const STATUS_LABELS: Record<VersInstallationStatus, string> = {
  ACTIVE: 'Ativo',
  MAINTENANCE: 'Em manutenção',
  INACTIVE: 'Inativo',
  FAULT: 'Falha',
};

/**
 * Apresenta cabeçalho e identificação do sistema VERS, delegando voltar e
 * troca de aba por callbacks.
 */
export function VersSystemScreen({ onTabPress, onBack, installation = null }: VersSystemScreenProps) {
  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="vers" onTabPress={onTabPress} />}
      testID="vers-system-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Montagem associada ao veículo"
        testID="vers-system-header"
        title="Sistema VERS"
      />

      <View style={styles.emptyBlock}>
        {installation ? (
          <View style={styles.card} testID="vers-installation">
            {installation.systemModel ? (
              <Text style={styles.modelText}>{installation.systemModel}</Text>
            ) : null}
            {installation.status ? (
              <Text style={styles.statusText}>{STATUS_LABELS[installation.status]}</Text>
            ) : null}
            {installation.installedAt ? (
              <Text style={styles.dateText}>{installation.installedAt}</Text>
            ) : null}
          </View>
        ) : (
          <Text
            accessibilityLabel="Nenhum sistema VERS vinculado."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="vers-empty"
          >
            Nenhum sistema VERS vinculado.
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
  modelText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  dateText: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: 4,
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
