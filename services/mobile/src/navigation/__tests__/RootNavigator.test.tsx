/**
 * Testes unitários do navegador raiz do aplicativo VERS.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { RootNavigator } from '../RootNavigator';

describe('RootNavigator (Task 00 - Item 4b)', () => {
  /** Exibe a apresentação enquanto ela estiver visível. */
  it('renderiza a splash quando visível', () => {
    const { getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated={false} isSplashVisible onAuthenticated={jest.fn()} />,
    );

    expect(getByTestId('splash-screen')).toBeTruthy();
    expect(queryByTestId('login-screen')).toBeNull();
    expect(queryByTestId('home-screen')).toBeNull();
  });

  /** Exibe o fluxo público após a splash sem autenticação. */
  it('renderiza a autenticação após a splash', () => {
    const { getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated={false} isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    expect(getByTestId('login-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();
  });

  /** Exibe a área autenticada quando há sessão local. */
  it('renderiza a home quando autenticado', () => {
    const { getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    expect(getByTestId('home-screen')).toBeTruthy();
    expect(queryByTestId('login-screen')).toBeNull();
  });

  /** Troca para a bateria pela aba sem mudar a estrutura (05a). */
  it('renderiza a bateria ao trocar de aba', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Bateria' }));

    expect(getByTestId('battery-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();
  });

  /** Encaminha a autenticação sem decidir sessão. */
  it('repasa o login ao callback sem regra de sessão', () => {
    const onAuthenticated = jest.fn();
    const { getByLabelText, getByRole } = render(
      <RootNavigator isAuthenticated={false} isSplashVisible={false} onAuthenticated={onAuthenticated} />,
    );

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!');
    fireEvent.press(getByRole('button', { name: 'Login' }));

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });
});
