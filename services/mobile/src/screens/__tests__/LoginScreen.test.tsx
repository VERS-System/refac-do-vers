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

  /** Confirma que a abertura do cadastro dispara seu fluxo. */
  it('abre o cadastro ao pressionar o link de conta', () => {
    const onSignUp = jest.fn();
    const { getByRole } = render(<LoginScreen onSignUp={onSignUp} />);

    fireEvent.press(getByRole('button', { name: 'Criar uma conta' }));

    expect(onSignUp).toHaveBeenCalledTimes(1);
  });

  /** Garante que não há login social sem contrato aprovado (Task 02). */
  it('não exibe botão Google nem divisor social', () => {
    const { queryByRole, queryByText } = render(<LoginScreen />);

    expect(queryByRole('button', { name: 'Entrar com Google' })).toBeNull();
    expect(queryByText('OR')).toBeNull();
  });

  /** Garante que a senha começa oculta e pode ser exibida (Task 02b). */
  it('alterna a visibilidade da senha', () => {
    const { getByLabelText, getByRole } = render(<LoginScreen />);

    expect(getByLabelText('Password').props.secureTextEntry).toBe(true);

    fireEvent.press(getByRole('button', { name: 'Mostrar senha' }));
    expect(getByLabelText('Password').props.secureTextEntry).toBe(false);

    fireEvent.press(getByRole('button', { name: 'Ocultar senha' }));
    expect(getByLabelText('Password').props.secureTextEntry).toBe(true);
  });
});
