/**
 * Testes unitários do gráfico de barras compacto usado nas telas de energia.
 */

import { render } from '@testing-library/react-native';
import { EnergyBarChart } from '../EnergyBarChart';

describe('EnergyBarChart', () => {
  /** Garante que todos os valores recebidos sejam representados por barras. */
  it('renderiza uma barra para cada valor', () => {
    const { getAllByTestId, getByLabelText } = render(
      <EnergyBarChart values={[20, 45, 70, 35]} />,
    );

    expect(getByLabelText('Gráfico de barras com 4 valores')).toBeTruthy();
    expect(getAllByTestId('energy-bar')).toHaveLength(4);
  });
});
