/**
 * Testes unitários da tela de veículos (Task 10, lote 10a).
 *
 * Existe para travar o scaffold visual e a rota interna: título, lista
 * vazia inicial e voltar por callback, sem rede, cálculo ou persistência.
 * Os dados virão por props (fixtures até F01/F05); unicidade da placa,
 * vínculo e remoção atômica pertencem ao backend.
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
