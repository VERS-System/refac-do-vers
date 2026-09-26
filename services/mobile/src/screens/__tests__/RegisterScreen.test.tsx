/**
 * Testes unitários da tela de Cadastro do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { RegisterScreen } from '../RegisterScreen';

describe('RegisterScreen', () => {
  /** Envia os dados quando senha, confirmação e regras estiverem válidas. */
  it('envia email e senha válidos ao pressionar Sign-up', () => {
    const onRegister = jest.fn();
    const { getByLabelText, getByRole } = render(
      <RegisterScreen onRegister={onRegister} />,
    );

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!');
    fireEvent.changeText(getByLabelText('Confirm Password'), 'Password123!');
    fireEvent.press(getByRole('button', { name: 'Sign up' }));

    expect(onRegister).toHaveBeenCalledWith({
      email: 'anna@vers.com',
      password: 'Password123!',
    });
  });

  /** Mantém o envio indisponível enquanto a confirmação estiver diferente. */
  it('desabilita o cadastro quando as senhas não coincidem', () => {
    const onRegister = jest.fn();
    const { getByLabelText, getByRole } = render(
      <RegisterScreen onRegister={onRegister} />,
    );

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!');
    fireEvent.changeText(getByLabelText('Confirm Password'), 'Password123?');

    const button = getByRole('button', { name: 'Sign up' });
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(button);

    expect(onRegister).not.toHaveBeenCalled();
  });

  /** Confirma que o link inferior retorna ao fluxo de Login. */
  it('aciona o retorno ao Login', () => {
    const onLogin = jest.fn();
    const { getByRole } = render(<RegisterScreen onLogin={onLogin} />);

    fireEvent.press(getByRole('button', { name: 'Voltar para o Login' }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  /** Garante a grafia correta do botão de cadastro (03a). */
  it('exibe SIGN UP sem typos no botão', () => {
    const { getByText, queryByText } = render(<RegisterScreen />);

    expect(getByText('SIGN UP')).toBeTruthy();
    expect(queryByText('SING UP')).toBeNull();
  });
});
