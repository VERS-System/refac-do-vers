/**
 * Testes unitários da tela de bateria e energia (mockup battery1).
 */

import { fireEvent, render } from '@testing-library/react-native';
import { BatteryScreen } from '../BatteryScreen';

const HOURLY = [
  { label: '11 AM', value: 52 },
  { label: '12 PM', value: 48 },
  { label: '1 PM', value: 72 },
  { label: '2 PM', value: 57 },
  { label: '3 PM', value: 75 },
  { label: '4 PM', value: 50 },
];

describe('BatteryScreen', () => {
  /** Apresenta o registro mensal com a legenda do mockup. */
  it('apresenta registro mensal com legenda', () => {
    const { getByText } = render(<BatteryScreen />);

    expect(getByText('MONTHLY RECORD')).toBeTruthy();
    expect(getByText('Battery Recovered')).toBeTruthy();
    expect(getByText('Battery Used')).toBeTruthy();
  });

  /** Apresenta o card Today com as horas do mockup. */
  it('apresenta o card Today com horas e barras', () => {
    const { getAllByTestId, getByText } = render(<BatteryScreen />);

    expect(getByText('Today')).toBeTruthy();
    expect(getByText('11 AM')).toBeTruthy();
    expect(getByText('4 PM')).toBeTruthy();
    expect(getAllByTestId('energy-bar')).toHaveLength(6);
  });

  /** Apresenta o calendário funcional do mockup. */
  it('apresenta o calendário e seleciona o dia', () => {
    const onSelectDay = jest.fn();
    const { getByRole, getByTestId } = render(
      <BatteryScreen onSelectDay={onSelectDay} />,
    );

    expect(getByTestId('battery-calendar')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: '24' }));
    expect(onSelectDay).toHaveBeenCalledTimes(1);
  });

  /** Responde aos dados fornecidos por props. */
  it('responde aos dados fornecidos', () => {
    const { getAllByTestId, getByText, queryByText } = render(
      <BatteryScreen hourlyData={HOURLY.slice(0, 3)} />,
    );

    expect(getAllByTestId('energy-bar')).toHaveLength(3);
    expect(getByText('11 AM')).toBeTruthy();
    expect(queryByText('4 PM')).toBeNull();
  });

  /** Alterna o modo expandido com Money economy (05d, battery2). */
  it('expande o card com Money economy e recolhe de volta', () => {
    const onExpandToday = jest.fn();
    const { getByRole, getByTestId, getByText, queryByTestId, queryByText } = render(
      <BatteryScreen onExpandToday={onExpandToday} />,
    );

    expect(getByTestId('battery-calendar')).toBeTruthy();
    expect(queryByText('Money economy')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Expandir gráfico do dia' }));
    expect(onExpandToday).toHaveBeenCalledTimes(1);
    expect(queryByTestId('battery-calendar')).toBeNull();
    expect(getByText('Money economy')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Recolher gráfico do dia' }));
    expect(getByTestId('battery-calendar')).toBeTruthy();
    expect(queryByText('Money economy')).toBeNull();
  });

  /** Garante carregamento sem gráficos (05e). */
  it('exibe carregamento sem gráficos', () => {
    const { getByLabelText, queryByTestId } = render(<BatteryScreen status="loading" />);

    expect(getByLabelText('Carregando')).toBeTruthy();
    expect(queryByTestId('battery-calendar')).toBeNull();
  });

  /** Garante vazio sem zeros inventados (05e). */
  it('exibe ausência de dados sem gráficos', () => {
    const { getByRole, queryByTestId } = render(<BatteryScreen status="empty" />);

    expect(
      getByRole('alert', { name: 'Nenhum dado de energia para o período.' }),
    ).toBeTruthy();
    expect(queryByTestId('battery-calendar')).toBeNull();
  });

  /** Garante parcial com aviso e conteúdo (05e). */
  it('exibe aviso parcial mantendo os gráficos', () => {
    const { getByRole, getByTestId } = render(<BatteryScreen status="partial" />);

    expect(
      getByRole('alert', { name: 'Dados parciais para o período.' }),
    ).toBeTruthy();
    expect(getByTestId('battery-calendar')).toBeTruthy();
  });

  /** Garante inválido sem agregados (05e). */
  it('exibe dados inválidos sem gráficos', () => {
    const { getByRole, queryByTestId } = render(<BatteryScreen status="invalid" />);

    expect(
      getByRole('alert', { name: 'Dados inválidos para o período.' }),
    ).toBeTruthy();
    expect(queryByTestId('battery-calendar')).toBeNull();
  });

  /** Garante erro com nova tentativa (05e). */
  it('exibe erro e repete a carga ao tentar de novo', () => {
    const onRetry = jest.fn();
    const { getByRole, queryByTestId } = render(
      <BatteryScreen onRetry={onRetry} status="error" />,
    );

    expect(
      getByRole('alert', { name: 'Não foi possível carregar a energia. Tente novamente.' }),
    ).toBeTruthy();
    expect(queryByTestId('battery-calendar')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /** Garante nome acessível em botões e atalhos da bateria (05f). */
  it('expõe nome acessível em botões e atalhos', () => {
    const { getAllByRole } = render(<BatteryScreen />);

    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    for (const button of buttons) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  /** Garante economia só com moeda e tarifa (05h). */
  it('omite Money economy sem moeda e tarifa', () => {
    const { getByRole, queryByText } = render(
      <BatteryScreen currencyCode={null} energyTariffPerKwh={null} />,
    );

    fireEvent.press(getByRole('button', { name: 'Expandir gráfico do dia' }));
    expect(queryByText('Money economy')).toBeNull();
  });

  /** Garante bateria usada só com fonte confiável (05h). */
  it('exibe bateria usada somente com fonte confiável', () => {
    const { queryByText, rerender } = render(<BatteryScreen />);

    expect(queryByText('4.2 Wh')).toBeNull();

    rerender(
      <BatteryScreen energySourceLabel="sensor INA219" vehicleEnergyUsedWh={4.2} />,
    );
    expect(queryByText('4.2 Wh')).toBeTruthy();
    expect(queryByText('fonte: sensor INA219')).toBeTruthy();
  });

  /** Garante legenda de origem e cobertura da série (05g). */
  it('distingue medido, calculado e indisponível com cobertura', () => {
    const { getByText } = render(<BatteryScreen />);

    expect(getByText('● Medido')).toBeTruthy();
    expect(getByText('● Calculado')).toBeTruthy();
    expect(getByText('○ Indisponível')).toBeTruthy();
    expect(getByText('cobertura 6 de 6 horas')).toBeTruthy();
  });

  /** Garante que hora indisponível não vira zero (05g). */
  it('omite hora indisponível sem zerar', () => {
    const { getAllByTestId, getByText, queryByText } = render(
      <BatteryScreen
        hourlyData={[
          ...HOURLY.slice(0, 5),
          { label: '4 PM', origin: 'unavailable', value: 0 },
        ]}
      />,
    );

    expect(getAllByTestId('energy-bar')).toHaveLength(5);
    expect(queryByText('4 PM')).toBeNull();
    expect(getByText('cobertura 5 de 6 horas')).toBeTruthy();
  });
});

describe('BatteryScreen selo de amostra (13c)', () => {
  /** Exibe o selo enquanto houver fixtures e omite com dados reais. */
  it('exibe selo de amostra e omite com dados reais', () => {
    const { getByTestId, queryByTestId, rerender } = render(<BatteryScreen />);

    expect(getByTestId('battery-sample-seal')).toBeTruthy();

    rerender(<BatteryScreen isSampleData={false} />);

    expect(queryByTestId('battery-sample-seal')).toBeNull();
  });
});
