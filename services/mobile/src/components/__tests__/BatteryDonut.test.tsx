/**
 * Testes unitários do gráfico circular de bateria recuperada.
 */

import { render } from '@testing-library/react-native';
import { BatteryDonut } from '../BatteryDonut';

describe('BatteryDonut', () => {
  /** Expõe a porcentagem recuperada de forma acessível. */
  it('descreve a proporção recuperada', () => {
    const { getByLabelText } = render(<BatteryDonut recoveredPercentage={65} />);

    expect(getByLabelText('65% da bateria foi recuperada')).toBeTruthy();
  });
});
