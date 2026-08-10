/**
 * Testes unitários da navegação inferior principal do aplicativo.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { BottomNavigation } from '../BottomNavigation';

describe('BottomNavigation', () => {
  /** Encaminha a aba selecionada e informa semanticamente a aba ativa. */
  it('seleciona a área de bateria', () => {
    const onTabPress = jest.fn();
    const { getByRole } = render(
      <BottomNavigation activeTab="home" onTabPress={onTabPress} />,
    );

    expect(getByRole('button', { name: 'Início' }).props.accessibilityState).toEqual({
      selected: true,
    });

    fireEvent.press(getByRole('button', { name: 'Bateria' }));
    expect(onTabPress).toHaveBeenCalledWith('battery');
  });
});
