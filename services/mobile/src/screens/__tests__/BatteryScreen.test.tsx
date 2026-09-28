/**
 * Testes unitários da tela de bateria e energia do aplicativo VERS.
 */

import { render } from '@testing-library/react-native';
import { BatteryScreen } from '../BatteryScreen';

describe('BatteryScreen', () => {
  /** Apresenta o resumo do período com unidades e qualidade (05a). */
  it('apresenta energia recuperada, potência média e pico com contexto', () => {
    const { getByText } = render(<BatteryScreen />);

    expect(getByText('Bateria e energia')).toBeTruthy();
    expect(getByText('12.4 Wh')).toBeTruthy();
    expect(getByText('3.1 W')).toBeTruthy();
    expect(getByText('8.7 W')).toBeTruthy();
    expect(getByText('Últimos 30 dias · dados de amostra')).toBeTruthy();
  });

  /** Permite sobrescrever o resumo por props (05a). */
  it('permite sobrescrever o resumo por props', () => {
    const { getByText } = render(
      <BatteryScreen
        averagePowerW={2}
        peakPowerW={5}
        periodLabel="Hoje"
        qualityLabel="dados parciais"
        recoveredEnergyWh={7}
      />,
    );

    expect(getByText('7 Wh')).toBeTruthy();
    expect(getByText('Hoje · dados parciais')).toBeTruthy();
  });
});
