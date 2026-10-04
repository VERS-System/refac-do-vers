/**
 * Testes unitários da tela de perfil (Task 09, lotes 09a–09d).
 *
 * Existe para travar o scaffold visual, a rota na aba profile, os dados em
 * leitura, a edição e os estados: título, vazio, nome, email, avatar, modo
 * de edição e estados visuais, sem rede, cálculo ou persistência. Os dados
 * chegam por props (fixtures até F01/F05); só `displayName` é enviado;
 * papéis, permissões e encerramento de sessão pertencem ao backend.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { ProfileScreen } from '../ProfileScreen';

describe('ProfileScreen (09a)', () => {
  /** Apresenta título e vazio inicial na aba profile. */
  it('apresenta título e vazio inicial', () => {
    const { getByTestId, getByText } = render(<ProfileScreen />);

    expect(getByTestId('profile-screen')).toBeTruthy();
    expect(getByText('Perfil')).toBeTruthy();
    expect(getByTestId('profile-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<ProfileScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileScreen leitura (09b)', () => {
  const PROFILE = {
    avatarUrl: 'https://exemplo.com/ana.png',
    displayName: 'Anna Newman',
    email: 'anna@vers.com',
  };

  /** Exibe foto, nome e email crus e esconde o vazio. */
  it('exibe os dados quando informados', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <ProfileScreen profile={PROFILE} />,
    );

    expect(getByTestId('profile-data')).toBeTruthy();
    expect(getByTestId('profile-avatar-image')).toBeTruthy();
    expect(getByText('Anna Newman')).toBeTruthy();
    expect(getByText('anna@vers.com')).toBeTruthy();
    expect(queryByTestId('profile-empty')).toBeNull();
  });

  /** Exibe iniciais sem foto. */
  it('exibe iniciais sem foto', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <ProfileScreen profile={{ displayName: 'Anna Newman', email: 'anna@vers.com' }} />,
    );

    expect(getByTestId('profile-avatar-initials')).toBeTruthy();
    expect(getByText('AN')).toBeTruthy();
    expect(queryByTestId('profile-avatar-image')).toBeNull();
  });

  /** Exibe placeholder neutro sem nome sem parecer falha. */
  it('exibe placeholder neutro sem nome', () => {
    const { getByText } = render(
      <ProfileScreen profile={{ email: 'anna@vers.com' }} />,
    );

    expect(getByText('Sem nome definido')).toBeTruthy();
  });
});

describe('ProfileScreen edição (09c)', () => {
  const PROFILE = { displayName: 'Anna Newman', email: 'anna@vers.com' };

  /** Abre o modo de edição com o nome atual no rascunho. */
  it('abre a edição ao acionar Editar', () => {
    const onEdit = jest.fn();
    const { getByDisplayValue, getByRole } = render(
      <ProfileScreen onEdit={onEdit} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Editar perfil' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(getByDisplayValue('Anna Newman')).toBeTruthy();
  });

  /** Salva repassando só o displayName, sem email ou avatar. */
  it('salva repassando só o displayName', () => {
    const onSave = jest.fn();
    const { getByLabelText, getByRole } = render(
      <ProfileScreen editing onSave={onSave} profile={PROFILE} />,
    );

    fireEvent.changeText(getByLabelText('Nome'), 'Anna Silva');
    fireEvent.press(getByRole('button', { name: 'Salvar perfil' }));

    expect(onSave).toHaveBeenCalledWith('Anna Silva');
    expect(onSave).not.toHaveBeenCalledWith(expect.objectContaining({ email: expect.anything() }));
  });

  /** Cancela sem salvar e avisa o chamador. */
  it('cancela a edição sem salvar', () => {
    const onCancelEdit = jest.fn();
    const onSave = jest.fn();
    const { getByRole } = render(
      <ProfileScreen editing onCancelEdit={onCancelEdit} onSave={onSave} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Cancelar edição' }));

    expect(onCancelEdit).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('ProfileScreen estados (09d)', () => {
  const PROFILE = { displayName: 'Anna Newman', email: 'anna@vers.com' };

  /** Exibe skeleton sem dados no carregamento. */
  it('exibe carregamento sem dados', () => {
    const { getByTestId, queryByTestId, queryByText } = render(
      <ProfileScreen profile={PROFILE} status="loading" />,
    );

    expect(getByTestId('profile-loading')).toBeTruthy();
    expect(queryByTestId('profile-data')).toBeNull();
    expect(queryByText('Anna Newman')).toBeNull();
  });

  /** Exibe erro com nova tentativa sem dados. */
  it('exibe erro e repete a carga ao tentar de novo', () => {
    const onRetry = jest.fn();
    const { getByRole, getByTestId, queryByTestId } = render(
      <ProfileScreen onRetry={onRetry} profile={PROFILE} status="error" />,
    );

    expect(getByTestId('profile-error')).toBeTruthy();
    expect(queryByTestId('profile-data')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /** Representa a expiração no padrão do Login com retorno. */
  it('exibe sessão expirada com retorno ao Login', () => {
    const onOpenLogin = jest.fn();
    const { getByRole, getByTestId } = render(
      <ProfileScreen onOpenLogin={onOpenLogin} status="sessionExpired" />,
    );

    expect(getByTestId('profile-session-expired')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Ir para o Login' }));
    expect(onOpenLogin).toHaveBeenCalledTimes(1);
  });

  /** Mantém o rascunho ao voltar do erro. */
  it('mantém o rascunho ao voltar do erro', () => {
    const { getByDisplayValue, rerender } = render(
      <ProfileScreen draftName="Anna Silva" editing profile={PROFILE} status="error" />,
    );

    rerender(<ProfileScreen draftName="Anna Silva" editing profile={PROFILE} status="success" />);

    expect(getByDisplayValue('Anna Silva')).toBeTruthy();
  });
});

describe('ProfileScreen atalhos (09e)', () => {
  const PROFILE = { displayName: 'Anna Newman', email: 'anna@vers.com' };

  /** Abre os veículos por callback puro. */
  it('abre os veículos ao acionar o atalho', () => {
    const onOpenVehicles = jest.fn();
    const { getByRole } = render(
      <ProfileScreen onOpenVehicles={onOpenVehicles} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Meus veículos' }));

    expect(onOpenVehicles).toHaveBeenCalledTimes(1);
  });

  /** Abre o suporte por callback puro. */
  it('abre o suporte ao acionar o atalho', () => {
    const onOpenSupport = jest.fn();
    const { getByRole } = render(
      <ProfileScreen onOpenSupport={onOpenSupport} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Ajuda e suporte' }));

    expect(onOpenSupport).toHaveBeenCalledTimes(1);
  });

  /** Omite os atalhos sem callbacks sem quebrar o layout. */
  it('omite os atalhos sem callbacks', () => {
    const { getByTestId, queryByRole } = render(<ProfileScreen profile={PROFILE} />);

    expect(getByTestId('profile-data')).toBeTruthy();
    expect(queryByRole('button', { name: 'Meus veículos' })).toBeNull();
    expect(queryByRole('button', { name: 'Ajuda e suporte' })).toBeNull();
  });
});
