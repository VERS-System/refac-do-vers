/**
 * Testes unitários da tela inicial do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';

describe('HomeScreen', () => {
  /** Confirma a presença dos indicadores previstos sem o diagnóstico fora de escopo. */
  it('apresenta energia, economia e bateria recuperada sem diagnóstico', () => {
    const { getByText, queryByText } = render(<HomeScreen />);

    expect(getByText('Battery usage')).toBeTruthy();
    expect(getByText('Money economy')).toBeTruthy();
    expect(getByText('Battery Recovered')).toBeTruthy();
    expect(getByText('Battery Used')).toBeTruthy();
    expect(queryByText('Your car Diagnostic')).toBeNull();
  });

  /** Valida o atalho para o Viber sem atalho de diagnóstico do veículo. */
  it('aciona o atalho do Viber', () => {
    const onOpenViber = jest.fn();
    const { getByRole, queryByRole } = render(<HomeScreen onOpenViber={onOpenViber} />);

    fireEvent.press(getByRole('button', { name: 'Conversar com o Viber' }));

    expect(onOpenViber).toHaveBeenCalledTimes(1);
    expect(queryByRole('button', { name: 'Abrir diagnóstico do carro' })).toBeNull();
  });

  /** Garante período, unidade e qualidade em cada indicador (04a). */
  it('anuncia período, unidade e qualidade em cada indicador', () => {
    const { getAllByText } = render(<HomeScreen />);

    expect(getAllByText('Últimos 30 dias · Wh · dados de amostra')).toHaveLength(3);
  });

  /** Garante que período, unidade e qualidade vêm por props (04a). */
  it('permite sobrescrever período, unidade e qualidade', () => {
    const { getAllByText } = render(
      <HomeScreen periodLabel="Hoje" energyUnit="kWh" qualityLabel="dados parciais" />,
    );

    expect(getAllByText('Hoje · kWh · dados parciais')).toHaveLength(3);
  });

  /** Garante carregamento sem números (04b). */
  it('exibe carregamento sem indicadores', () => {
    const { getByLabelText, queryByText } = render(<HomeScreen status="loading" />);

    expect(getByLabelText('Carregando')).toBeTruthy();
    expect(queryByText('Battery usage')).toBeNull();
    expect(queryByText('Money economy')).toBeNull();
  });

  /** Garante ausência de dados sem zeros inventados (04b). */
  it('exibe ausência de dados sem indicadores', () => {
    const { getByRole, queryByText } = render(<HomeScreen status="noData" />);

    expect(
      getByRole('alert', { name: 'Nenhum dado disponível para o período.' }),
    ).toBeTruthy();
    expect(queryByText('Battery usage')).toBeNull();
  });

  /** Garante erro com nova tentativa (04b). */
  it('exibe erro e repete a carga ao tentar de novo', () => {
    const onRetry = jest.fn();
    const { getByRole, queryByText } = render(
      <HomeScreen onRetry={onRetry} status="error" />,
    );

    expect(
      getByRole('alert', { name: 'Não foi possível carregar os dados. Tente novamente.' }),
    ).toBeTruthy();
    expect(queryByText('Battery usage')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /** Garante orientação sem instalação e sem números (04c). */
  it('exibe ausência de instalação sem indicadores', () => {
    const { getByRole, queryByText } = render(<HomeScreen status="noInstallation" />);

    expect(
      getByRole('alert', { name: 'Nenhum sistema VERS vinculado. Cadastre um veículo para começar.' }),
    ).toBeTruthy();
    expect(queryByText('Battery usage')).toBeNull();
  });

  /** Garante aviso de qualidade insuficiente sem números (04c). */
  it('exibe qualidade insuficiente sem indicadores', () => {
    const { getByRole, queryByText } = render(<HomeScreen status="insufficientQuality" />);

    expect(
      getByRole('alert', { name: 'Dados insuficientes para exibir os indicadores.' }),
    ).toBeTruthy();
    expect(queryByText('Battery usage')).toBeNull();
  });

  /** Garante atalhos de bateria e sistema VERS por callbacks (04d). */
  it('aciona os atalhos de bateria e sistema VERS', () => {
    const onOpenBattery = jest.fn();
    const onOpenVersSystem = jest.fn();
    const { getByRole } = render(
      <HomeScreen onOpenBattery={onOpenBattery} onOpenVersSystem={onOpenVersSystem} />,
    );

    fireEvent.press(getByRole('button', { name: 'Abrir uso da bateria' }));
    fireEvent.press(getByRole('button', { name: 'Abrir detalhes de energia' }));
    expect(onOpenBattery).toHaveBeenCalledTimes(2);

    fireEvent.press(getByRole('button', { name: 'Abrir sistema VERS' }));
    expect(onOpenVersSystem).toHaveBeenCalledTimes(1);
  });

  /** Garante nome acessível em botões e atalhos da Home (04e). */
  it('expõe nome acessível em botões e atalhos', () => {
    const { getAllByRole } = render(
      <HomeScreen
        onOpenBattery={() => {}}
        onOpenVersSystem={() => {}}
        onOpenViber={() => {}}
      />,
    );

    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);

    for (const button of buttons) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });
});

describe('HomeScreen alvos de toque (13f)', () => {
  /** Garante alvo de toque nos atalhos da Home. */
  it('garante alvo de toque nos atalhos', () => {
    const { getByLabelText } = render(<HomeScreen />);

    expect(getByLabelText('Conversar com o Viber').props.hitSlop).toBeTruthy();
    expect(getByLabelText('Abrir sistema VERS').props.hitSlop).toBeTruthy();
  });
});
