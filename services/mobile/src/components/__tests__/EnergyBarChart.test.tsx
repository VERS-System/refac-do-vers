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

  /** Achata o estilo da barra para conferir a altura normalizada. */
  function barHeight(bar: { props: { style: unknown } }): string {
    const style = bar.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    return flat.height;
  }

  /** Com `max`, a altura é proporcional ao teto informado (dados reais em Wh). */
  it('normaliza a altura em relação ao teto max', () => {
    const { getAllByTestId } = render(
      <EnergyBarChart max={1000} values={[240]} />,
    );

    expect(barHeight(getAllByTestId('energy-bar')[0])).toBe('24%');
  });

  /** Valor acima do teto satura em barra cheia em vez de estourar. */
  it('satura a altura em 100% quando o valor supera o teto', () => {
    const { getAllByTestId } = render(
      <EnergyBarChart max={100} values={[150]} />,
    );

    expect(barHeight(getAllByTestId('energy-bar')[0])).toBe('100%');
  });

  /** Zero e negativos viram altura zero: sem energia não pode virar barrinha. */
  it('renderiza altura zero para valores zero ou negativos', () => {
    const { getAllByTestId } = render(
      <EnergyBarChart values={[0, -5]} />,
    );

    expect(barHeight(getAllByTestId('energy-bar')[0])).toBe('0%');
    expect(barHeight(getAllByTestId('energy-bar')[1])).toBe('0%');
  });

  /** Valor positivo pequeno mantém o piso de 8% para não sumir no visual. */
  it('mantém o piso de 8% para valores positivos abaixo dele', () => {
    const { getAllByTestId } = render(
      <EnergyBarChart max={1000} values={[5]} />,
    );

    expect(barHeight(getAllByTestId('energy-bar')[0])).toBe('8%');
  });

  /** Sem `max`, o comportamento percentual atual das fixtures permanece. */
  it('preserva a escala percentual padrão sem a prop max', () => {
    const { getAllByTestId } = render(<EnergyBarChart values={[50]} />);

    expect(barHeight(getAllByTestId('energy-bar')[0])).toBe('50%');
  });
});
