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

  /**
   * Trava a geometria medida pixel a pixel no versLogo.png (140x93): barra com
   * largura constante no topo e afilamento só no terço inferior (pincelada).
   */
  it('desenha as barras com a geometria fiel da imagem de referência', () => {
    const { getByTestId } = render(<VersLogo />);

    expect(getByTestId('vers-logo-bar-left').props.d).toBe(
      'M42 0 66 0 43 49 12 92 0 92z',
    );
    expect(getByTestId('vers-logo-bar-center').props.d).toBe(
      'M80 0 104 0 81 49 50 92 38 92z',
    );
    expect(getByTestId('vers-logo-bar-right').props.d).toBe(
      'M116 0 140 0 117 49 86 92 74 92z',
    );
  });
});
