/**
 * Testes unitários da tela de histórico energético (Task 06, lotes 06a–06g).
 *
 * Existe para travar o scaffold visual, o calendário standalone, o resumo do
 * dia, a lista paginada, os estados, o timezone e a acessibilidade: título,
 * mês inicial e limites por props, seleção com ISO do mês exibido, resumo
 * pronto do contrato, linhas com período, unidade e qualidade, paginação por
 * callback, carregamento/vazio/indisponível/erro, timezone sem conversão e
 * nome+papel+selected em todos os botões, sem rede, cálculo ou persistência.
 * Os dados chegam por props (fixtures até o F06); ausências nunca viram zero,
 * nenhum `Date` local reinterpreta o período e mês sem dados não parece
 * falha.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { HistoryScreen } from '../HistoryScreen';

describe('HistoryScreen (06a)', () => {
  /** Apresenta título, calendário reutilizado e lista vazia inicial. */
  it('apresenta título, calendário e lista vazia inicial', () => {
    const { getByTestId, getByText } = render(<HistoryScreen />);

    expect(getByTestId('history-screen')).toBeTruthy();
    expect(getByText('Histórico')).toBeTruthy();
    expect(getByTestId('battery-calendar')).toBeTruthy();
    expect(getByTestId('history-empty')).toBeTruthy();
  });

  /** Encaminha a seleção do dia sem buscar dados. */
  it('notifica a seleção do dia sem buscar dados', () => {
    const onSelectDay = jest.fn();
    const { getByRole } = render(<HistoryScreen onSelectDay={onSelectDay} />);

    fireEvent.press(getByRole('button', { name: '24' }));

    expect(onSelectDay).toHaveBeenCalledTimes(1);
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<HistoryScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('HistoryScreen calendário standalone (06b)', () => {
  /** Exibe o mês inicial informado por props. */
  it('exibe o mês inicial informado', () => {
    const { getByText } = render(<HistoryScreen month={3} year={2025} />);

    expect(getByText('April 2025')).toBeTruthy();
  });

  /** Notifica a troca de mês sem conter regra de período. */
  it('notifica a troca de mês', () => {
    const onMonthChange = jest.fn();
    const { getByRole } = render(
      <HistoryScreen month={3} onMonthChange={onMonthChange} year={2025} />,
    );

    fireEvent.press(getByRole('button', { name: 'Mês anterior' }));

    expect(onMonthChange).toHaveBeenCalledWith(2, 2025);
  });

  /** Seleciona o dia com o ISO do mês exibido. */
  it('seleciona o dia com o ISO do mês exibido', () => {
    const onSelectDay = jest.fn();
    const { getByRole } = render(
      <HistoryScreen
        daysWithData={['2025-04-01', '2025-04-20']}
        month={3}
        onSelectDay={onSelectDay}
        year={2025}
      />,
    );

    fireEvent.press(getByRole('button', { name: '24' }));

    expect(onSelectDay).toHaveBeenCalledWith('2025-04-24');
  });

  /** Repassa o período selecionado no calendário ao chamador. */
  it('notifica o período completo ao chamador pelo onSelectRange', () => {
    const onSelectRange = jest.fn();
    const { getByRole } = render(
      <HistoryScreen month={3} onSelectRange={onSelectRange} year={2025} />,
    );

    fireEvent.press(getByRole('button', { name: '10' }));
    fireEvent.press(getByRole('button', { name: '15' }));

    expect(onSelectRange).toHaveBeenCalledWith('2025-04-10', '2025-04-15');
  });

  /** Trava a navegação dentro dos limites aceitos por props. */
  it('trava a navegação dentro dos limites aceitos', () => {
    const onMonthChange = jest.fn();
    const { getByRole } = render(
      <HistoryScreen
        maxMonth={{ month: 3, year: 2025 }}
        minMonth={{ month: 3, year: 2025 }}
        month={3}
        onMonthChange={onMonthChange}
        year={2025}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Mês anterior' }));
    fireEvent.press(getByRole('button', { name: 'Próximo mês' }));

    expect(onMonthChange).not.toHaveBeenCalled();
  });
});

describe('HistoryScreen resumo do dia (06c)', () => {
  const SUMMARY = {
    dateLabel: '24/04/2025',
    energyUnit: 'Wh',
    qualityLabel: 'dados parciais',
    recoveredEnergyWh: 12.5,
  };

  /** Exibe o resumo pronto do contrato e esconde o vazio. */
  it('exibe o resumo do dia selecionado', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <HistoryScreen summary={SUMMARY} />,
    );

    expect(getByTestId('history-summary')).toBeTruthy();
    expect(getByText('24/04/2025')).toBeTruthy();
    expect(getByText('12.5 Wh')).toBeTruthy();
    expect(getByText('dados parciais')).toBeTruthy();
    expect(queryByTestId('history-empty')).toBeNull();
  });

  /** Omite o valor sem zerar quando a energia está ausente. */
  it('omite o valor sem zerar quando a energia está ausente', () => {
    const { getByTestId, queryByText } = render(
      <HistoryScreen summary={{ ...SUMMARY, recoveredEnergyWh: null }} />,
    );

    expect(getByTestId('history-summary')).toBeTruthy();
    expect(queryByText('12.5 Wh')).toBeNull();
    expect(queryByText('0 Wh')).toBeNull();
  });

  /** Abre os testes relacionados por callback puro. */
  it('abre os testes relacionados por callback', () => {
    const onOpenTests = jest.fn();
    const { getByRole } = render(
      <HistoryScreen onOpenTests={onOpenTests} summary={SUMMARY} />,
    );

    fireEvent.press(getByRole('button', { name: 'Ver testes do dia' }));

    expect(onOpenTests).toHaveBeenCalledTimes(1);
  });

  /** Omite o atalho de testes sem callback, sem mudar o resumo. */
  it('omite o atalho de testes sem callback', () => {
    const { getByTestId, queryByRole } = render(
      <HistoryScreen summary={SUMMARY} />,
    );

    expect(getByTestId('history-summary')).toBeTruthy();
    expect(queryByRole('button', { name: 'Ver testes do dia' })).toBeNull();
  });
});

describe('HistoryScreen lista histórica (06d)', () => {
  const ITEMS = [
    {
      energyUnit: 'Wh',
      id: '2025-04-24',
      periodLabel: '24/04/2025',
      qualityLabel: 'dados parciais',
      recoveredEnergyWh: 12.5,
    },
    {
      energyUnit: 'Wh',
      id: '2025-04-23',
      periodLabel: '23/04/2025',
      qualityLabel: 'dados válidos',
      recoveredEnergyWh: 8.25,
    },
  ];

  /** Exibe as linhas com período, unidade e qualidade e esconde o vazio. */
  it('exibe a lista com período, unidade e qualidade', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <HistoryScreen items={ITEMS} page={1} pageSize={2} totalItems={2} />,
    );

    expect(getByTestId('history-list')).toBeTruthy();
    expect(getByText('24/04/2025')).toBeTruthy();
    expect(getByText('12.5 Wh')).toBeTruthy();
    expect(getByText('dados parciais')).toBeTruthy();
    expect(queryByTestId('history-empty')).toBeNull();
  });

  /** Omite o valor da linha sem zerar quando a energia está ausente. */
  it('omite o valor da linha sem zerar', () => {
    const { getByTestId, queryByText } = render(
      <HistoryScreen items={[{ ...ITEMS[0], recoveredEnergyWh: null }]} />,
    );

    expect(getByTestId('history-list')).toBeTruthy();
    expect(queryByText('12.5 Wh')).toBeNull();
    expect(queryByText('0 Wh')).toBeNull();
  });

  /** Pagina por callback sem conter regra de página. */
  it('avança a página por callback', () => {
    const onPageChange = jest.fn();
    const { getByRole, getByText } = render(
      <HistoryScreen
        items={[ITEMS[0]]}
        onPageChange={onPageChange}
        page={1}
        pageSize={1}
        totalItems={2}
      />,
    );

    expect(getByText('Página 1 de 2')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Próxima página' }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  /** Trava anterior na primeira e próxima na última sem notificar. */
  it('trava as bordas da paginação sem notificar', () => {
    const onPageChange = jest.fn();
    const first = render(
      <HistoryScreen
        items={[ITEMS[0]]}
        onPageChange={onPageChange}
        page={1}
        pageSize={1}
        totalItems={2}
      />,
    );

    fireEvent.press(first.getByRole('button', { name: 'Página anterior' }));
    expect(onPageChange).not.toHaveBeenCalled();
    first.unmount();

    const last = render(
      <HistoryScreen
        items={[ITEMS[1]]}
        onPageChange={onPageChange}
        page={2}
        pageSize={1}
        totalItems={2}
      />,
    );

    fireEvent.press(last.getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe('HistoryScreen estados (06e)', () => {
  const SUMMARY = {
    dateLabel: '24/04/2025',
    energyUnit: 'Wh',
    qualityLabel: 'dados parciais',
    recoveredEnergyWh: 12.5,
  };

  /** Exibe esqueletos sem números, calendário, resumo ou lista. */
  it('exibe carregamento sem números', () => {
    const { getByLabelText, queryByTestId, queryByText } = render(
      <HistoryScreen
        items={[
          {
            energyUnit: 'Wh',
            id: '2025-04-24',
            periodLabel: '24/04/2025',
            recoveredEnergyWh: 12.5,
          },
        ]}
        status="loading"
        summary={SUMMARY}
      />,
    );

    expect(getByLabelText('Carregando')).toBeTruthy();
    expect(queryByTestId('battery-calendar')).toBeNull();
    expect(queryByTestId('history-summary')).toBeNull();
    expect(queryByTestId('history-list')).toBeNull();
    expect(queryByText('12.5 Wh')).toBeNull();
  });

  /** Exibe vazio neutro com calendário: mês sem dados não parece falha. */
  it('exibe vazio neutro com calendário', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <HistoryScreen status="empty" />,
    );

    expect(getByTestId('battery-calendar')).toBeTruthy();
    expect(
      getByRole('alert', { name: 'Nenhum período disponível.' }),
    ).toBeTruthy();
    expect(queryByTestId('history-unavailable')).toBeNull();
    expect(queryByTestId('history-error')).toBeNull();
  });

  /** Exibe período indisponível distinto do vazio, com calendário. */
  it('exibe período indisponível com calendário', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <HistoryScreen status="unavailable" />,
    );

    expect(getByTestId('battery-calendar')).toBeTruthy();
    expect(
      getByRole('alert', { name: 'Período indisponível para consulta.' }),
    ).toBeTruthy();
    expect(queryByTestId('history-empty')).toBeNull();
    expect(queryByTestId('history-error')).toBeNull();
  });

  /** Exibe erro sem conteúdo e repete a carga ao tentar de novo. */
  it('exibe erro e repete a carga ao tentar de novo', () => {
    const onRetry = jest.fn();
    const { getByRole, queryByTestId } = render(
      <HistoryScreen onRetry={onRetry} status="error" summary={SUMMARY} />,
    );

    expect(
      getByRole('alert', {
        name: 'Não foi possível carregar o histórico. Tente novamente.',
      }),
    ).toBeTruthy();
    expect(queryByTestId('battery-calendar')).toBeNull();
    expect(queryByTestId('history-summary')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('HistoryScreen timezone (06f)', () => {
  /** Exibe o timezone do contrato sem conversão. */
  it('exibe o timezone do contrato sem converter', () => {
    const { getByTestId, getByText } = render(
      <HistoryScreen timeZone="America/Sao_Paulo" />,
    );

    expect(getByTestId('history-timezone')).toBeTruthy();
    expect(getByText('Fuso horário: America/Sao_Paulo')).toBeTruthy();
  });

  /** Omite o rótulo sem timezone, sem mudar o padrão. */
  it('omite o rótulo sem timezone', () => {
    const { queryByTestId } = render(<HistoryScreen />);

    expect(queryByTestId('history-timezone')).toBeNull();
  });

  /** Preserva o rótulo do período sem reinterpretar com `Date` local. */
  it('preserva o período sem reinterpretar', () => {
    const { getByText } = render(
      <HistoryScreen
        summary={{
          dateLabel: '2025-04-24T00:00:00-03:00',
          recoveredEnergyWh: 12.5,
        }}
      />,
    );

    expect(getByText('2025-04-24T00:00:00-03:00')).toBeTruthy();
  });
});

describe('HistoryScreen acessibilidade (06g)', () => {
  /** Expõe nome+papel em todos os botões: nav, voltar, testes, paginação e abas. */
  it('expõe nome acessível em botões e atalhos', () => {
    const { getAllByRole } = render(
      <HistoryScreen
        items={[
          {
            energyUnit: 'Wh',
            id: '2025-04-24',
            periodLabel: '24/04/2025',
            qualityLabel: 'dados parciais',
            recoveredEnergyWh: 12.5,
          },
        ]}
        onBack={jest.fn()}
        onOpenTests={jest.fn()}
        onPageChange={jest.fn()}
        page={1}
        pageSize={1}
        summary={{
          dateLabel: '24/04/2025',
          energyUnit: 'Wh',
          qualityLabel: 'dados parciais',
          recoveredEnergyWh: 12.5,
        }}
        totalItems={2}
      />,
    );

    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(9);

    for (const button of buttons) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  /** Informa o dia selecionado ao leitor de tela. */
  it('informa o dia selecionado ao leitor de tela', () => {
    const { getByRole } = render(
      <HistoryScreen
        daysWithData={['2025-04-24']}
        month={3}
        selectedDate="2025-04-24"
        year={2025}
      />,
    );

    expect(
      getByRole('button', { name: '24' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      getByRole('button', { name: '23' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });
});
