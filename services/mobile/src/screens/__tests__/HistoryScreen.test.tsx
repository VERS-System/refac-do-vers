/**
 * Testes unitários da tela de histórico energético (Task 06, lote 06a).
 *
 * Existe para travar o scaffold visual antes da implementação: título,
 * calendário reutilizado e lista vazia inicial, sem rede, cálculo ou
 * persistência. Os dados chegam por props (fixtures até o F06).
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
