// Confirma que a entrada do projeto registra o App local no Expo do mobile.
jest.mock('expo', () => ({ registerRootComponent: jest.fn() }));
jest.mock('./App', () => ({ __esModule: true, default: jest.fn() }));

import { registerRootComponent } from 'expo';
import App from './App';

describe('entrada do mobile', () => {
  it('registra o App local quando index.js é carregado', () => {
    require('./index');
    expect(registerRootComponent).toHaveBeenCalledTimes(1);
    expect(registerRootComponent).toHaveBeenCalledWith(App);
  });
});
