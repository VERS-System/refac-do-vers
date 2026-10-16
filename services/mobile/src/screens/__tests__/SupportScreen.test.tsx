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
