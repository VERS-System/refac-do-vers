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

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AppSkeleton } from '../components/AppSkeleton';
import { AuthTextField } from '../components/AuthTextField';
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
  /** Liga o modo de formulário; ausente omite o form. */
  isCreating?: boolean | null;
  /** Veículos elegíveis; só exibe entre os informados. */
  vehicles?: SupportOption[];
  /** Instalações elegíveis; só exibe entre as informadas. */
  installations?: SupportOption[];
  /** Rascunho da solicitação; ausente usa estado visual interno. */
  supportDraft?: SupportDraft | null;
  /** Edição do rascunho; ausente só atualiza o modo interno. */
  onSupportChange?: (draft: SupportDraft) => void;
  /** Envio só com os campos do contrato, após a confirmação. */
  onSubmitCreate?: (draft: SupportDraft) => void;
  /** Cancela o formulário. */
  onCancelCreate?: () => void;
  /** Confirmação de envio; ausente usa estado visual interno. */
  confirmingCreate?: boolean | null;
  /** Estado visual atual; `success` exibe lista, detalhe e form. */
  status?: SupportScreenStatus;
  /** Repete a carga no erro; ausente mantém o botão sem efeito. */
  onRetry?: () => void;
};

/** Estados visuais do suporte; a origem dos dados é do backend (F05 futuro). */
export type SupportScreenStatus = 'loading' | 'empty' | 'error' | 'sending' | 'success';

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

/** Opção de veículo ou instalação; vem pronta, sem buscar nada. */
export type SupportOption = {
  /** Identificador estável do recurso. */
  id: string;
  /** Rótulo cru do recurso. */
  label: string;
};

/** Rascunho da solicitação; só os campos do contrato. */
export type SupportDraft = {
  /** Veículo escolhido; vazio é nenhuma escolha. */
  vehicleId: string;
  /** Instalação escolhida; vazio é nenhuma escolha. */
  installationId: string;
  /** Motivo textual; cru, sem validação no cliente. */
  reason: string;
};

/** Rascunho vazio; nenhuma escolha e nenhum texto. */
const EMPTY_DRAFT: SupportDraft = { vehicleId: '', installationId: '', reason: '' };

/**
 * Renderiza o scaffold do suporte com lista, detalhes e formulário; a
 * confirmação e os estados chegam nos próximos lotes por props.
 */
export function SupportScreen({ onBack, items = [], onSelectRequest, onOpenCreate, selectedRequest = null, onBackToList, isCreating, vehicles, installations, supportDraft, onSupportChange, onSubmitCreate, onCancelCreate, confirmingCreate = null, status = 'success', onRetry }: SupportScreenProps) {
  const [innerDraft, setInnerDraft] = useState<SupportDraft>(EMPTY_DRAFT);
  const [innerConfirming, setInnerConfirming] = useState(false);
  const [innerSent, setInnerSent] = useState(false);
  const isControlled = supportDraft != null;
  const draft = isControlled ? (supportDraft as SupportDraft) : innerDraft;
  const isConfirmingCreate = confirmingCreate ?? innerConfirming;

  if (status === 'loading') {
    return (
      <ScreenShell testID="support-screen">
        <View
          accessibilityLabel="Carregando"
          accessibilityRole="progressbar"
          style={styles.emptyBlock}
          testID="support-loading"
        >
          <AppSkeleton height={120} />
          <AppSkeleton height={140} />
        </View>
      </ScreenShell>
    );
  }

  if (status === 'error') {
    return (
      <ScreenShell testID="support-screen">
        <View style={styles.emptyBlock}>
          <Text
            accessibilityLabel="Não foi possível carregar as solicitações. Tente novamente."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="support-error"
          >
            Não foi possível carregar as solicitações.
          </Text>
          <View style={styles.createButton}>
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

  /** Atualiza o rascunho; no modo interno edita o campo direto. */
  const changeDraft = (next: SupportDraft) => {
    if (!isControlled) {
      setInnerDraft(next);
    }
    onSupportChange?.(next);
  };

  /** Abre a confirmação inline; o rascunho segue intacto. */
  function requestCreate() {
    if (confirmingCreate == null) {
      setInnerConfirming(true);
    }
  }

  /** Confirma o envio com o rascunho atual e marca como concluído. */
  function confirmCreate() {
    if (confirmingCreate == null) {
      setInnerConfirming(false);
      setInnerSent(true);
    }

    onSubmitCreate?.(draft);
  }

  /** Cancela a confirmação e volta à edição sem apagar o digitado. */
  function cancelCreateConfirm() {
    if (confirmingCreate == null) {
      setInnerConfirming(false);
    }
  }

  /** Sai do envio concluído e volta à lista. */
  function dismissSent() {
    setInnerSent(false);

    onBackToList?.();
  }

  return (
    <ScreenShell testID="support-screen">
      <AppHeader
        onBack={onBack}
        subtitle="Revisão do sistema VERS"
        testID="support-header"
        title="Suporte"
      />
      {isCreating ? (
        <View style={styles.emptyBlock} testID="support-form">
          {vehicles && vehicles.length > 0 ? (
            <View testID="support-vehicle-options">
              <Text style={styles.fieldLabel}>Veículo</Text>
              <View style={styles.optionRow}>
                {vehicles.map((option) => (
                  <Pressable
                    accessibilityLabel={`Veículo: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.vehicleId === option.id }}
                    key={option.id}
                    onPress={() => changeDraft({ ...draft, vehicleId: option.id })}
                    style={[
                      styles.optionChip,
                      draft.vehicleId === option.id && styles.optionChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        draft.vehicleId === option.id && styles.optionChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {installations && installations.length > 0 ? (
            <View testID="support-installation-options">
              <Text style={styles.fieldLabel}>Instalação</Text>
              <View style={styles.optionRow}>
                {installations.map((option) => (
                  <Pressable
                    accessibilityLabel={`Instalação: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.installationId === option.id }}
                    key={option.id}
                    onPress={() => changeDraft({ ...draft, installationId: option.id })}
                    style={[
                      styles.optionChip,
                      draft.installationId === option.id && styles.optionChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        draft.installationId === option.id && styles.optionChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.fieldGap}>
            <AuthTextField
              label="Motivo:"
              multiline
              onChangeText={(value) => changeDraft({ ...draft, reason: value })}
              placeholder="Descreva o motivo da revisão"
              value={draft.reason}
            />
          </View>
          <Text style={styles.noticeText}>
            Documentos e anexos não fazem parte desta solicitação.
          </Text>
          {status === 'sending' ? (
            <Text
              accessibilityRole="alert"
              style={styles.noticeText}
              testID="support-sending"
            >
              Enviando solicitação…
            </Text>
          ) : null}
          {innerSent ? (
            <View style={styles.confirmBlock} testID="support-create-success">
              <Text
                accessibilityRole="alert"
                style={styles.confirmText}
              >
                Solicitação enviada.
              </Text>
              <View style={styles.createButton}>
                <PrimaryButton
                  accessibilityLabel="Voltar para a lista"
                  label="VOLTAR PARA A LISTA"
                  onPress={dismissSent}
                />
              </View>
            </View>
          ) : null}
          {isConfirmingCreate ? (
            <View style={styles.confirmBlock} testID="support-create-confirm">
              <Text style={styles.confirmText}>Enviar esta solicitação?</Text>
              <View style={styles.createButton}>
                <PrimaryButton
                  accessibilityLabel="Confirmar envio"
                  label="CONFIRMAR ENVIO"
                  onPress={confirmCreate}
                />
              </View>
              <View style={styles.createButton}>
                <PrimaryButton
                  accessibilityLabel="Cancelar confirmação"
                  label="CANCELAR"
                  onPress={cancelCreateConfirm}
                />
              </View>
            </View>
          ) : null}
          <View style={styles.createButton}>
            <PrimaryButton
              accessibilityLabel="Enviar solicitação"
              label="ENVIAR SOLICITAÇÃO"
              onPress={requestCreate}
            />
          </View>
          <View style={styles.createButton}>
            <PrimaryButton
              accessibilityLabel="Cancelar solicitação"
              label="CANCELAR"
              onPress={() => onCancelCreate?.()}
            />
          </View>
        </View>
      ) : selectedRequest ? (
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
  /** Espaço entre os campos do formulário. */
  fieldGap: {
    marginTop: theme.spacing.md,
  },
  /** Aviso de escopo; documentos fora do fluxo inicial. */
  noticeText: {
    color: theme.colors.gray,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  /** Linha das opções; só exibe entre as informadas. */
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  /** Chip da opção; sem regra de elegibilidade no cliente. */
  optionChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  /** Chip da opção escolhida; só marca visual. */
  optionChipSelected: {
    backgroundColor: theme.colors.gold,
  },
  /** Texto do chip; cru, sem conversão. */
  optionChipText: {
    color: theme.colors.gold,
    fontSize: 12,
  },
  /** Texto do chip escolhido; só contraste. */
  optionChipTextSelected: {
    color: theme.colors.dark,
  },
  /** Bloco da confirmação e do envio concluído; só pede decisão. */
  confirmBlock: {
    marginTop: theme.spacing.md,
  },
  /** Texto da confirmação; sem dado sensível. */
  confirmText: {
    color: theme.colors.gold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
});
