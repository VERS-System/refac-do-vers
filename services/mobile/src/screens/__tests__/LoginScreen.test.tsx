/**
 * Testes unitários da tela de acesso do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';

describe('LoginScreen', () => {
  /** Valida o envio das credenciais preenchidas pelo usuário. */
  it('envia email e senha ao pressionar Login', () => {
    const onLogin = jest.fn();
    const { getByLabelText, getByRole } = render(<LoginScreen onLogin={onLogin} />);

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!!');
    fireEvent.press(getByRole('button', { name: 'Login' }));

    expect(onLogin).toHaveBeenCalledWith({
      email: 'anna@vers.com',
      password: 'Password123!!',
    });
  });

  /** Confirma que as alternativas de Google e Cadastro disparam seus fluxos. */
  it('aciona login Google e abertura do cadastro', () => {
    const onGoogleLogin = jest.fn();
    const onSignUp = jest.fn();
    const { getByRole } = render(
      <LoginScreen onGoogleLogin={onGoogleLogin} onSignUp={onSignUp} />,
    );

    fireEvent.press(getByRole('button', { name: 'Entrar com Google' }));
    fireEvent.press(getByRole('button', { name: 'Criar uma conta' }));

    expect(onGoogleLogin).toHaveBeenCalledTimes(1);
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });
});
