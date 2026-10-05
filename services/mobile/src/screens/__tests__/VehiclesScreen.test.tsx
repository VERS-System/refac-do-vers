/**
 * Testes unitários da tela de veículos (Task 10, lotes 10a–10f).
 *
 * Existe para travar o scaffold visual, a rota interna, a listagem, os
 * detalhes, o cadastro, a edição e a remoção: título, vazio, linhas com
 * selo, card com dados, form do contrato, placa travada e confirmação com
 * substituto, sem rede, cálculo ou persistência. Os dados chegam por props
 * (fixtures até F01/F05); vínculo, unicidade e remoção pertencem ao backend.
 * Sem CPF, CRLV, RENAVAM ou documentos no MVP.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { VehiclesScreen } from '../VehiclesScreen';

describe('VehiclesScreen (10a)', () => {
  /** Apresenta título e lista vazia inicial. */
  it('apresenta título e lista vazia inicial', () => {
    const { getByTestId, getByText } = render(<VehiclesScreen />);

    expect(getByTestId('vehicles-screen')).toBeTruthy();
    expect(getByText('Veículos')).toBeTruthy();
    expect(getByTestId('vehicles-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<VehiclesScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('VehiclesScreen listagem (10b)', () => {
  const ITEMS = [
    { brand: 'Marca A', id: 'v1', isPrimary: true, licensePlate: 'ABC1D23', model: 'Modelo X' },
    { brand: 'Marca B', id: 'v2', isPrimary: false, licensePlate: 'XYZ9K88', model: 'Modelo Y' },
  ];

  /** Exibe linhas com placa, modelo e selo do principal, sem vazio. */
  it('exibe a listagem quando informada', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <VehiclesScreen items={ITEMS} />,
    );

    expect(getByTestId('vehicles-list')).toBeTruthy();
    expect(getByText('ABC1D23')).toBeTruthy();
    expect(getByText('Modelo Y')).toBeTruthy();
    expect(getByText('Principal')).toBeTruthy();
    expect(queryByTestId('vehicles-empty')).toBeNull();
  });

  /** Seleciona o veículo por callback puro, sem regra de navegação interna. */
  it('notifica a seleção do veículo sem buscar dados', () => {
    const onSelectVehicle = jest.fn();
    const { getByText } = render(
      <VehiclesScreen items={ITEMS} onSelectVehicle={onSelectVehicle} />,
    );

    fireEvent.press(getByText('ABC1D23'));

    expect(onSelectVehicle).toHaveBeenCalledWith('v1');
  });

  /** Abre o cadastro por callback puro. */
  it('abre o cadastro ao acionar Cadastrar', () => {
    const onOpenCreate = jest.fn();
    const { getByRole } = render(<VehiclesScreen onOpenCreate={onOpenCreate} />);

    fireEvent.press(getByRole('button', { name: 'Cadastrar veículo' }));

    expect(onOpenCreate).toHaveBeenCalledTimes(1);
  });
});

describe('VehiclesScreen detalhes (10c)', () => {
  const SELECTED = {
    brand: 'Marca A',
    id: 'v1',
    isPrimary: false,
    licensePlate: 'ABC1D23',
    model: 'Modelo X',
    modelYear: 2026,
    relationship: 'OWNER' as const,
  };

  /** Exibe o detalhe com dados crus e ações. */
  it('exibe o detalhe quando informado', () => {
    const { getByTestId, getByText } = render(
      <VehiclesScreen selectedVehicle={SELECTED} />,
    );

    expect(getByTestId('vehicles-detail')).toBeTruthy();
    expect(getByText('ABC1D23')).toBeTruthy();
    expect(getByText('Marca A')).toBeTruthy();
    expect(getByText('2026')).toBeTruthy();
    expect(getByText('Proprietário')).toBeTruthy();
  });

  /** Aciona editar, remover e tornar principal por callbacks puros. */
  it('notifica as ações do detalhe por callbacks', () => {
    const onEditVehicle = jest.fn();
    const onRemoveVehicle = jest.fn();
    const onMakePrimary = jest.fn();
    const { getByRole } = render(
      <VehiclesScreen
        onEditVehicle={onEditVehicle}
        onMakePrimary={onMakePrimary}
        onRemoveVehicle={onRemoveVehicle}
        selectedVehicle={SELECTED}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Editar veículo' }));
    fireEvent.press(getByRole('button', { name: 'Remover veículo' }));
    fireEvent.press(getByRole('button', { name: 'Tornar principal' }));

    expect(onEditVehicle).toHaveBeenCalledWith('v1');
    expect(onRemoveVehicle).toHaveBeenCalledWith('v1');
    expect(onMakePrimary).toHaveBeenCalledWith('v1');
  });

  /** Omite o detalhe sem seleção sem parecer falha. */
  it('omite o detalhe sem seleção', () => {
    const { getByTestId, queryByTestId } = render(
      <VehiclesScreen items={[{ id: 'v1', isPrimary: false, licensePlate: 'ABC1D23' }]} />,
    );

    expect(getByTestId('vehicles-list')).toBeTruthy();
    expect(queryByTestId('vehicles-detail')).toBeNull();
  });
});

describe('VehiclesScreen cadastro (10d)', () => {
  /** Exibe o formulário com o rascunho informado e sem campos de documentos. */
  it('exibe o formulário com o rascunho', () => {
    const { getByDisplayValue, getByTestId, queryByLabelText } = render(
      <VehiclesScreen vehicleDraft={{ brand: 'Marca A', licensePlate: 'ABC1D23' }} />,
    );

    expect(getByTestId('vehicles-form')).toBeTruthy();
    expect(getByDisplayValue('ABC1D23')).toBeTruthy();
    expect(getByDisplayValue('Marca A')).toBeTruthy();
    expect(queryByLabelText('CPF')).toBeNull();
    expect(queryByLabelText('Documento')).toBeNull();
  });

  /** Repassa a edição e o envio só com os campos do contrato. */
  it('repassa a edição e o envio por callbacks', () => {
    const onVehicleChange = jest.fn();
    const onSubmitCreate = jest.fn();
    const { getByLabelText, getByRole } = render(
      <VehiclesScreen
        onSubmitCreate={onSubmitCreate}
        onVehicleChange={onVehicleChange}
        vehicleDraft={{ licensePlate: '' }}
      />,
    );

    fireEvent.changeText(getByLabelText('Placa'), 'ABC1D23');
    expect(onVehicleChange).toHaveBeenCalledWith(expect.objectContaining({ licensePlate: 'ABC1D23' }));

    fireEvent.press(getByRole('button', { name: 'Confirmar cadastro' }));
    expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    expect(onSubmitCreate.mock.calls[0][0]).not.toHaveProperty('cpf');
  });

  /** Mantém o digitado sem callbacks (rota interna sem estado do pai). */
  it('mantém o digitado sem callbacks', () => {
    const { getByDisplayValue, getByLabelText } = render(<VehiclesScreen />);

    fireEvent.changeText(getByLabelText('Placa'), 'ABC1D23');

    expect(getByDisplayValue('ABC1D23')).toBeTruthy();
  });

  /** Cria sem callbacks e exibe na lista com o form limpo. */
  it('cria sem callbacks e exibe na lista', () => {
    const { getByLabelText, getByRole, getByTestId, getByText, queryByTestId } = render(
      <VehiclesScreen />,
    );

    expect(queryByTestId('vehicles-list')).toBeNull();

    fireEvent.changeText(getByLabelText('Placa'), 'ABC1D23');
    fireEvent.changeText(getByLabelText('Modelo'), 'Modelo X');
    fireEvent.press(getByRole('button', { name: 'Confirmar cadastro' }));

    expect(getByTestId('vehicles-list')).toBeTruthy();
    expect(getByText('ABC1D23')).toBeTruthy();
    expect(queryByTestId('vehicles-empty')).toBeNull();
  });
});

describe('VehiclesScreen edição (10e)', () => {
  const EDITING = {
    brand: 'Marca A',
    id: 'v1',
    licensePlate: 'ABC1D23',
    model: 'Modelo X',
    modelYear: 2026,
  };

  /** Exibe a placa travada e os mutáveis editáveis com valores atuais. */
  it('edita com placa travada e mutáveis preenchidos', () => {
    const { getByDisplayValue, getByText, queryByLabelText } = render(
      <VehiclesScreen editingVehicle={EDITING} />,
    );

    expect(getByText('ABC1D23')).toBeTruthy();
    expect(queryByLabelText('Placa')).toBeNull();
    expect(getByDisplayValue('Marca A')).toBeTruthy();
    expect(getByDisplayValue('2026')).toBeTruthy();
  });

  /** Salva repassando só mutáveis, sem placa e sem id. */
  it('salva repassando só mutáveis', () => {
    const onSubmitUpdate = jest.fn();
    const { getByLabelText, getByRole } = render(
      <VehiclesScreen editingVehicle={EDITING} onSubmitUpdate={onSubmitUpdate} />,
    );

    fireEvent.changeText(getByLabelText('Marca'), 'Marca B');
    fireEvent.press(getByRole('button', { name: 'Salvar alterações' }));

    const payload = onSubmitUpdate.mock.calls[0][0];
    expect(payload).toEqual({ brand: 'Marca B', model: 'Modelo X', modelYear: '2026' });
    expect(payload).not.toHaveProperty('licensePlate');
    expect(payload).not.toHaveProperty('id');
  });

  /** Cancela sem salvar e avisa o chamador. */
  it('cancela a edição sem salvar', () => {
    const onCancelEditVehicle = jest.fn();
    const onSubmitUpdate = jest.fn();
    const { getByRole } = render(
      <VehiclesScreen
        editingVehicle={EDITING}
        onCancelEditVehicle={onCancelEditVehicle}
        onSubmitUpdate={onSubmitUpdate}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Cancelar edição' }));

    expect(onCancelEditVehicle).toHaveBeenCalledTimes(1);
    expect(onSubmitUpdate).not.toHaveBeenCalled();
  });
});

describe('VehiclesScreen remoção (10f)', () => {
  const PRIMARY = { id: 'v1', isPrimary: true, licensePlate: 'ABC1D23', model: 'Modelo X' };
  const OTHER = { id: 'v2', isPrimary: false, licensePlate: 'XYZ9K88', model: 'Modelo Y' };

  /** Abre a confirmação inline ao solicitar a remoção. */
  it('abre a confirmação ao solicitar a remoção', () => {
    const onRemoveVehicle = jest.fn();
    const { getByRole, getByTestId, getByText } = render(
      <VehiclesScreen onRemoveVehicle={onRemoveVehicle} selectedVehicle={PRIMARY} />,
    );

    fireEvent.press(getByRole('button', { name: 'Remover veículo' }));

    expect(onRemoveVehicle).toHaveBeenCalledWith('v1');
    expect(getByTestId('vehicles-remove-confirm')).toBeTruthy();
    expect(getByText('Remover este veículo?')).toBeTruthy();
  });

  /** Confirma com o substituto escolhido. */
  it('confirma a remoção com o substituto', () => {
    const onConfirmRemove = jest.fn();
    const { getByRole } = render(
      <VehiclesScreen
        items={[PRIMARY, OTHER]}
        onConfirmRemove={onConfirmRemove}
        onRemoveVehicle={jest.fn()}
        replacementRequired
        selectedVehicle={PRIMARY}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Remover veículo' }));
    fireEvent.press(getByRole('button', { name: 'Substituto: XYZ9K88' }));
    fireEvent.press(getByRole('button', { name: 'Confirmar remoção' }));

    expect(onConfirmRemove).toHaveBeenCalledWith('v1', 'v2');
  });

  /** Cancela sem confirmar a remoção. */
  it('cancela a remoção sem confirmar', () => {
    const onCancelRemove = jest.fn();
    const onConfirmRemove = jest.fn();
    const { getByRole, queryByTestId } = render(
      <VehiclesScreen
        onCancelRemove={onCancelRemove}
        onConfirmRemove={onConfirmRemove}
        onRemoveVehicle={jest.fn()}
        selectedVehicle={PRIMARY}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Remover veículo' }));
    fireEvent.press(getByRole('button', { name: 'Cancelar remoção' }));

    expect(onCancelRemove).toHaveBeenCalledTimes(1);
    expect(onConfirmRemove).not.toHaveBeenCalled();
    expect(queryByTestId('vehicles-remove-confirm')).toBeNull();
  });

  /** Exibe o conflito e desabilita as ações quando indisponível. */
  it('exibe conflito e desabilita ações quando indisponível', () => {
    const { getByRole, getByTestId, getByText } = render(
      <VehiclesScreen
        actionsDisabled
        conflictMessage="Placa já cadastrada."
        selectedVehicle={PRIMARY}
      />,
    );

    expect(getByTestId('vehicles-conflict')).toBeTruthy();
    expect(getByText('Placa já cadastrada.')).toBeTruthy();
    expect(
      getByRole('button', { name: 'Remover veículo' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
  });
});
