/**
 * Testes unitários da tela de Suporte (Task 12, lote 12a).
 *
 * Existe para travar o scaffold visual e a rota interna dupla: título,
 * lista vazia inicial e voltar por callback, sem rede, cálculo ou regra
 * de domínio. A lista, os detalhes e o formulário chegam por props nos
 * próximos lotes (fixtures até F01/F05); nada é buscado, persistido ou
 * decidido aqui.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { SupportScreen } from '../SupportScreen';

describe('SupportScreen (12a)', () => {
  /** Apresenta título e lista vazia inicial. */
  it('apresenta título e lista vazia inicial', () => {
    const { getByTestId, getByText } = render(<SupportScreen />);

    expect(getByTestId('support-screen')).toBeTruthy();
    expect(getByText('Suporte')).toBeTruthy();
    expect(getByTestId('support-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<SupportScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('SupportScreen listagem (12b)', () => {
  const ITEMS = [
    { id: 'r1', status: 'OPEN' as const, createdAt: '2026-10-01T10:00:00.000Z' },
    { id: 'r2', status: 'RESOLVED' as const, createdAt: '2026-10-02T10:00:00.000Z' },
  ];

  /** Exibe as linhas com o selo textual de status, sem o vazio. */
  it('exibe a lista com selo de status quando informada', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <SupportScreen items={ITEMS} />,
    );

    expect(getByTestId('support-list')).toBeTruthy();
    expect(getByText('Aberta')).toBeTruthy();
    expect(getByText('Resolvida')).toBeTruthy();
    expect(queryByTestId('support-empty')).toBeNull();
  });

  /** Repassa a seleção sem decidir nada no cliente. */
  it('seleciona a solicitação ao tocar na linha', () => {
    const onSelectRequest = jest.fn();
    const { getByLabelText } = render(
      <SupportScreen items={ITEMS} onSelectRequest={onSelectRequest} />,
    );

    fireEvent.press(getByLabelText('Aberta 2026-10-01T10:00:00.000Z'));

    expect(onSelectRequest).toHaveBeenCalledTimes(1);
    expect(onSelectRequest).toHaveBeenCalledWith('r1');
  });

  /** Mantém só o vazio quando nenhum item é informado. */
  it('mantém o vazio sem itens', () => {
    const { getByTestId, queryByTestId } = render(<SupportScreen items={[]} />);

    expect(getByTestId('support-empty')).toBeTruthy();
    expect(queryByTestId('support-list')).toBeNull();
  });

  /** Abre o formulário pelo CTA, sem validar nada no cliente. */
  it('abre o formulário ao acionar nova solicitação', () => {
    const onOpenCreate = jest.fn();
    const { getByRole } = render(<SupportScreen onOpenCreate={onOpenCreate} />);

    fireEvent.press(getByRole('button', { name: 'Nova solicitação' }));

    expect(onOpenCreate).toHaveBeenCalledTimes(1);
  });
});

describe('SupportScreen detalhes (12c)', () => {
  const DETAIL = {
    id: 'r1',
    vehicleId: 'v1',
    installationId: 'i1',
    reason: 'Barulho estranho no suporte do piezo.',
    status: 'IN_REVIEW' as const,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
  };

  /** Exibe todos os campos crus do detalhe selecionado. */
  it('exibe os detalhes quando selecionada', () => {
    const { getByTestId, getByText } = render(
      <SupportScreen items={[{ id: 'r1', status: 'IN_REVIEW', createdAt: '2026-10-01T10:00:00.000Z' }]} selectedRequest={DETAIL} />,
    );

    expect(getByTestId('support-detail')).toBeTruthy();
    expect(getByText('Em revisão')).toBeTruthy();
    expect(getByText('Barulho estranho no suporte do piezo.')).toBeTruthy();
    expect(getByText('v1')).toBeTruthy();
    expect(getByText('i1')).toBeTruthy();
  });

  /** Representa referências nulas como histórico, sem identificadores. */
  it('representa nulos como histórico sem identificadores', () => {
    const { getByTestId, getAllByText, queryByText } = render(
      <SupportScreen selectedRequest={{ ...DETAIL, vehicleId: null, installationId: null }} />,
    );

    expect(getByTestId('support-detail')).toBeTruthy();
    expect(getAllByText('Não disponível').length).toBe(2);
    expect(queryByText('v1')).toBeNull();
    expect(queryByText('i1')).toBeNull();
  });

  /** Mantém só a lista quando nada está selecionado. */
  it('mantém só a lista sem seleção', () => {
    const { getByTestId, queryByTestId } = render(
      <SupportScreen items={[{ id: 'r1', status: 'OPEN', createdAt: '2026-10-01T10:00:00.000Z' }]} selectedRequest={null} />,
    );

    expect(getByTestId('support-list')).toBeTruthy();
    expect(queryByTestId('support-detail')).toBeNull();
  });

  /** Volta à lista por callback puro, sem regra de navegação interna. */
  it('volta à lista ao acionar o botão voltar da lista', () => {
    const onBackToList = jest.fn();
    const { getByRole } = render(
      <SupportScreen onBackToList={onBackToList} selectedRequest={DETAIL} />,
    );

    fireEvent.press(getByRole('button', { name: 'Voltar para a lista' }));

    expect(onBackToList).toHaveBeenCalledTimes(1);
  });
});

describe('SupportScreen formulário (12d)', () => {
  const VEHICLES = [
    { id: 'v1', label: 'ABC1D23' },
    { id: 'v2', label: 'XYZ9K99' },
  ];
  const INSTALLATIONS = [{ id: 'i1', label: 'VERS Modelo A' }];

  /** Exibe campos, aviso sem documentos e envio no modo criação. */
  it('exibe o formulário no modo criação', () => {
    const { getByLabelText, getByTestId, getByText } = render(
      <SupportScreen installations={INSTALLATIONS} isCreating vehicles={VEHICLES} />,
    );

    expect(getByTestId('support-form')).toBeTruthy();
    expect(getByLabelText('Motivo')).toBeTruthy();
    expect(getByText('Documentos e anexos não fazem parte desta solicitação.')).toBeTruthy();
  });

  /** Preenche seleção e motivo e envia só os campos do contrato. */
  it('preenche e envia só os campos do contrato', () => {
    const onSubmitCreate = jest.fn();
    const { getByLabelText, getByRole } = render(
      <SupportScreen
        installations={INSTALLATIONS}
        isCreating
        onSubmitCreate={onSubmitCreate}
        vehicles={VEHICLES}
      />,
    );

    fireEvent.press(getByLabelText('Veículo: ABC1D23'));
    fireEvent.press(getByLabelText('Instalação: VERS Modelo A'));
    fireEvent.changeText(getByLabelText('Motivo'), 'Barulho estranho no suporte.');
    fireEvent.press(getByRole('button', { name: 'Enviar solicitação' }));

    expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    expect(onSubmitCreate).toHaveBeenCalledWith({
      vehicleId: 'v1',
      installationId: 'i1',
      reason: 'Barulho estranho no suporte.',
    });
  });

  /** Repassa a edição no modo controlado, sem estado interno. */
  it('repassa a edição no modo controlado', () => {
    const onSupportChange = jest.fn();
    const { getByLabelText } = render(
      <SupportScreen
        isCreating
        onSupportChange={onSupportChange}
        supportDraft={{ vehicleId: '', installationId: '', reason: '' }}
        vehicles={VEHICLES}
      />,
    );

    fireEvent.press(getByLabelText('Veículo: ABC1D23'));

    expect(onSupportChange).toHaveBeenCalledTimes(1);
    expect(onSupportChange).toHaveBeenCalledWith({
      vehicleId: 'v1',
      installationId: '',
      reason: '',
    });
  });

  /** Omite o formulário fora do modo criação. */
  it('omite o formulário fora do modo criação', () => {
    const { queryByTestId } = render(<SupportScreen />);

    expect(queryByTestId('support-form')).toBeNull();
  });
});
