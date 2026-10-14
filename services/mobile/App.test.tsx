/**
 * Testes unitários do fluxo inicial do aplicativo mobile.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  /** Garante que o aplicativo avance da apresentação para a tela de Login. */
  it('troca a Splash pelo Login após o tempo de apresentação', async () => {
    const { getByTestId, queryByTestId } = render(<App />);

    expect(getByTestId('splash-screen')).toBeTruthy();

    await waitFor(() => expect(queryByTestId('splash-screen')).toBeNull(), {
      timeout: 2500,
    });
    expect(getByTestId('login-screen')).toBeTruthy();
  });

  /** Valida a navegação de ida e volta entre Login e Cadastro. */
  it('navega do Login para o Cadastro e retorna', async () => {
    const { getByRole, getByTestId } = render(<App />);

    await waitFor(() => expect(getByTestId('login-screen')).toBeTruthy(), {
      timeout: 2500,
    });

    fireEvent.press(getByRole('button', { name: 'Criar uma conta' }));
    expect(getByTestId('register-screen')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Voltar para o Login' }));
    expect(getByTestId('login-screen')).toBeTruthy();
  });

  /** Abre a Home local depois que o formulário de Login é enviado. */
  it('avança do Login para a Home', async () => {
    const { getByLabelText, getByRole, getByTestId } = render(<App />);

    await waitFor(() => expect(getByTestId('login-screen')).toBeTruthy(), {
      timeout: 2500,
    });

    fireEvent.changeText(getByLabelText('Email'), 'anna@vers.com');
    fireEvent.changeText(getByLabelText('Password'), 'Password123!');
    fireEvent.press(getByRole('button', { name: 'Login' }));

    expect(getByTestId('home-screen')).toBeTruthy();
  });
});