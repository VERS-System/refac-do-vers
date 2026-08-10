/**
 * Testes unitários do botão principal reutilizável.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { PrimaryButton } from '../PrimaryButton';

describe('PrimaryButton', () => {
  /** Impede o disparo da ação enquanto o botão estiver desabilitado. */
  it('não executa a ação no estado desabilitado', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <PrimaryButton disabled label="SIGN-UP" onPress={onPress} />,
    );

    const button = getByRole('button', { name: 'SIGN-UP' });
    expect(button.props.accessibilityState).toEqual({ disabled: true });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
