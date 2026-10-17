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

  /** Abre o histórico pela bateria sem criar aba nova (06a). */
  it('abre o histórico pela bateria e volta sem mudar as abas', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Bateria' }));
    fireEvent.press(getByRole('button', { name: 'Ver histórico' }));

    expect(getByTestId('history-screen')).toBeTruthy();
    expect(queryByTestId('battery-screen')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(getByTestId('battery-screen')).toBeTruthy();
    expect(queryByTestId('history-screen')).toBeNull();
  });

  /** Abre o sistema VERS pela aba sem mudar a estrutura (07a). */
  it('renderiza o sistema VERS ao trocar para a aba vers', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'VERS' }));

    expect(getByTestId('vers-system-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();
  });

  /** Abre o sistema VERS pelo atalho da Home (07a). */
  it('abre o sistema VERS pelo atalho da Home', () => {
    const { getByRole, getByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Abrir sistema VERS' }));

    expect(getByTestId('vers-system-screen')).toBeTruthy();
  });

  /** Abre os testes pelo VERS sem criar aba nova (08a). */
  it('abre os testes pelo VERS e volta sem mudar as abas', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'VERS' }));
    fireEvent.press(getByRole('button', { name: 'Ver testes do sistema' }));

    expect(getByTestId('tests-screen')).toBeTruthy();
    expect(queryByTestId('vers-system-screen')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(getByTestId('vers-system-screen')).toBeTruthy();
    expect(queryByTestId('tests-screen')).toBeNull();
  });

  /** Renderiza o perfil ao trocar para a aba profile sem mudar a estrutura (09a). */
  it('renderiza o perfil ao trocar para a aba profile', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Perfil' }));

    expect(getByTestId('profile-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();
  });

  /** Abre os veículos pelo Perfil sem criar aba nova (10a). */
  it('abre os veículos pelo Perfil e volta sem mudar as abas', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Perfil' }));
    fireEvent.press(getByRole('button', { name: 'Informações do carro' }));

    expect(getByTestId('vehicles-screen')).toBeTruthy();
    expect(queryByTestId('profile-screen')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(getByTestId('profile-screen')).toBeTruthy();
    expect(queryByTestId('vehicles-screen')).toBeNull();
  });

  /** Abre o Viber pela Home sem criar aba nova (11a). */
  it('abre o Viber pela Home e volta sem mudar as abas', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Conversar com o Viber' }));

    expect(getByTestId('viber-screen')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(getByTestId('home-screen')).toBeTruthy();
    expect(queryByTestId('viber-screen')).toBeNull();
  });

  /** Abre a energia pelo Perfil trocando para a aba VERS (R2). */
  it('abre a energia pelo Perfil na aba VERS', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Perfil' }));
    fireEvent.press(getByRole('button', { name: 'Informações de energia' }));

    expect(getByTestId('vers-system-screen')).toBeTruthy();
    expect(queryByTestId('profile-screen')).toBeNull();
  });

  /** Abre o suporte pelo Sistema VERS sem criar aba nova (12a). */
  it('abre o suporte pelo Sistema VERS e volta sem mudar as abas', () => {
    const { getByRole, getByTestId, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'VERS' }));
    fireEvent.press(getByRole('button', { name: 'Solicitar revisão do sistema' }));

    expect(getByTestId('support-screen')).toBeTruthy();
    expect(queryByTestId('vers-system-screen')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(getByTestId('vers-system-screen')).toBeTruthy();
    expect(queryByTestId('support-screen')).toBeNull();
  });

  /** Exibe a fixture demo do perfil na rota sem backend (09b). */
  it('exibe os dados demo do perfil na rota', () => {
    const { getByRole, getByTestId, getByText, queryByTestId } = render(
      <RootNavigator isAuthenticated isSplashVisible={false} onAuthenticated={jest.fn()} />,
    );

    fireEvent.press(getByRole('button', { name: 'Perfil' }));

    expect(getByTestId('profile-data')).toBeTruthy();
    expect(getByText('Anna Newman')).toBeTruthy();
    expect(queryByTestId('profile-empty')).toBeNull();
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
