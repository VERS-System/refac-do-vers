/**
 * Testes unitários da tela inicial de apresentação do aplicativo VERS.
 */

import { render } from '@testing-library/react-native';
import { SplashScreen } from '../SplashScreen';

describe('SplashScreen', () => {
  /** Confirma que a tela exibe a marca centralizada durante a inicialização. */
  it('exibe o logotipo do VERS em uma camada animada', () => {
    const { getByTestId } = render(<SplashScreen />);

    expect(getByTestId('splash-screen')).toBeTruthy();
    expect(getByTestId('splash-logo-move')).toBeTruthy();
    expect(getByTestId('vers-logo')).toBeTruthy();
  });
});
