/**
 * Testes unitários do logotipo visual reutilizável do VERS.
 */

import { render } from '@testing-library/react-native';
import { VersLogo } from '../VersLogo';

describe('VersLogo', () => {
  /** Garante que as três faixas da identidade visual sejam renderizadas. */
  it('renderiza as três faixas da marca', () => {
    const { getByTestId } = render(<VersLogo />);

    expect(getByTestId('vers-logo')).toBeTruthy();
    expect(getByTestId('vers-logo-stripe-left')).toBeTruthy();
    expect(getByTestId('vers-logo-stripe-center')).toBeTruthy();
    expect(getByTestId('vers-logo-stripe-right')).toBeTruthy();
  });
});
