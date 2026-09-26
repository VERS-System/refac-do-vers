/**
 * Testes unitários do fluxo inicial do aplicativo mobile.
 */

import { act, fireEvent, render } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Garante que o aplicativo avance da apresentação para a tela de Login. */
  it('troca a Splash pelo Login após o tempo de apresentação', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    expect(getByTestId('splash-screen')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(queryByTestId('splash-screen')).toBeNull();
    expect(getByTestId('login-screen')).toBeTruthy();
  });

  /** Valida a navegação de ida e volta entre Login e Cadastro. */
  it('navega do Login para o Cadastro e retorna', () => {
    const { getByRole, getByTestId } = render(<App />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    fireEvent.press(getByRole('button', { name: 'Criar uma conta' }));
    expect(getByTestId('register-screen')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Voltar para o Login' }));
    expect(getByTestId('login-screen')).toBeTruthy();
  });

  /** Abre a Home local depois que o formulário de Login é enviado. */
  it('avança do Login para a Home', () => {
    const { getByLabelText, getByRole, getByTestId } = render(<App />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!');
    fireEvent.press(getByRole('button', { name: 'Login' }));

    expect(getByTestId('home-screen')).toBeTruthy();
  });
});
