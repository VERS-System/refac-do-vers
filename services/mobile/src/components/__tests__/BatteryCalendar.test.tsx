/**
 * Testes unitários do calendário mensal da bateria (mockup battery1).
 */

import { fireEvent, render } from '@testing-library/react-native';
import { theme } from '../../constants/theme';
import { BatteryCalendar } from '../BatteryCalendar';

/** Achata o estilo de um elemento para conferir tokens de cor. */
function flatStyle(element: { props: { style: unknown } }): Record<string, unknown> {
  const style = element.props.style;
  return Array.isArray(style)
    ? Object.assign({}, ...(style as unknown[]))
    : (style as Record<string, unknown>);
}

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

  /** O primeiro toque ancora o período com o círculo dourado. */
  it('marca o início do período com o círculo no primeiro toque', () => {
    const onSelectDay = jest.fn();
    const { getByRole } = render(
      <BatteryCalendar month={3} onSelectDay={onSelectDay} year={2025} />,
    );

    fireEvent.press(getByRole('button', { name: '10' }));

    expect(onSelectDay).toHaveBeenCalledWith('2025-04-10');
    expect(flatStyle(getByRole('button', { name: '10' })).backgroundColor).toBe(
      theme.colors.primary,
    );
  });

  /** O segundo toque posterior fecha o período e notifica o intervalo. */
  it('fecha o período ao tocar um dia posterior e notifica onSelectRange', () => {
    const onSelectRange = jest.fn();
    const { getByRole, getByTestId, getByText } = render(
      <BatteryCalendar
        month={3}
        onSelectRange={onSelectRange}
        year={2025}
      />,
    );

    fireEvent.press(getByRole('button', { name: '10' }));
    fireEvent.press(getByRole('button', { name: '15' }));

    expect(onSelectRange).toHaveBeenCalledWith('2025-04-10', '2025-04-15');
    expect(flatStyle(getByTestId('battery-calendar-range-2025-04-12')).backgroundColor).toBe(
      theme.colors.primarySoft,
    );
    expect(flatStyle(getByRole('button', { name: '10' })).backgroundColor).toBe(
      theme.colors.primary,
    );
    expect(flatStyle(getByRole('button', { name: '15' })).backgroundColor).toBe(
      theme.colors.primary,
    );
    expect(flatStyle(getByText('10')).color).toBe(theme.colors.dark);
    expect(flatStyle(getByText('15')).color).toBe(theme.colors.dark);
  });

  /** A pílula é única e contínua: cobre ponta a ponta, inclusive as pontas. */
  it('cobre com a pílula todos os dias do período, inclusive as pontas', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <BatteryCalendar month={3} year={2025} />,
    );

    fireEvent.press(getByRole('button', { name: '10' }));
    fireEvent.press(getByRole('button', { name: '15' }));

    for (let day = 10; day <= 15; day += 1) {
      const iso = `2025-04-${String(day).padStart(2, '0')}`;
      expect(flatStyle(getByTestId(`battery-calendar-range-${iso}`)).backgroundColor).toBe(
        theme.colors.primarySoft,
      );
    }

    expect(queryByTestId('battery-calendar-range-2025-04-09')).toBeNull();
    expect(queryByTestId('battery-calendar-range-2025-04-16')).toBeNull();
  });

  /**
   * As junções ficam quadradas (pílula única) e só as faces externas das
   * extremidades arredondam, alinhadas ao círculo.
   */
  it('mantém as junções quadradas e arredonda só as extremidades externas', () => {
    const { getByRole, getByTestId } = render(
      <BatteryCalendar month={3} year={2025} />,
    );

    fireEvent.press(getByRole('button', { name: '10' }));
    fireEvent.press(getByRole('button', { name: '15' }));

    const startBand = flatStyle(getByTestId('battery-calendar-range-2025-04-10'));
    expect(startBand.borderTopLeftRadius).toBe(16);
    expect(startBand.borderBottomLeftRadius).toBe(16);
    expect(startBand.borderTopRightRadius).toBeUndefined();
    expect(startBand.borderBottomRightRadius).toBeUndefined();

    const endBand = flatStyle(getByTestId('battery-calendar-range-2025-04-15'));
    expect(endBand.borderTopRightRadius).toBe(16);
    expect(endBand.borderBottomRightRadius).toBe(16);
    expect(endBand.borderTopLeftRadius).toBeUndefined();
    expect(endBand.borderBottomLeftRadius).toBeUndefined();

    const middleBand = flatStyle(getByTestId('battery-calendar-range-2025-04-12'));
    expect(middleBand.borderTopLeftRadius).toBeUndefined();
    expect(middleBand.borderTopRightRadius).toBeUndefined();
  });

  /**
   * Após medir a grade, os caps das extremidades recuam exatamente até a
   * borda do círculo de 32px (sobra da célula dividida por dois).
   */
  it('recua os caps até a borda do círculo após medir a grade', () => {
    const { getByRole, getByTestId } = render(
      <BatteryCalendar month={3} year={2025} />,
    );

    fireEvent(getByTestId('battery-calendar-grid'), 'layout', {
      nativeEvent: { layout: { height: 238, width: 318 } },
    });
    fireEvent.press(getByRole('button', { name: '10' }));
    fireEvent.press(getByRole('button', { name: '15' }));

    const expectedInset = 318 / 7 - 32;
    expect(flatStyle(getByTestId('battery-calendar-range-2025-04-10')).left).toBeCloseTo(
      expectedInset / 2,
      5,
    );
    expect(flatStyle(getByTestId('battery-calendar-range-2025-04-15')).right).toBeCloseTo(
      expectedInset / 2,
      5,
    );
  });

  /** Toque anterior ao início inverte a ordem do período. */
  it('inverte o período quando o segundo toque é anterior ao início', () => {
    const onSelectRange = jest.fn();
    const { getByRole } = render(
      <BatteryCalendar month={3} onSelectRange={onSelectRange} year={2025} />,
    );

    fireEvent.press(getByRole('button', { name: '15' }));
    fireEvent.press(getByRole('button', { name: '10' }));

    expect(onSelectRange).toHaveBeenCalledWith('2025-04-10', '2025-04-15');
  });

  /** Um terceiro toque limpa o período anterior e recomeça uma nova âncora. */
  it('reinicia o período a partir do terceiro toque', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <BatteryCalendar month={3} year={2025} />,
    );

    fireEvent.press(getByRole('button', { name: '10' }));
    fireEvent.press(getByRole('button', { name: '15' }));
    fireEvent.press(getByRole('button', { name: '20' }));

    expect(queryByTestId('battery-calendar-range-2025-04-10')).toBeNull();
    expect(queryByTestId('battery-calendar-range-2025-04-12')).toBeNull();
    expect(queryByTestId('battery-calendar-range-2025-04-15')).toBeNull();
    expect(flatStyle(getByRole('button', { name: '10' })).backgroundColor).toBeUndefined();
    expect(flatStyle(getByRole('button', { name: '20' })).backgroundColor).toBe(
      theme.colors.primary,
    );
  });

  /** Dias intermediários só ganham a pílula suave, nunca o círculo. */
  it('não aplica o círculo nos dias intermediários do período', () => {
    const { getByRole } = render(<BatteryCalendar month={3} year={2025} />);

    fireEvent.press(getByRole('button', { name: '10' }));
    fireEvent.press(getByRole('button', { name: '15' }));

    expect(flatStyle(getByRole('button', { name: '12' })).backgroundColor).toBeUndefined();
  });
});
