/**
 * Testes unitários da tela de perfil (Task 09, lotes 09a–09b).
 *
 * Existe para travar o scaffold visual, a rota na aba profile e os dados em
 * leitura: título, vazio inicial, nome, email e avatar crus, sem rede,
 * cálculo ou persistência. Os dados chegam por props (fixtures até F01/F05);
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
