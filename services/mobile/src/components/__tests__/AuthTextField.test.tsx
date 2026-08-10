/**
 * Testes unitários do campo reutilizável dos formulários de autenticação.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { AuthTextField } from '../AuthTextField';

describe('AuthTextField', () => {
  /** Confirma que o campo apresenta o rótulo e encaminha a digitação. */
  it('exibe o rótulo e informa o novo valor', () => {
    const onChangeText = jest.fn();
    const { getByLabelText, getByText } = render(
      <AuthTextField label="Email:" onChangeText={onChangeText} value="" />,
    );

    expect(getByText('Email:')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');

    expect(onChangeText).toHaveBeenCalledWith('anna@vers.com');
  });

  /** Garante que senhas não sejam exibidas como texto aberto. */
  it('oculta o conteúdo quando configurado como senha', () => {
    const { getByLabelText } = render(
      <AuthTextField
        label="Password:"
        onChangeText={jest.fn()}
        secureTextEntry
        value="segredo"
      />,
    );

    expect(getByLabelText('Password').props.secureTextEntry).toBe(true);
  });
});
