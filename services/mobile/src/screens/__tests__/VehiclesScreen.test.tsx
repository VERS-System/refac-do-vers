/**
 * Testes unitários da tela de veículos (Task 10, lotes 10a–10b).
 *
 * Existe para travar o scaffold visual, a rota interna e a listagem:
 * título, vazio inicial, linhas com placa, modelo e selo do principal e
 * atalho de cadastro, sem rede, cálculo ou persistência. Os dados chegam por
 * props (fixtures até F01/F05); vínculo, unicidade e remoção pertencem ao
 * backend. Sem CPF, CRLV, RENAVAM ou documentos no MVP.
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
