/**
 * Testes unitários da tela do sistema VERS (Task 07, lote 07a).
 *
 * Existe para travar o scaffold visual: título, aba vers ativa e vazio
 * inicial, sem rede, cálculo ou persistência. Os dados virão por props
 * (fixtures até F01/F05); ausências nunca viram zero e nenhum segredo
 * (deviceUid, MQTT, tópicos, série) é exibido.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { VersSystemScreen } from '../VersSystemScreen';

describe('VersSystemScreen (07a)', () => {
  /** Apresenta título, subtítulo e vazio inicial na aba vers. */
  it('apresenta título e vazio inicial', () => {
    const { getByTestId, getByText } = render(<VersSystemScreen />);

    expect(getByTestId('vers-system-screen')).toBeTruthy();
    expect(getByText('Sistema VERS')).toBeTruthy();
    expect(getByTestId('vers-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<VersSystemScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
