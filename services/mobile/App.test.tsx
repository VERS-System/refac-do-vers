/**
 * Testes unitários do fluxo inicial do aplicativo mobile.
 */

import { act, render } from '@testing-library/react-native';
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
});
