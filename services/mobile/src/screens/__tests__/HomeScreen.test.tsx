/**
 * Testes unitários da tela inicial do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';

describe('HomeScreen', () => {
  /** Confirma a presença dos principais indicadores definidos no mockup. */
  it('apresenta energia, diagnóstico, economia e bateria recuperada', () => {
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Battery usage')).toBeTruthy();
    expect(getByText('Your car Diagnostic')).toBeTruthy();
    expect(getByText('Money economy')).toBeTruthy();
    expect(getByText('Battery Recovered')).toBeTruthy();
    expect(getByText('Battery Used')).toBeTruthy();
  });

  /** Valida os atalhos para o Viber e para o diagnóstico do veículo. */
  it('aciona os atalhos interativos da Home', () => {
    const onOpenDiagnostic = jest.fn();
    const onOpenViber = jest.fn();
    const { getByRole } = render(
      <HomeScreen onOpenDiagnostic={onOpenDiagnostic} onOpenViber={onOpenViber} />,
    );

    fireEvent.press(getByRole('button', { name: 'Conversar com o Viber' }));
    fireEvent.press(getByRole('button', { name: 'Abrir diagnóstico do carro' }));

    expect(onOpenViber).toHaveBeenCalledTimes(1);
    expect(onOpenDiagnostic).toHaveBeenCalledTimes(1);
  });
});
