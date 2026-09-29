/**
 * Testes unitários da tela de histórico energético (Task 06, lotes 06a–06b).
 *
 * Existe para travar o scaffold visual e o calendário standalone: título,
 * calendário reutilizado com mês inicial e limites por props, seleção com ISO
 * do mês exibido e lista vazia inicial, sem rede, cálculo ou persistência.
 * Os dados chegam por props (fixtures até o F06).
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
