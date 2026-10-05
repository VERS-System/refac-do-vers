/**
 * Implementa a tela de veículos (Task 10, lotes 10a–10f).
 *
 * Existe para dar aos veículos uma rota interna sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback e a
 * `BottomNavigation` com a aba profile de origem. Listagem, detalhes,
 * cadastro, edição e remoção chegam por props (fixtures até F01/F05); sem
 * props de controle, rascunho, confirmação e substituto usam estado visual
 * interno. Só os campos do contrato são repassados, sem validação de
 * domínio e sem documentos. Nada é calculado, buscado, persistido ou
 * decidido aqui; unicidade, vínculo e remoção atômica pertencem ao backend.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { AuthTextField } from '../components/AuthTextField';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type VehiclesScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Itens vinculados; vêm prontos do contrato. */
  items?: VehicleListItem[];
  /** Seleciona o veículo para detalhes; ausente só exibe as linhas. */
  onSelectVehicle?: (vehicleId: string) => void;
  /** Abre o cadastro; ausente omite o botão. */
  onOpenCreate?: () => void;
  /** Detalhe do veículo selecionado; ausente mantém só a lista. */
  selectedVehicle?: VehicleDetail | null;
  /** Abre a edição do detalhe; ausente omite o botão. */
  onEditVehicle?: (vehicleId: string) => void;
  /** Solicita a remoção do detalhe; ausente omite o botão. */
  onRemoveVehicle?: (vehicleId: string) => void;
  /** Solicita tornar o detalhe principal; ausente omite o botão. */
  onMakePrimary?: (vehicleId: string) => void;
  /** Rascunho do cadastro; ausente usa estado visual interno. */
  vehicleDraft?: Partial<VehicleDraft> | null;
  /** Edição do rascunho; ausente só atualiza o modo interno. */
  onVehicleChange?: (next: VehicleDraft) => void;
  /** Envio do cadastro só com os campos do contrato. */
  onSubmitCreate?: (draft: VehicleDraft) => void;
  /** Veículo em edição; presente liga o modo de edição com placa travada. */
  editingVehicle?: VehicleDetail | null;
  /** Envio da edição só com mutáveis, sem placa e sem id. */
  onSubmitUpdate?: (changes: VehicleUpdate) => void;
  /** Cancela a edição e descarta o rascunho. */
  onCancelEditVehicle?: () => void;
  /** Confirmação de remoção; ausente usa estado visual interno. */
  confirmingRemove?: boolean | null;
  /** Solicita a remoção e abre a confirmação. */
  onRequestRemove?: (vehicleId: string) => void;
  /** Confirma a remoção com o substituto escolhido (pode ser nulo). */
  onConfirmRemove?: (vehicleId: string, replacementId: string | null) => void;
  /** Cancela a remoção e fecha a confirmação. */
  onCancelRemove?: () => void;
  /** Exige escolha de substituto na confirmação. */
  replacementRequired?: boolean | null;
  /** Mensagem pública de conflito; exibida sem detalhe interno. */
  conflictMessage?: string | null;
  /** Desabilita as ações do detalhe quando indisponível. */
  actionsDisabled?: boolean | null;
};

/** Mutáveis do veículo; placa e id nunca entram. */
export type VehicleUpdate = {
  brand: string;
  model: string;
  modelYear: string;
};

/** Linha da lista de veículos; vem pronta do contrato. */
export type VehicleListItem = {
  /** Identificador estável do veículo. */
  id: string;
  /** Placa normalizada; imutável após o cadastro. */
  licensePlate: string;
  /** Marca; `null` omite a linha. */
  brand?: string | null;
  /** Modelo; `null` omite a linha. */
  model?: string | null;
  /** Principal da conta. */
  isPrimary?: boolean | null;
};

/** Vínculo com o veículo, como no contrato (F05 futuro). */
export type VehicleRelationship = 'OWNER' | 'DRIVER' | 'ADMIN';

/** Detalhe do veículo selecionado; vem pronto do contrato. */
export type VehicleDetail = {
  /** Identificador estável do veículo. */
  id: string;
  /** Placa normalizada; imutável após o cadastro. */
  licensePlate: string;
  /** Marca; `null` omite a linha. */
  brand?: string | null;
  /** Modelo; `null` omite a linha. */
  model?: string | null;
  /** Ano do modelo; `null` omite a linha. */
  modelYear?: number | null;
  /** Principal da conta. */
  isPrimary?: boolean | null;
  /** Vínculo; `null` omite a linha. */
  relationship?: VehicleRelationship | null;
};

/** Rótulos públicos de vínculo; o código cru nunca é exibido. */
const RELATIONSHIP_LABELS: Record<VehicleRelationship, string> = {
  ADMIN: 'Administrador',
  DRIVER: 'Condutor',
  OWNER: 'Proprietário',
};

/** Rascunho visual do cadastro; só os campos do contrato, sem validação. */
export type VehicleDraft = {
  licensePlate: string;
  brand: string;
  model: string;
  modelYear: string;
};

/** Rascunho vazio exibido sem prop. */
const EMPTY_VEHICLE: VehicleDraft = {
  brand: '',
  licensePlate: '',
  model: '',
  modelYear: '',
};

/**
 * Apresenta cabeçalho, listagem, detalhes e cadastro dos veículos,
 * delegando voltar, seleção, cadastro, edição, remoção, principal e troca
 * de aba por callbacks.
 */
export function VehiclesScreen({ onTabPress, onBack, items = [], onSelectVehicle, onOpenCreate, selectedVehicle = null, onEditVehicle, onRemoveVehicle, onMakePrimary, vehicleDraft = null, onVehicleChange, onSubmitCreate, editingVehicle = null, onSubmitUpdate, onCancelEditVehicle, confirmingRemove = null, onRequestRemove, onConfirmRemove, onCancelRemove, replacementRequired = null, conflictMessage = null, actionsDisabled = null }: VehiclesScreenProps) {
  const [internalDraft, setInternalDraft] = useState<VehicleDraft>(EMPTY_VEHICLE);
  const [internalConfirming, setInternalConfirming] = useState(false);
  const [internalReplacement, setInternalReplacement] = useState<string | null>(null);
  const [internalCreated, setInternalCreated] = useState<VehicleListItem[]>([]);
  const visibleItems = [...internalCreated, ...items];
  const isConfirmingRemove = confirmingRemove ?? internalConfirming;
  const isActionsDisabled = actionsDisabled ?? false;
  const isEditingVehicle = editingVehicle != null;
  const editBase: VehicleDraft = {
    brand: editingVehicle?.brand ?? '',
    licensePlate: editingVehicle?.licensePlate ?? '',
    model: editingVehicle?.model ?? '',
    modelYear: editingVehicle?.modelYear != null ? `${editingVehicle.modelYear}` : '',
  };
  const draft: VehicleDraft =
    vehicleDraft != null
      ? { ...EMPTY_VEHICLE, ...vehicleDraft }
      : internalDraft === EMPTY_VEHICLE && isEditingVehicle
        ? editBase
        : internalDraft;

  /** Repassa a edição do campo sem validar domínio e sem documentos. */
  function changeVehicleField(field: keyof VehicleDraft, value: string) {
    const next = { ...draft, [field]: value };

    if (vehicleDraft == null) {
      setInternalDraft(next);
    }

    onVehicleChange?.(next);
  }

  /** Envia o cadastro; sem callback, guarda na lista visual local. */
  function submitCreate() {
    if (onSubmitCreate == null) {
      const created: VehicleListItem = {
        brand: draft.brand || null,
        id: `local-${Date.now()}`,
        isPrimary: false,
        licensePlate: draft.licensePlate.trim() || 'SEM PLACA',
        model: draft.model || null,
      };

      setInternalCreated((previous) => [created, ...previous]);
      setInternalDraft(EMPTY_VEHICLE);
    }

    onSubmitCreate?.(draft);
  }

  /** Envia a edição só com mutáveis, sem placa e sem id. */
  function submitUpdate() {
    onSubmitUpdate?.({ brand: draft.brand, model: draft.model, modelYear: draft.modelYear });
  }

  /** Solicita a remoção e abre a confirmação inline. */
  function requestRemove() {
    if (!selectedVehicle) {
      return;
    }

    onRemoveVehicle?.(selectedVehicle.id);

    if (confirmingRemove == null) {
      setInternalConfirming(true);
    }

    onRequestRemove?.(selectedVehicle.id);
  }

  /** Confirma a remoção com o substituto escolhido (pode ser nulo). */
  function confirmRemove() {
    if (!selectedVehicle) {
      return;
    }

    if (confirmingRemove == null) {
      setInternalConfirming(false);
    }

    onConfirmRemove?.(selectedVehicle.id, internalReplacement);
  }

  /** Cancela a remoção e fecha a confirmação. */
  function cancelRemove() {
    if (confirmingRemove == null) {
      setInternalConfirming(false);
      setInternalReplacement(null);
    }

    onCancelRemove?.();
  }
  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab="profile" onTabPress={onTabPress} />}
      testID="vehicles-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Lista, detalhes e cadastro"
        testID="vehicles-header"
        title="Veículos"
      />

      <View style={styles.emptyBlock}>
        {conflictMessage ? (
          <View style={styles.listCard} testID="vehicles-conflict">
            <Text
              accessibilityRole="alert"
              style={styles.primarySeal}
            >
              {conflictMessage}
            </Text>
          </View>
        ) : null}

        {onOpenCreate ? (
          <View style={styles.createButton}>
            <PrimaryButton
              accessibilityLabel="Cadastrar veículo"
              label="CADASTRAR"
              onPress={() => onOpenCreate?.()}
            />
          </View>
        ) : null}

        {visibleItems.length > 0 ? (
          <View style={styles.listCard} testID="vehicles-list">
            {visibleItems.map((item) => (
              <Pressable
                accessibilityLabel={`${item.licensePlate} ${item.model ?? ''}`.trim()}
                accessibilityRole="button"
                key={item.id}
                onPress={() => onSelectVehicle?.(item.id)}
                style={styles.listRow}
              >
                <Text style={styles.plateText}>{item.licensePlate}</Text>
                {item.model ? (
                  <Text style={styles.modelText}>{item.model}</Text>
                ) : null}
                {item.isPrimary ? (
                  <Text style={styles.primarySeal}>Principal</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <Text
            accessibilityLabel="Nenhum veículo vinculado."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="vehicles-empty"
          >
            Nenhum veículo vinculado.
          </Text>
        )}

        {selectedVehicle ? (
          <View style={styles.listCard} testID="vehicles-detail">
            <Text style={styles.plateText}>{selectedVehicle.licensePlate}</Text>
            {selectedVehicle.brand ? (
              <Text style={styles.modelText}>{selectedVehicle.brand}</Text>
            ) : null}
            {selectedVehicle.model ? (
              <Text style={styles.modelText}>{selectedVehicle.model}</Text>
            ) : null}
            {selectedVehicle.modelYear != null ? (
              <Text style={styles.modelText}>{`${selectedVehicle.modelYear}`}</Text>
            ) : null}
            {selectedVehicle.isPrimary ? (
              <Text style={styles.primarySeal}>Principal</Text>
            ) : null}
            {selectedVehicle.relationship ? (
              <Text style={styles.modelText}>{RELATIONSHIP_LABELS[selectedVehicle.relationship]}</Text>
            ) : null}
            {onEditVehicle ? (
              <View style={styles.createButton}>
                <PrimaryButton
                  accessibilityLabel="Editar veículo"
                  disabled={isActionsDisabled}
                  label="EDITAR"
                  onPress={() => onEditVehicle?.(selectedVehicle.id)}
                />
              </View>
            ) : null}
            <View style={styles.createButton}>
              <PrimaryButton
                accessibilityLabel="Remover veículo"
                disabled={isActionsDisabled}
                label="REMOVER"
                onPress={requestRemove}
              />
            </View>
            {onMakePrimary && !selectedVehicle.isPrimary ? (
              <View style={styles.createButton}>
                <PrimaryButton
                  accessibilityLabel="Tornar principal"
                  disabled={isActionsDisabled}
                  label="TORNAR PRINCIPAL"
                  onPress={() => onMakePrimary?.(selectedVehicle.id)}
                />
              </View>
            ) : null}
            {isConfirmingRemove ? (
              <View style={styles.confirmBlock} testID="vehicles-remove-confirm">
                <Text style={styles.confirmText}>Remover este veículo?</Text>
                {replacementRequired ? (
                  <View style={styles.optionRow}>
                    {visibleItems
                      .filter((item) => item.id !== selectedVehicle.id)
                      .map((item) => (
                        <Pressable
                          accessibilityLabel={`Substituto: ${item.licensePlate}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: internalReplacement === item.id }}
                          hitSlop={8}
                          key={item.id}
                          onPress={() => setInternalReplacement(item.id)}
                          style={[
                            styles.optionChip,
                            internalReplacement === item.id && styles.optionChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              internalReplacement === item.id && styles.optionChipTextSelected,
                            ]}
                          >
                            {item.licensePlate}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                ) : null}
                <View style={styles.createButton}>
                  <PrimaryButton
                    accessibilityLabel="Confirmar remoção"
                    label="CONFIRMAR REMOÇÃO"
                    onPress={confirmRemove}
                  />
                </View>
                <View style={styles.createButton}>
                  <PrimaryButton
                    accessibilityLabel="Cancelar remoção"
                    label="CANCELAR"
                    onPress={cancelRemove}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.listCard} testID="vehicles-form">
          {isEditingVehicle ? (
            <Text style={styles.plateText}>{draft.licensePlate}</Text>
          ) : (
            <AuthTextField
              autoCapitalize="characters"
              label="Placa:"
              onChangeText={(value) => changeVehicleField('licensePlate', value)}
              placeholder="ABC1D23"
              value={draft.licensePlate}
            />
          )}
          <View style={styles.fieldGap}>
            <AuthTextField
              label="Marca:"
              onChangeText={(value) => changeVehicleField('brand', value)}
              placeholder="Marca do veículo"
              value={draft.brand}
            />
          </View>
          <View style={styles.fieldGap}>
            <AuthTextField
              label="Modelo:"
              onChangeText={(value) => changeVehicleField('model', value)}
              placeholder="Modelo do veículo"
              value={draft.model}
            />
          </View>
          <View style={styles.fieldGap}>
            <AuthTextField
              keyboardType="numeric"
              label="Ano:"
              onChangeText={(value) => changeVehicleField('modelYear', value)}
              placeholder="2026"
              value={draft.modelYear}
            />
          </View>
          {isEditingVehicle ? (
            <>
              <View style={styles.createButton}>
                <PrimaryButton
                  accessibilityLabel="Salvar alterações"
                  label="SALVAR ALTERAÇÕES"
                  onPress={submitUpdate}
                />
              </View>
              <View style={styles.createButton}>
                <PrimaryButton
                  accessibilityLabel="Cancelar edição"
                  label="CANCELAR"
                  onPress={() => onCancelEditVehicle?.()}
                />
              </View>
            </>
          ) : (
            <View style={styles.createButton}>
              <PrimaryButton
                accessibilityLabel="Confirmar cadastro"
                label="CADASTRAR VEÍCULO"
                onPress={submitCreate}
              />
            </View>
          )}
        </View>
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
  createButton: {
    marginTop: 12,
    maxWidth: 350,
    width: '100%',
  },
  confirmBlock: {
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  confirmText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  optionChip: {
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  optionChipSelected: {
    backgroundColor: theme.colors.tabActive,
    borderColor: theme.colors.primary,
  },
  optionChipText: {
    color: theme.colors.primary,
    fontSize: 11,
  },
  optionChipTextSelected: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  fieldGap: {
    marginTop: 12,
    width: '100%',
  },
  listCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    width: '100%',
  },
  listRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  plateText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modelText: {
    color: theme.colors.gray,
    fontSize: 12,
    marginTop: 2,
  },
  primarySeal: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
