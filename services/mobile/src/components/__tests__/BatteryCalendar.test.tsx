/**
 * Testes unitários do calendário mensal da bateria (mockup battery1).
 */

import { fireEvent, render } from '@testing-library/react-native';
import { BatteryCalendar } from '../BatteryCalendar';

describe('BatteryCalendar', () => {
  /** Renderiza a grade real do mês informado. */
  it('renderiza a grade de abril de 2025', () => {
    const { getByText } = render(<BatteryCalendar month={3} year={2025} />);

    expect(getByText('April 2025')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
  });

  /** Navega entre meses pelos botões. */
  it('navega entre meses', () => {
    const onMonthChange = jest.fn();
    const { getByRole } = render(
      <BatteryCalendar month={3} year={2025} onMonthChange={onMonthChange} />,
    );

    fireEvent.press(getByRole('button', { name: 'Mês anterior' }));
    expect(onMonthChange).toHaveBeenCalledWith(2, 2025);

    fireEvent.press(getByRole('button', { name: 'Próximo mês' }));
    expect(onMonthChange).toHaveBeenCalledWith(3, 2025);
  });

  /** Seleciona o dia e anuncia os dias com dados. */
  it('seleciona o dia ao pressionar', () => {
    const onSelectDay = jest.fn();
    const { getByRole } = render(
      <BatteryCalendar
        daysWithData={['2025-04-01', '2025-04-20']}
        month={3}
        onSelectDay={onSelectDay}
        year={2025}
      />,
    );

    fireEvent.press(getByRole('button', { name: '24' }));
    expect(onSelectDay).toHaveBeenCalledWith('2025-04-24');
  });

  /** Trava a navegação nos limites sem notificar (base da Task 06). */
  it('trava a navegação nos limites sem notificar', () => {
    const onMonthChange = jest.fn();
    const { getByRole } = render(
      <BatteryCalendar
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
