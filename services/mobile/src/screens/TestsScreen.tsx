/**
 * Implementa a tela de testes experimentais (Task 08, lotes 08a–08f).
 *
 * Existe para dar aos testes uma rota interna sem criar aba nova: usa o
 * `ScreenShell` padrão, o `AppHeader` com voltar por callback e a
 * `BottomNavigation` com a aba de origem. Listagem, filtros, detalhes,
 * planejamento e confirmações chegam prontos por props (fixtures até
 * F01/F05); sem `planDraft` o rascunho usa estado visual interno para não
 * resetar o digitado na rota sem estado do pai. Nada é calculado, buscado,
 * persistido ou presumido aqui e nenhuma transição é concluída localmente.
 * Nenhum comando MQTT passa por esta tela.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { AuthTextField } from '../components/AuthTextField';
import { BottomNavigation, type MainTab } from '../components/BottomNavigation';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../constants/theme';

type TestsScreenProps = {
  onTabPress?: (tab: MainTab) => void;
  /** Volta ao fluxo anterior; rota interna, sem regra de sessão. */
  onBack?: () => void;
  /** Aba de origem herdada na barra; padrão é a bateria. */
  activeTab?: MainTab;
  /** Itens da página atual; vêm fatiados do contrato como no envelope. */
  items?: TestListItem[];
  /** Página atual (base 1), como no `meta` do contrato. */
  page?: number;
  /** Tamanho da página, como no `meta` do contrato. */
  pageSize?: number;
  /** Total de itens, como no `meta` do contrato. */
  totalItems?: number;
  /** Troca de página; ausente só exibe o rótulo sem navegar. */
  onPageChange?: (page: number) => void;
  /** Seleciona o teste para detalhes; ausente só exibe as linhas. */
  onSelectTest?: (testId: string) => void;
  /** Filtro de estado exibido; `ALL` significa sem filtro. */
  statusFilter?: TestListStatus | 'ALL' | null;
  /** Filtro de instalação exibido como veio do contrato. */
  installationFilter?: string | null;
  /** Troca de filtro; ausente só exibe os rótulos sem notificar. */
  onFilterChange?: (filter: TestFilter) => void;
  /** Detalhe do teste selecionado; ausente mantém só lista e filtros. */
  selectedTest?: TestDetail | null;
  /** Rascunho do planejamento; ausente usa o vazio. */
  planDraft?: Partial<TestPlanDraft> | null;
  /** Edição do rascunho; ausente só exibe os campos. */
  onPlanChange?: (next: TestPlanDraft) => void;
  /** Envio do planejamento; ausente omite o botão. */
  onSubmitPlan?: (draft: TestPlanDraft) => void;
  /** Solicita o início; chamado só após confirmação. */
  onStart?: () => void;
  /** Solicita a finalização; chamado só após confirmação. */
  onFinish?: () => void;
  /** Solicita o cancelamento; chamado só após confirmação. */
  onCancel?: () => void;
  /** Estado da ação; `conflict` exibe mensagem pública sem presumir transição. */
  actionState?: TestActionState;
  /** Mensagem pública do conflito; exibida sem detalhe interno. */
  conflictMessage?: string | null;
  /** Dados recentes crus exibidos na execução, sem comandar nada. */
  recentDataLabel?: string | null;
  /** Estado de conexão cru exibido na execução. */
  connectionLabel?: string | null;
  /** Quando falso, omite o selo de amostra (dados reais do backend). */
  isSampleData?: boolean;
};

/** Estado visual da ação; só representa o retorno do backend. */
export type TestActionState = 'idle' | 'conflict' | 'unavailable';

/** Ação aguardando confirmação local; nunca presume transição. */
type PendingAction = 'start' | 'finish' | 'cancel' | null;

/** Filtro visual da lista; só representa o filtro do contrato. */
export type TestFilter = {
  statusFilter: TestListStatus | 'ALL';
  installationFilter: string | null;
};

/** Opções visuais de filtro de estado, com o rótulo exibido. */
const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: TestListStatus | 'ALL'; label: string }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Planejado', value: 'PLANNED' },
  { label: 'Em execução', value: 'RUNNING' },
  { label: 'Concluído', value: 'COMPLETED' },
  { label: 'Falhou', value: 'FAILED' },
  { label: 'Cancelado', value: 'CANCELLED' },
];

/** Estado público do teste, como no contrato (F05 futuro). */
export type TestListStatus = 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/** Linha da lista de testes; vem pronta do contrato. */
export type TestListItem = {
  /** Identificador estável do teste. */
  id: string;
  /** Nome do teste como veio do contrato. */
  name: string;
  /** Estado público; exibe o rótulo traduzido. */
  status: TestListStatus;
  /** Período cru como veio do contrato; sem formatação local. */
  periodLabel?: string | null;
};

/** Rótulos públicos de estado; o código cru nunca é exibido. */
const TEST_STATUS_LABELS: Record<TestListStatus, string> = {
  PLANNED: 'Planejado',
  RUNNING: 'Em execução',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

/** Terreno do teste, como no contrato (F05 futuro). */
export type TestTerrain = 'HIGHWAY' | 'CITY' | 'OFFROAD' | 'MIXED' | 'OTHER';

/** Resultado do teste, como no contrato (F05 futuro). */
export type TestOutcome = 'SATISFACTORY' | 'UNSATISFACTORY' | 'INCONCLUSIVE';

/** Retrato da montagem no teste; vem pronto do contrato. */
export type TestSnapshot = {
  /** Modelo do veículo no teste; `null` omite a linha. */
  vehicleModel?: string | null;
  /** Local informado; `null` omite a linha. */
  testLocation?: string | null;
  /** Piezos no teste; `null` omite a linha. */
  activePiezoCount?: number | null;
  /** Versão da configuração; `null` omite a linha. */
  configurationVersion?: number | null;
};

/** Detalhe do teste selecionado; vem pronto do contrato. */
export type TestDetail = {
  /** Nome do teste. */
  name: string;
  /** Estado público. */
  status: TestListStatus;
  /** Terreno; `null` omite a linha. */
  terrain?: TestTerrain | null;
  /** Local informado; `null` omite a linha. */
  testLocation?: string | null;
  /** Retrato da montagem; `null` omite o bloco. */
  snapshot?: TestSnapshot | null;
  /** Início em UTC cru; `null` omite a linha. */
  startedAt?: string | null;
  /** Fim em UTC cru; `null` omite a linha. */
  endedAt?: string | null;
  /** Resultado; `null` omite a linha. */
  outcome?: TestOutcome | null;
  /** Observações; `null` omite a linha. */
  notes?: string | null;
};

/** Rótulos públicos de terreno; o código cru nunca é exibido. */
const TERRAIN_LABELS: Record<TestTerrain, string> = {
  HIGHWAY: 'Rodovia',
  CITY: 'Cidade',
  OFFROAD: 'Fora de estrada',
  MIXED: 'Misto',
  OTHER: 'Outro',
};

/** Rótulos públicos de resultado; o código cru nunca é exibido. */
const OUTCOME_LABELS: Record<TestOutcome, string> = {
  SATISFACTORY: 'Satisfatório',
  UNSATISFACTORY: 'Insatisfatório',
  INCONCLUSIVE: 'Inconclusivo',
};

/** Rascunho visual do planejamento; só repasse, sem validação de domínio. */
export type TestPlanDraft = {
  name: string;
  terrain: TestTerrain | null;
  testLocation: string;
  vehicleWeightKg: string;
  notes: string;
};

/** Rascunho vazio exibido sem prop. */
const EMPTY_PLAN: TestPlanDraft = {
  name: '',
  notes: '',
  terrain: null,
  testLocation: '',
  vehicleWeightKg: '',
};

/** Opções visuais de terreno, com o rótulo exibido. */
const TERRAIN_OPTIONS: ReadonlyArray<{ value: TestTerrain; label: string }> = [
  { label: 'Rodovia', value: 'HIGHWAY' },
  { label: 'Cidade', value: 'CITY' },
  { label: 'Fora de estrada', value: 'OFFROAD' },
  { label: 'Misto', value: 'MIXED' },
  { label: 'Outro', value: 'OTHER' },
];

/**
 * Apresenta cabeçalho, filtros visuais, listagem paginada, detalhes,
 * planejamento e confirmações dos testes, delegando voltar, filtro, seleção,
 * paginação, edição, envio, ações e troca de aba por callbacks.
 */
export function TestsScreen({ onTabPress, onBack, activeTab = 'battery', items = [], page = 1, pageSize = 20, totalItems, onPageChange, onSelectTest, statusFilter = null, installationFilter = null, onFilterChange, selectedTest = null, planDraft = null, onPlanChange, onSubmitPlan, onStart, onFinish, onCancel, actionState = 'idle', conflictMessage = null, recentDataLabel = null, connectionLabel = null, isSampleData = true }: TestsScreenProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [internalDraft, setInternalDraft] = useState<TestPlanDraft>(EMPTY_PLAN);
  const [internalStatus, setInternalStatus] = useState<TestListStatus | 'ALL'>('ALL');
  const [internalCreated, setInternalCreated] = useState<TestListItem[]>([]);
  const visibleItems = [...internalCreated, ...items];
  const total = totalItems ?? visibleItems.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentStatus: TestListStatus | 'ALL' = statusFilter ?? internalStatus;
  const currentFilter: TestFilter = { installationFilter: installationFilter ?? null, statusFilter: currentStatus };
  const actionsDisabled = actionState === 'unavailable';

  /** Vai à página vizinha dentro dos limites e notifica o chamador. */
  function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) {
      return;
    }

    onPageChange?.(next);
  }

  /** Notifica a troca de filtro sem aplicar regra local. */
  function changeStatusFilter(next: TestListStatus | 'ALL') {
    if (statusFilter == null) {
      setInternalStatus(next);
    }

    onFilterChange?.({ ...currentFilter, statusFilter: next });
  }

  /** Abre a confirmação local sem solicitar nada ao backend ainda. */
  function requestAction(next: Exclude<PendingAction, null>) {
    setPendingAction(next);
  }

  /** Confirma a ação pendente e notifica o chamador uma única vez. */
  function confirmPendingAction() {
    if (pendingAction === 'start') {
      onStart?.();
    } else if (pendingAction === 'finish') {
      onFinish?.();
    } else if (pendingAction === 'cancel') {
      onCancel?.();
    }

    setPendingAction(null);
  }

  const draft: TestPlanDraft = planDraft != null ? { ...EMPTY_PLAN, ...planDraft } : internalDraft;

  /** Repassa a edição do campo sem validar domínio. */
  function changePlanField(field: keyof TestPlanDraft, value: string | TestTerrain | null) {
    const next = { ...draft, [field]: value };

    if (planDraft == null) {
      setInternalDraft(next);
    }

    onPlanChange?.(next);
  }

  /** Envia o planejamento; sem callback, guarda na lista visual local. */
  function submitPlan() {
    if (planDraft == null) {
      const created: TestListItem = {
        id: `local-${Date.now()}`,
        name: draft.name.trim() || 'Teste sem nome',
        periodLabel: draft.testLocation || null,
        status: 'PLANNED',
      };

      setInternalCreated((previous) => [created, ...previous]);
      setInternalDraft(EMPTY_PLAN);
    }

    onSubmitPlan?.(draft);
  }

  return (
    <ScreenShell
      contentContainerStyle={styles.scrollContent}
      footer={<BottomNavigation activeTab={activeTab} onTabPress={onTabPress} />}
      testID="tests-screen"
    >
      <AppHeader
        onBack={onBack}
        subtitle="Criação, acompanhamento e consulta"
        testID="tests-header"
        title="Testes"
      />

      {isSampleData && (
        <Text style={styles.sampleSeal} testID="tests-sample-seal">
          DADOS DE AMOSTRA
        </Text>
      )}

      <View style={styles.emptyBlock}>
        <View style={styles.filterCard} testID="tests-filters">
          <Text style={styles.filterLabel}>
            {`Filtro: ${currentStatus === 'ALL' ? 'Todos' : TEST_STATUS_LABELS[currentStatus]}`}
          </Text>
          {currentFilter.installationFilter ? (
            <Text style={styles.filterLabel}>{currentFilter.installationFilter}</Text>
          ) : null}
          <View style={styles.filterRow}>
            {STATUS_FILTER_OPTIONS.map((option) => {
              const isSelected = currentStatus === option.value;

              return (
                <Pressable
                  accessibilityLabel={`Filtrar: ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  hitSlop={8}
                  key={option.value}
                  onPress={() => changeStatusFilter(option.value)}
                  style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {visibleItems.length > 0 ? (
          <View style={styles.listCard} testID="tests-list">
            {visibleItems.map((item) => (
              <Pressable
                accessibilityLabel={item.name}
                accessibilityRole="button"
                key={item.id}
                onPress={() => onSelectTest?.(item.id)}
                style={styles.listRow}
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowStatus}>{TEST_STATUS_LABELS[item.status]}</Text>
                {item.periodLabel ? (
                  <Text style={styles.rowPeriod}>{item.periodLabel}</Text>
                ) : null}
              </Pressable>
            ))}
            <View style={styles.pagerRow}>
              <Pressable
                accessibilityLabel="Página anterior"
                accessibilityRole="button"
                accessibilityState={{ disabled: page <= 1 }}
                disabled={page <= 1}
                hitSlop={8}
                onPress={() => goToPage(page - 1)}
              >
                <Ionicons color={theme.colors.primary} name="chevron-back" size={20} />
              </Pressable>
              <Text style={styles.pagerLabel}>
                {`Página ${page} de ${totalPages}`}
              </Text>
              <Pressable
                accessibilityLabel="Próxima página"
                accessibilityRole="button"
                accessibilityState={{ disabled: page >= totalPages }}
                disabled={page >= totalPages}
                hitSlop={8}
                onPress={() => goToPage(page + 1)}
              >
                <Ionicons color={theme.colors.primary} name="chevron-forward" size={20} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Text
            accessibilityLabel="Nenhum teste disponível."
            accessibilityRole="alert"
            style={styles.emptyText}
            testID="tests-empty"
          >
            Nenhum teste disponível.
          </Text>
        )}

        {selectedTest ? (
          <View style={styles.listCard} testID="tests-detail">
            <Text style={styles.rowName}>{selectedTest.name}</Text>
            <Text style={styles.rowStatus}>{TEST_STATUS_LABELS[selectedTest.status]}</Text>
            {selectedTest.terrain ? (
              <Text style={styles.rowPeriod}>{TERRAIN_LABELS[selectedTest.terrain]}</Text>
            ) : null}
            {selectedTest.testLocation ? (
              <Text style={styles.rowPeriod}>{selectedTest.testLocation}</Text>
            ) : null}
            {selectedTest.snapshot?.vehicleModel ? (
              <Text style={styles.rowPeriod}>{selectedTest.snapshot.vehicleModel}</Text>
            ) : null}
            {selectedTest.snapshot?.activePiezoCount != null ? (
              <Text style={styles.rowPeriod}>{`${selectedTest.snapshot.activePiezoCount} piezos`}</Text>
            ) : null}
            {selectedTest.snapshot?.configurationVersion != null ? (
              <Text style={styles.rowPeriod}>{`v${selectedTest.snapshot.configurationVersion}`}</Text>
            ) : null}
            {selectedTest.startedAt ? (
              <Text style={styles.rowPeriod}>{selectedTest.startedAt}</Text>
            ) : null}
            {selectedTest.endedAt ? (
              <Text style={styles.rowPeriod}>{selectedTest.endedAt}</Text>
            ) : null}
            {selectedTest.outcome ? (
              <Text style={styles.rowPeriod}>{OUTCOME_LABELS[selectedTest.outcome]}</Text>
            ) : null}
            {selectedTest.notes ? (
              <Text style={styles.rowPeriod}>{selectedTest.notes}</Text>
            ) : null}
          </View>
        ) : null}

        {selectedTest && actionState !== 'conflict' ? (
          <View style={styles.listCard} testID="tests-actions">
            {selectedTest.status === 'PLANNED' && onStart ? (
              <View style={styles.actionButton}>
                <PrimaryButton
                  accessibilityLabel="Iniciar teste"
                  disabled={actionsDisabled}
                  label="INICIAR TESTE"
                  onPress={() => requestAction('start')}
                />
              </View>
            ) : null}
            {selectedTest.status === 'RUNNING' ? (
              <>
                {recentDataLabel ? (
                  <Text style={styles.rowPeriod}>{recentDataLabel}</Text>
                ) : null}
                {connectionLabel ? (
                  <Text style={styles.rowPeriod}>{connectionLabel}</Text>
                ) : null}
                {onFinish ? (
                  <View style={styles.actionButton}>
                    <PrimaryButton
                      accessibilityLabel="Finalizar teste"
                      disabled={actionsDisabled}
                      label="FINALIZAR TESTE"
                      onPress={() => requestAction('finish')}
                    />
                  </View>
                ) : null}
                {onCancel ? (
                  <View style={styles.actionButton}>
                    <PrimaryButton
                      accessibilityLabel="Cancelar teste"
                      disabled={actionsDisabled}
                      label="CANCELAR TESTE"
                      onPress={() => requestAction('cancel')}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
            {selectedTest.status !== 'PLANNED' && selectedTest.status !== 'RUNNING' && onCancel ? (
              <View style={styles.actionButton}>
                <PrimaryButton
                  accessibilityLabel="Cancelar teste"
                  disabled={actionsDisabled}
                  label="CANCELAR TESTE"
                  onPress={() => requestAction('cancel')}
                />
              </View>
            ) : null}
            {pendingAction ? (
              <View style={styles.confirmBlock} testID="tests-confirm">
                <Text style={styles.rowPeriod}>
                  {pendingAction === 'start' && 'Confirmar o início do teste?'}
                  {pendingAction === 'finish' && 'Confirmar a finalização do teste?'}
                  {pendingAction === 'cancel' && 'Confirmar o cancelamento do teste?'}
                </Text>
                <View style={styles.actionButton}>
                  <PrimaryButton
                    accessibilityLabel={
                      pendingAction === 'start'
                        ? 'Confirmar início'
                        : pendingAction === 'finish'
                          ? 'Confirmar finalização'
                          : 'Confirmar cancelamento'
                    }
                    label="CONFIRMAR"
                    onPress={confirmPendingAction}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {actionState === 'conflict' ? (
          <View style={styles.listCard} testID="tests-conflict">
            <Text
              accessibilityRole="alert"
              style={styles.rowStatus}
            >
              {conflictMessage ?? 'O teste mudou. Consulte o estado atual.'}
            </Text>
          </View>
        ) : null}

        <View style={styles.listCard} testID="tests-plan-form">
          <AuthTextField
            label="Nome:"
            onChangeText={(value) => changePlanField('name', value)}
            placeholder="Nome do teste"
            value={draft.name}
          />
          <View style={styles.fieldGap}>
            <Text style={styles.filterLabel}>Terreno</Text>
            <View style={styles.filterRow}>
              {TERRAIN_OPTIONS.map((option) => {
                const isTerrainSelected = draft.terrain === option.value;

                return (
                  <Pressable
                    accessibilityLabel={`Terreno: ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isTerrainSelected }}
                    hitSlop={8}
                    key={option.value}
                    onPress={() => changePlanField('terrain', option.value)}
                    style={[styles.filterChip, isTerrainSelected && styles.filterChipSelected]}
                  >
                    <Text style={[styles.filterChipText, isTerrainSelected && styles.filterChipTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <AuthTextField
            label="Local do teste:"
            onChangeText={(value) => changePlanField('testLocation', value)}
            placeholder="Local informado"
            value={draft.testLocation}
          />
          <AuthTextField
            label="Peso do veículo (kg):"
            keyboardType="numeric"
            onChangeText={(value) => changePlanField('vehicleWeightKg', value)}
            placeholder="Ex. 1200"
            value={draft.vehicleWeightKg}
          />
          <AuthTextField
            label="Observações:"
            onChangeText={(value) => changePlanField('notes', value)}
            placeholder="Notas opcionais"
            value={draft.notes}
          />
          {onSubmitPlan || planDraft == null ? (
            <View style={styles.actionButton}>
              <PrimaryButton
                accessibilityLabel="Planejar teste"
                label="PLANEJAR TESTE"
                onPress={submitPlan}
              />
            </View>
          ) : null}
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
  filterCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    width: '100%',
  },
  filterLabel: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  filterChip: {
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.tabActive,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.primary,
    fontSize: 11,
  },
  filterChipTextSelected: {
    color: theme.colors.white,
    fontWeight: '700',
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
  rowName: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  rowStatus: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  rowPeriod: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: 2,
  },
  pagerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  pagerLabel: {
    color: theme.colors.gray,
    fontSize: 12,
  },
  fieldGap: {
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  confirmBlock: {
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  actionButton: {
    marginTop: 12,
    maxWidth: 350,
    width: '100%',
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
