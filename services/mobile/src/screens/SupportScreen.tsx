/**
 * Implementa a tela de Suporte (Task 12, lote 12a).
 *
 * Existe para dar às solicitações de revisão do sistema VERS uma rota
 * interna sem criar aba nova: usa o `ScreenShell` padrão e o `AppHeader`
 * com voltar por callback. A lista, os detalhes, o formulário, a
 * confirmação e os estados chegam por props nos próximos lotes (fixtures
 * até F01/F05, campos e status do contrato de suporte). Nada é calculado,
 * buscado, persistido ou decidido aqui; autorização, vínculo e transições
 * de estado pertencem ao backend.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type SupportScreenProps = {
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Solicitações vinculadas; vêm prontas do contrato. */
  items?: SupportListItem[];
  /** Seleciona a solicitação para detalhes; ausente só exibe as linhas. */
  onSelectRequest?: (requestId: string) => void;
  /** Abre o formulário; ausente omite o botão. */
  onOpenCreate?: () => void;
  /** Detalhe da solicitação selecionada; ausente mantém só a lista. */
  selectedRequest?: SupportDetail | null;
  /** Volta à lista; ausente mantém o botão sem efeito. */
  onBackToList?: () => void;
};

/** Estados do contrato de suporte; só exibidos, sem transição no cliente. */
export type SupportStatus = 'OPEN' | 'IN_REVIEW' | 'SCHEDULED' | 'RESOLVED' | 'CANCELLED';

/** Linha da lista de suporte; vem pronta do contrato. */
export type SupportListItem = {
  /** Identificador estável da solicitação. */
  id: string;
  /** Estado atual; só o selo textual é exibido. */
  status: SupportStatus;
  /** Criação em UTC; cru, sem conversão no cliente. */
  createdAt: string;
};

/** Detalhe da solicitação selecionada; vem pronto do contrato. */
export type SupportDetail = {
  /** Identificador estável da solicitação. */
  id: string;
  /** Veículo da solicitação; `null` após exclusão, sem reexpor dados. */
  vehicleId: string | null;
  /** Instalação da solicitação; `null` após exclusão, sem reexpor dados. */
  installationId: string | null;
  /** Motivo textual; cru, sem validação no cliente. */
  reason: string;
  /** Estado atual; só o selo textual é exibido. */
  status: SupportStatus;
  /** Criação em UTC; cru, sem conversão no cliente. */
  createdAt: string;
  /** Atualização em UTC; cru, sem conversão no cliente. */
  updatedAt: string;
};

/** Rótulos públicos de estado; o código cru nunca é exibido. */
export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  OPEN: 'Aberta',
  IN_REVIEW: 'Em revisão',
  SCHEDULED: 'Agendada',
  RESOLVED: 'Resolvida',
  CANCELLED: 'Cancelada',
};

/**
 * Renderiza o scaffold do suporte com lista e detalhes; o formulário chega
 * no próximo lote por props.
 */
export function SupportScreen({ onBack, items = [], onSelectRequest, onOpenCreate, selectedRequest = null, onBackToList }: SupportScreenProps) {
  return (
    <ScreenShell testID="support-screen">
      <AppHeader
        onBack={onBack}
        subtitle="Revisão do sistema VERS"
        testID="support-header"
        title="Suporte"
      />
      {selectedRequest ? (
        <View style={styles.emptyBlock} testID="support-detail">
          <Text style={styles.statusSeal}>{SUPPORT_STATUS_LABELS[selectedRequest.status]}</Text>
          <Text style={styles.reasonText}>{selectedRequest.reason}</Text>
          <Text style={styles.fieldLabel}>Veículo</Text>
          {selectedRequest.vehicleId ? (
            <Text style={styles.fieldText}>{selectedRequest.vehicleId}</Text>
          ) : (
            <Text style={styles.fieldText}>Não disponível</Text>
          )}
          <Text style={styles.fieldLabel}>Instalação</Text>
          {selectedRequest.installationId ? (
            <Text style={styles.fieldText}>{selectedRequest.installationId}</Text>
          ) : (
            <Text style={styles.fieldText}>Não disponível</Text>
          )}
          <Text style={styles.fieldLabel}>Criada em</Text>
          <Text style={styles.fieldText}>{selectedRequest.createdAt}</Text>
          <Text style={styles.fieldLabel}>Atualizada em</Text>
          <Text style={styles.fieldText}>{selectedRequest.updatedAt}</Text>
          <View style={styles.createButton}>
            <PrimaryButton
              accessibilityLabel="Voltar para a lista"
              label="VOLTAR PARA A LISTA"
              onPress={() => onBackToList?.()}
            />
          </View>
        </View>
      ) : (
        <View style={styles.emptyBlock}>
          {onOpenCreate ? (
            <View style={styles.createButton}>
              <PrimaryButton
                accessibilityLabel="Nova solicitação"
                label="NOVA SOLICITAÇÃO"
                onPress={() => onOpenCreate?.()}
              />
            </View>
          ) : null}

          {items.length > 0 ? (
            <View style={styles.listCard} testID="support-list">
              {items.map((item) => (
                <Pressable
                  accessibilityLabel={`${SUPPORT_STATUS_LABELS[item.status]} ${item.createdAt}`.trim()}
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => onSelectRequest?.(item.id)}
                  style={styles.listRow}
                >
                  <Text style={styles.statusSeal}>{SUPPORT_STATUS_LABELS[item.status]}</Text>
                  <Text style={styles.dateText}>{item.createdAt}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text
              accessibilityLabel="Nenhuma solicitação ainda."
              accessibilityRole="alert"
              style={styles.emptyText}
              testID="support-empty"
            >
              Nenhuma solicitação ainda.
            </Text>
          )}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  /** Bloco do vazio; só espaçamento, sem identidade própria. */
  emptyBlock: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  /** Texto do vazio; cor neutra do tema, sem dado inventado. */
  emptyText: {
    color: theme.colors.gray,
    fontSize: 14,
    textAlign: 'center',
  },
  /** Espaço do CTA de nova solicitação. */
  createButton: {
    marginBottom: theme.spacing.md,
  },
  /** Cartão da lista; agrupa as linhas sem regra de negócio. */
  listCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  /** Linha da solicitação; só repassa a seleção. */
  listRow: {
    paddingVertical: theme.spacing.sm,
  },
  /** Selo textual do estado; vem do contrato, sem cor por regra. */
  statusSeal: {
    color: theme.colors.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  /** Data crua da criação; sem conversão de timezone no cliente. */
  dateText: {
    color: theme.colors.gray,
    fontSize: 12,
  },
  /** Motivo cru do detalhe; sem validação no cliente. */
  reasonText: {
    color: theme.colors.gold,
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
  /** Rótulo do campo do detalhe; só identifica, sem regra. */
  fieldLabel: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: theme.spacing.sm,
  },
  /** Valor cru do campo do detalhe; nulo vira histórico. */
  fieldText: {
    color: theme.colors.gold,
    fontSize: 13,
  },
});
