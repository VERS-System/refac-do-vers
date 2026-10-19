/**
 * Implementa a tela do sistema VERS (Task 07, lotes 07a–07f).
 *
 * Existe para dar ao sistema VERS uma rota própria na aba `vers` sem criar
 * pilha nova: usa o `ScreenShell` padrão, o `AppHeader` com voltar por
 * callback e a `BottomNavigation` com a aba vers ativa. A identificação da
 * instalação, a configuração ativa, o dispositivo público, os estados e os
 * atalhos chegam prontos por props (fixtures até F01/F05); nada é calculado,
 * buscado, persistido ou reinterpretado aqui e ausências nunca viram zero.
 * Nenhum segredo operacional (deviceUid, MQTT, tópicos, série) passa por
 * esta tela.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AppSkeleton } from '../components/AppSkeleton';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type VersSystemScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Identificação pública da instalação; ausente mantém o vazio. */
  installation?: VersInstallation | null;
  /** Configuração ativa da montagem; ausente omite o bloco. */
  configuration?: VersConfiguration | null;
  /** Dispositivo público ativo; ausente omite o bloco, sem segredos. */
  device?: VersPublicDevice | null;
  /** Estado visual atual; `success` exibe identificação, config e device. */
  status?: VersSystemStatus;
  /** Repete a carga no erro; ausente mantém o botão sem efeito. */
  onRetry?: () => void;
  /** Abre os testes relacionados; ausente omite o atalho. */
  onOpenTests?: () => void;
  /** Abre a solicitação de revisão; ausente omite o atalho. */
  onOpenSupport?: () => void;
  /** Quando falso, omite o selo de amostra (dados reais do backend). */
  isSampleData?: boolean;
};

/** Estados visuais do sistema VERS; a origem dos dados é do backend (F05 futuro). */
export type VersSystemStatus = 'loading' | 'success' | 'empty' | 'error';

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

/** Associação dos piezos, como no contrato (F05 futuro). */
export type VersPiezoAssociation = 'SERIES' | 'PARALLEL' | 'MIXED';

/** Armazenamento da montagem, como no contrato (F05 futuro). */
export type VersStorageType = 'BATTERY' | 'SUPERCAPACITOR' | 'CAPACITOR' | 'NONE';

/** Configuração ativa da montagem; vem pronta do contrato. */
export type VersConfiguration = {
  /** Quantidade de piezos ativos; `null` omite a linha. */
  activePiezoCount?: number | null;
  /** Associação dos piezos; `null` omite a linha. */
  piezoAssociation?: VersPiezoAssociation | null;
  /** Ponto de instalação; `null` omite a linha. */
  installationPoint?: string | null;
  /** Tipo de armazenamento; `null` omite a linha. */
  storageType?: VersStorageType | null;
  /** Nome da montagem; `null` omite a linha. */
  name?: string | null;
  /** Versão da montagem; `null` omite a linha. */
  version?: number | null;
};

/** Rótulos públicos de associação; o código cru nunca é exibido. */
const ASSOCIATION_LABELS: Record<VersPiezoAssociation, string> = {
  SERIES: 'Série',
  PARALLEL: 'Paralelo',
  MIXED: 'Mista',
};

/** Rótulos públicos de armazenamento; o código cru nunca é exibido. */
const STORAGE_LABELS: Record<VersStorageType, string> = {
  BATTERY: 'Bateria',
  SUPERCAPACITOR: 'Super capacitor',
  CAPACITOR: 'Capacitor',
  NONE: 'Nenhum',
};

/** Estado público do dispositivo, como no contrato (F05 futuro). */
export type VersDeviceStatus = 'PROVISIONING' | 'ONLINE' | 'OFFLINE' | 'REVOKED' | 'FAULT';

/** Metadados públicos do dispositivo; vem pronto do contrato, sem segredos. */
export type VersPublicDevice = {
  /** Nome público; `null` omite a linha. */
  name?: string | null;
  /** Versão do firmware; `null` omite a linha. */
  firmwareVersion?: string | null;
  /** Estado público; `null` omite a linha. */
  status?: VersDeviceStatus | null;
  /** Última atividade em UTC crua; `null` omite a linha. */
  lastSeenAt?: string | null;
};

/** Rótulos públicos do dispositivo; o código cru nunca é exibido. */
const DEVICE_STATUS_LABELS: Record<VersDeviceStatus, string> = {
  PROVISIONING: 'Em provisionamento',
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  REVOKED: 'Revogado',
  FAULT: 'Falha',
};

/**
 * Apresenta cabeçalho, identificação, configuração, dispositivo, estados e
 * atalhos do sistema VERS, delegando voltar, nova tentativa, testes,
 * revisão e troca de aba por callbacks.
 */
export function VersSystemScreen({ onTabPress, onBack, installation = null, configuration = null, device = null, status = 'success', onRetry, onOpenTests, onOpenSupport, isSampleData = true }: VersSystemScreenProps) {
  const showWarning = installation?.status === 'MAINTENANCE' || installation?.status === 'FAULT';

  if (status === 'loading') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="vers" onTabPress={onTabPress} />}
        testID="vers-system-screen"
      >
        <View
          accessibilityLabel="Carregando"
          accessibilityRole="progressbar"
          style={styles.stateBlock}
          testID="vers-loading"
        >
          <AppSkeleton height={140} />
          <AppSkeleton height={120} />
        </View>
      </ScreenShell>
    );
  }

  if (status === 'error') {
    return (
      <ScreenShell
        footer={<BottomNavigation activeTab="vers" onTabPress={onTabPress} />}
        testID="vers-system-screen"
      >
        <View style={styles.stateBlock}>
          <Text
            accessibilityLabel="Não foi possível carregar o sistema VERS. Tente novamente."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="vers-error"
          >
            Não foi possível carregar o sistema VERS. Tente novamente.
          </Text>
          <View style={styles.retryButton}>
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

      {isSampleData && (
        <Text style={styles.sampleSeal} testID="vers-system-sample-seal">
          DADOS DE AMOSTRA
        </Text>
      )}

      <View style={styles.emptyBlock}>
        {showWarning ? (
          <Text
            accessibilityRole="alert"
            style={styles.warningText}
            testID="vers-warning"
          >
            {installation?.status === 'MAINTENANCE'
              ? 'Sistema em manutenção. Os dados podem estar desatualizados.'
              : 'Falha no sistema. Verifique os detalhes com o suporte.'}
          </Text>
        ) : null}

        {installation && status !== 'empty' ? (
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

        {configuration ? (
          <View style={styles.card} testID="vers-configuration">
            {configuration.activePiezoCount != null ? (
              <Text style={styles.modelText}>{`${configuration.activePiezoCount} piezos`}</Text>
            ) : null}
            {configuration.piezoAssociation ? (
              <Text style={styles.statusText}>{ASSOCIATION_LABELS[configuration.piezoAssociation]}</Text>
            ) : null}
            {configuration.installationPoint ? (
              <Text style={styles.dateText}>{configuration.installationPoint}</Text>
            ) : null}
            {configuration.storageType ? (
              <Text style={styles.dateText}>{STORAGE_LABELS[configuration.storageType]}</Text>
            ) : null}
            {configuration.name ? (
              <Text style={styles.dateText}>{configuration.name}</Text>
            ) : null}
            {configuration.version != null ? (
              <Text style={styles.dateText}>{`v${configuration.version}`}</Text>
            ) : null}
          </View>
        ) : null}

        {device ? (
          <View style={styles.card} testID="vers-device">
            {device.name ? (
              <Text style={styles.modelText}>{device.name}</Text>
            ) : null}
            {device.firmwareVersion ? (
              <Text style={styles.dateText}>{device.firmwareVersion}</Text>
            ) : null}
            {device.status ? (
              <Text style={styles.statusText}>{DEVICE_STATUS_LABELS[device.status]}</Text>
            ) : null}
            {device.lastSeenAt ? (
              <Text style={styles.dateText}>{device.lastSeenAt}</Text>
            ) : null}
          </View>
        ) : null}

        {onOpenTests ? (
          <View style={styles.actionButton}>
            <PrimaryButton
              accessibilityLabel="Ver testes do sistema"
              label="VER TESTES"
              onPress={() => onOpenTests?.()}
            />
          </View>
        ) : null}

        {onOpenSupport ? (
          <View style={styles.actionButton}>
            <PrimaryButton
              accessibilityLabel="Solicitar revisão do sistema"
              label="SOLICITAR REVISÃO"
              onPress={() => onOpenSupport?.()}
            />
          </View>
        ) : null}
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
    gap: 16,
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
  retryButton: {
    maxWidth: 350,
    width: '100%',
  },
  actionButton: {
    maxWidth: 350,
    width: '100%',
  },
  warningText: {
    color: theme.colors.primary,
    fontSize: 12,
    textAlign: 'center',
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
