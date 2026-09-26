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

  /** Garante visibilidade independente da senha e da confirmação (03b). */
  it('alterna a visibilidade da senha e da confirmação', () => {
    const { getByLabelText, getByRole } = render(<RegisterScreen />);

    expect(getByLabelText('Password').props.secureTextEntry).toBe(true);
    expect(getByLabelText('Confirm Password').props.secureTextEntry).toBe(true);

    fireEvent.press(getByRole('button', { name: 'Mostrar senha' }));
    expect(getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(getByLabelText('Confirm Password').props.secureTextEntry).toBe(true);

    fireEvent.press(getByRole('button', { name: 'Mostrar confirmação' }));
    expect(getByLabelText('Confirm Password').props.secureTextEntry).toBe(false);

    fireEvent.press(getByRole('button', { name: 'Ocultar senha' }));
    expect(getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  /** Garante o envio: indicador, botão desabilitado e sem reenvio (03c). */
  it('exibe carregamento e bloqueia reenvio durante o envio', () => {
    const onRegister = jest.fn();
    const { getByLabelText, getByRole } = render(
      <RegisterScreen onRegister={onRegister} status="sending" />,
    );

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!');
    fireEvent.changeText(getByLabelText('Confirm Password'), 'Password123!');

    expect(getByRole('button', { name: 'Sign up' }).props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(getByLabelText('Enviando')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Sign up' }));
    expect(onRegister).not.toHaveBeenCalled();
  });

  /** Garante conflito de email com campos preservados e reenvio (03d). */
  it('exibe conflito e permite corrigir e reenviar', () => {
    const onRegister = jest.fn();
    const { getByLabelText, getByRole } = render(
      <RegisterScreen onRegister={onRegister} status="conflict" />,
    );

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!');
    fireEvent.changeText(getByLabelText('Confirm Password'), 'Password123!');

    expect(
      getByRole('alert', { name: 'Este email já está em uso. Entre ou use outro email.' }),
    ).toBeTruthy();
    expect(getByLabelText('Email').props.value).toBe('anna@vers.com');

    fireEvent.press(getByRole('button', { name: 'Sign up' }));
    expect(onRegister).toHaveBeenCalledWith({
      email: 'anna@vers.com',
      password: 'Password123!',
    });
  });

  /** Garante erro genérico distinto do conflito, com reenvio (03e). */
  it('exibe erro genérico preservando os campos', () => {
    const onRegister = jest.fn();
    const { getByLabelText, getByRole, queryByRole } = render(
      <RegisterScreen onRegister={onRegister} status="genericError" />,
    );

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!');
    fireEvent.changeText(getByLabelText('Confirm Password'), 'Password123!');

    expect(
      getByRole('alert', { name: 'Não foi possível criar a conta. Tente novamente.' }),
    ).toBeTruthy();
    expect(
      queryByRole('alert', { name: 'Este email já está em uso. Entre ou use outro email.' }),
    ).toBeNull();
    expect(getByLabelText('Email').props.value).toBe('anna@vers.com');

    fireEvent.press(getByRole('button', { name: 'Sign up' }));
    expect(onRegister).toHaveBeenCalledTimes(1);
  });
});
