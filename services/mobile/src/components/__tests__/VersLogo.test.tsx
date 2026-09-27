/**
 * Testes unitários do logotipo visual reutilizável do VERS.
 */

import { render } from '@testing-library/react-native';
import { VersLogo } from '../VersLogo';

describe('VersLogo', () => {
  /** Garante que as três barras inclinadas da identidade visual sejam renderizadas. */
  it('renderiza as três barras da marca', () => {
    const { getByTestId } = render(<VersLogo />);

    expect(getByTestId('vers-logo')).toBeTruthy();
    expect(getByTestId('vers-logo-bar-left')).toBeTruthy();
    expect(getByTestId('vers-logo-bar-center')).toBeTruthy();
    expect(getByTestId('vers-logo-bar-right')).toBeTruthy();
  });

  /** Garante que cada barra tenha seu contêiner animado individual. */
  it('cria um contêiner animado para cada barra', () => {
    const { getByTestId } = render(<VersLogo />);

    expect(getByTestId('vers-logo-slide-left')).toBeTruthy();
    expect(getByTestId('vers-logo-slide-center')).toBeTruthy();
    expect(getByTestId('vers-logo-slide-right')).toBeTruthy();
  });

  /** A animação de entrada não pode quebrar a renderização das barras. */
  it('renderiza as barras mesmo com animação configurada', () => {
    const { getByTestId } = render(
      <VersLogo animation="register" animationRun={1} />,
    );

    expect(getByTestId('vers-logo')).toBeTruthy();
    expect(getByTestId('vers-logo-bar-left')).toBeTruthy();
    expect(getByTestId('vers-logo-bar-center')).toBeTruthy();
    expect(getByTestId('vers-logo-bar-right')).toBeTruthy();
  });
});
