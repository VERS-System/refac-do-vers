/**
 * Testes unitários da tela de veículos (Task 10, lotes 10a–10c).
 *
 * Existe para travar o scaffold visual, a rota interna, a listagem e os
 * detalhes: título, vazio, linhas com selo do principal e card com dados
 * crus e ações, sem rede, cálculo ou persistência. Os dados chegam por props
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
