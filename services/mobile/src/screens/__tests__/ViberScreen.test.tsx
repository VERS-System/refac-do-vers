/**
 * Testes unitários da tela do Viber (Task 11, lote 11a).
 *
 * Existe para travar o scaffold visual e a rota interna: título, conversa
 * vazia inicial e voltar por callback, sem rede, cálculo ou lógica de IA.
 * As mensagens chegam por props nos próximos lotes (fixtures até o
 * contrato do ai-service); nada é buscado, persistido ou decidido aqui.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { ViberScreen } from '../ViberScreen';

describe('ViberScreen (11a)', () => {
  /** Apresenta título e conversa vazia inicial. */
  it('apresenta título e conversa vazia inicial', () => {
    const { getByTestId, getByText } = render(<ViberScreen />);

    expect(getByTestId('viber-screen')).toBeTruthy();
    expect(getByText('Viber')).toBeTruthy();
    expect(getByTestId('viber-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<ViberScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
