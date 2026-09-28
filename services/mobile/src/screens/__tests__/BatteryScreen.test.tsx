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
});
