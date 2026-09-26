/**
 * Testes unitários da tela inicial do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';

describe('HomeScreen', () => {
  /** Confirma a presença dos indicadores previstos sem o diagnóstico fora de escopo. */
  it('apresenta energia, economia e bateria recuperada sem diagnóstico', () => {
    const { getByText, queryByText } = render(<HomeScreen />);

    expect(getByText('Battery usage')).toBeTruthy();
    expect(getByText('Money economy')).toBeTruthy();
    expect(getByText('Battery Recovered')).toBeTruthy();
    expect(getByText('Battery Used')).toBeTruthy();
    expect(queryByText('Your car Diagnostic')).toBeNull();
  });

  /** Valida o atalho para o Viber sem atalho de diagnóstico do veículo. */
  it('aciona o atalho do Viber', () => {
    const onOpenViber = jest.fn();
    const { getByRole, queryByRole } = render(<HomeScreen onOpenViber={onOpenViber} />);

    fireEvent.press(getByRole('button', { name: 'Conversar com o Viber' }));

    expect(onOpenViber).toHaveBeenCalledTimes(1);
    expect(queryByRole('button', { name: 'Abrir diagnóstico do carro' })).toBeNull();
  });
});
