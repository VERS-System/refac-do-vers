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

  /** Cada valor ganha um rótulo no slot correspondente, alinhado por construção. */
  it('renderiza um rótulo por barra quando labels é informado', () => {
    const { getAllByTestId, getByText } = render(
      <EnergyBarChart labels={['11 AM', '12 PM', '1 PM']} values={[10, 20, 30]} />,
    );

    expect(getByText('11 AM')).toBeTruthy();
    expect(getByText('12 PM')).toBeTruthy();
    expect(getByText('1 PM')).toBeTruthy();
    expect(getAllByTestId('energy-label-slot')).toHaveLength(3);
  });

  /** Sem labels, não existe linha de rótulos (Home e Money economy). */
  it('omite a linha de rótulos sem a prop labels', () => {
    const { queryAllByTestId } = render(<EnergyBarChart values={[10, 20]} />);

    expect(queryAllByTestId('energy-label-slot')).toHaveLength(0);
  });

  /** Séries longas perdem rótulos intermediários, mas a contagem de slots fica. */
  it('aplica thinning mantendo um slot por barra e o primeiro rótulo', () => {
    const labels = Array.from({ length: 24 }, (_, index) => `h${index}`);
    const { getAllByTestId, getByText, queryByText } = render(
      <EnergyBarChart labels={labels} values={labels.map(() => 50)} />,
    );

    expect(getAllByTestId('energy-label-slot')).toHaveLength(24);
    expect(getByText('h0')).toBeTruthy();
    expect(getAllByTestId('energy-label')).toHaveLength(8);
    expect(queryByText('h1')).toBeNull();
    expect(queryByText('h23')).toBeNull();
  });

  /** `maxVisibleLabels` menor força thinning mais agressivo. */
  it('respeita maxVisibleLabels informado pelo chamador', () => {
    const labels = Array.from({ length: 10 }, (_, index) => `h${index}`);
    const { getAllByTestId, getByText, queryByText } = render(
      <EnergyBarChart
        labels={labels}
        maxVisibleLabels={3}
        values={labels.map(() => 50)}
      />,
    );

    expect(getAllByTestId('energy-label')).toHaveLength(3);
    expect(getByText('h0')).toBeTruthy();
    expect(getByText('h4')).toBeTruthy();
    expect(getByText('h8')).toBeTruthy();
    expect(queryByText('h1')).toBeNull();
  });
});
