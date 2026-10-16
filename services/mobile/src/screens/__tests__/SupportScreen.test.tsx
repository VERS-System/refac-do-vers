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

  /** Preenche seleção e motivo e abre a confirmação antes de enviar (12e). */
  it('preenche e abre a confirmação antes de enviar', () => {
    const onSubmitCreate = jest.fn();
    const { getByLabelText, getByRole, getByTestId, queryByTestId } = render(
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

    expect(getByTestId('support-create-confirm')).toBeTruthy();
    expect(onSubmitCreate).not.toHaveBeenCalled();
    expect(queryByTestId('support-create-success')).toBeNull();
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

describe('SupportScreen confirmação e envio (12e)', () => {
  const VEHICLES = [{ id: 'v1', label: 'ABC1D23' }];
  const INSTALLATIONS = [{ id: 'i1', label: 'VERS Modelo A' }];

  /** Abre a confirmação inline ao enviar, sem submeter direto. */
  it('abre a confirmação ao enviar', () => {
    const onSubmitCreate = jest.fn();
    const { getByRole, getByTestId } = render(
      <SupportScreen
        installations={INSTALLATIONS}
        isCreating
        onSubmitCreate={onSubmitCreate}
        vehicles={VEHICLES}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Enviar solicitação' }));

    expect(getByTestId('support-create-confirm')).toBeTruthy();
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  /** Confirma e envia só os campos do contrato, com envio concluído. */
  it('confirma e envia com o rascunho', () => {
    const onSubmitCreate = jest.fn();
    const { getByLabelText, getByRole, getByTestId, queryByTestId } = render(
      <SupportScreen
        installations={INSTALLATIONS}
        isCreating
        onSubmitCreate={onSubmitCreate}
        vehicles={VEHICLES}
      />,
    );

    fireEvent.press(getByLabelText('Veículo: ABC1D23'));
    fireEvent.changeText(getByLabelText('Motivo'), 'Barulho estranho no suporte.');
    fireEvent.press(getByRole('button', { name: 'Enviar solicitação' }));
    fireEvent.press(getByRole('button', { name: 'Confirmar envio' }));

    expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    expect(onSubmitCreate).toHaveBeenCalledWith({
      vehicleId: 'v1',
      installationId: '',
      reason: 'Barulho estranho no suporte.',
    });
    expect(getByTestId('support-create-success')).toBeTruthy();
    expect(queryByTestId('support-create-confirm')).toBeNull();
  });

  /** Cancela a confirmação sem apagar o digitado e sem enviar. */
  it('cancela a confirmação sem apagar o digitado', () => {
    const onSubmitCreate = jest.fn();
    const { getByDisplayValue, getByLabelText, getByRole, queryByTestId } = render(
      <SupportScreen isCreating onSubmitCreate={onSubmitCreate} vehicles={VEHICLES} />,
    );

    fireEvent.changeText(getByLabelText('Motivo'), 'Barulho estranho no suporte.');
    fireEvent.press(getByRole('button', { name: 'Enviar solicitação' }));
    fireEvent.press(getByRole('button', { name: 'Cancelar confirmação' }));

    expect(queryByTestId('support-create-confirm')).toBeNull();
    expect(getByDisplayValue('Barulho estranho no suporte.')).toBeTruthy();
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });
});

describe('SupportScreen estados e erros (12f)', () => {
  const ITEMS = [{ id: 'r1', status: 'OPEN' as const, createdAt: '2026-10-01T10:00:00.000Z' }];

  /** Exibe skeleton no carregamento, sem lista nem formulário. */
  it('exibe carregamento com skeleton', () => {
    const { getByTestId, queryByTestId } = render(
      <SupportScreen items={ITEMS} status="loading" />,
    );

    expect(getByTestId('support-loading')).toBeTruthy();
    expect(queryByTestId('support-list')).toBeNull();
    expect(queryByTestId('support-form')).toBeNull();
  });

  /** Exibe erro genérico com repetição, sem expor conteúdo. */
  it('exibe erro com repetição', () => {
    const onRetry = jest.fn();
    const { getByRole, getByTestId, getByText, queryByTestId } = render(
      <SupportScreen items={ITEMS} onRetry={onRetry} status="error" />,
    );

    expect(getByTestId('support-error')).toBeTruthy();
    expect(getByText('Não foi possível carregar as solicitações.')).toBeTruthy();
    expect(queryByTestId('support-list')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /** Sinaliza o envio em andamento sem apagar o rascunho. */
  it('sinaliza envio sem apagar o rascunho', () => {
    const { getByDisplayValue, getByTestId } = render(
      <SupportScreen
        isCreating
        status="sending"
        supportDraft={{ vehicleId: 'v1', installationId: '', reason: 'Barulho estranho.' }}
      />,
    );

    expect(getByTestId('support-sending')).toBeTruthy();
    expect(getByDisplayValue('Barulho estranho.')).toBeTruthy();
  });

  /** Mantém o conteúdo no sucesso. */
  it('mantém o conteúdo no sucesso', () => {
    const { getByTestId } = render(<SupportScreen items={ITEMS} status="success" />);

    expect(getByTestId('support-list')).toBeTruthy();
  });
});

describe('SupportScreen acessibilidade e layout (12g)', () => {
  /** Nome e papel em todos os botões do formulário. */
  it('expõe nome e papel nos botões', () => {
    const { getAllByRole } = render(
      <SupportScreen
        installations={[{ id: 'i1', label: 'VERS Modelo A' }]}
        isCreating
        onOpenCreate={jest.fn()}
        vehicles={[{ id: 'v1', label: 'ABC1D23' }]}
      />,
    );

    const buttons = getAllByRole('button');

    expect(buttons.length).toBeGreaterThan(0);

    for (const button of buttons) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  /** Marca o chip escolhido como selecionado. */
  it('marca o chip escolhido como selecionado', () => {
    const { getByLabelText } = render(
      <SupportScreen
        isCreating
        supportDraft={{ vehicleId: 'v1', installationId: '', reason: '' }}
        vehicles={[{ id: 'v1', label: 'ABC1D23' }]}
      />,
    );

    expect(getByLabelText('Veículo: ABC1D23').props.accessibilityState.selected).toBe(true);
  });

  /** Garante alvo de toque nas linhas e nas opções. */
  it('garante alvo de toque nas linhas e opções', () => {
    const list = render(
      <SupportScreen
        items={[{ id: 'r1', status: 'OPEN', createdAt: '2026-10-01T10:00:00.000Z' }]}
      />,
    );
    const form = render(
      <SupportScreen isCreating vehicles={[{ id: 'v1', label: 'ABC1D23' }]} />,
    );

    expect(
      list.getByLabelText('Aberta 2026-10-01T10:00:00.000Z').props.hitSlop,
    ).toBeTruthy();
    expect(
      form.getByLabelText('Veículo: ABC1D23').props.hitSlop,
    ).toBeTruthy();
  });

  /** Mantém motivo longo com link como texto permitido. */
  it('mantém motivo longo com link como texto', () => {
    const longReason = `Veja em https://vers.com/suporte ${'x'.repeat(500)}`;
    const { getByText } = render(
      <SupportScreen
        selectedRequest={{
          id: 'r1',
          vehicleId: null,
          installationId: null,
          reason: longReason,
          status: 'OPEN',
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-02T10:00:00.000Z',
        }}
      />,
    );

    expect(getByText(longReason)).toBeTruthy();
  });
});

describe('SupportScreen indisponibilidade (13a)', () => {
  const ITEMS = [{ id: 'r1', status: 'OPEN' as const, createdAt: '2026-10-01T10:00:00.000Z' }];

  /** Exibe aviso neutro no lugar da lista quando indisponível. */
  it('exibe aviso neutro quando indisponível', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <SupportScreen items={ITEMS} status="unavailable" />,
    );

    expect(getByTestId('support-unavailable')).toBeTruthy();
    expect(getByText('Solicitações indisponíveis no momento.')).toBeTruthy();
    expect(queryByTestId('support-list')).toBeNull();
  });

  /** Mantém o formulário no modo criação quando indisponível. */
  it('mantém o formulário quando indisponível', () => {
    const { getByTestId, queryByTestId } = render(
      <SupportScreen isCreating status="unavailable" />,
    );

    expect(getByTestId('support-form')).toBeTruthy();
    expect(queryByTestId('support-unavailable')).toBeNull();
  });
});

describe('SupportScreen sessão expirada (13b)', () => {
  const ITEMS = [{ id: 'r1', status: 'OPEN' as const, createdAt: '2026-10-01T10:00:00.000Z' }];

  /** Exibe expirada com volta ao login, sem conteúdo. */
  it('exibe expirada com volta ao login', () => {
    const onOpenLogin = jest.fn();
    const { getByRole, getByTestId, getByText, queryByTestId } = render(
      <SupportScreen items={ITEMS} onOpenLogin={onOpenLogin} status="sessionExpired" />,
    );

    expect(getByTestId('support-session-expired')).toBeTruthy();
    expect(getByText('Sessão expirada. Entre novamente para continuar.')).toBeTruthy();
    expect(queryByTestId('support-list')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Ir para o Login' }));

    expect(onOpenLogin).toHaveBeenCalledTimes(1);
  });
});
