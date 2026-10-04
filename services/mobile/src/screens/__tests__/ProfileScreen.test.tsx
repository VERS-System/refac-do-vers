/**
 * Testes unitários da tela de perfil (Task 09, lote 09a).
 *
 * Existe para travar o scaffold visual e a rota na aba profile: título,
 * vazio inicial e voltar por callback, sem rede, cálculo ou persistência.
 * Os dados virão por props (fixtures até F01/F05); papéis, permissões e
 * encerramento de sessão pertencem ao backend.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { ProfileScreen } from '../ProfileScreen';

describe('ProfileScreen (09a)', () => {
  /** Apresenta título e vazio inicial na aba profile. */
  it('apresenta título e vazio inicial', () => {
    const { getByTestId, getByText } = render(<ProfileScreen />);

    expect(getByTestId('profile-screen')).toBeTruthy();
    expect(getByText('Perfil')).toBeTruthy();
    expect(getByTestId('profile-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<ProfileScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
