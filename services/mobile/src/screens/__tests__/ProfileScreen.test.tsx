/**
 * Testes unitários da tela de perfil (Task 09, lotes 09a–09c).
 *
 * Existe para travar o scaffold visual, a rota na aba profile, os dados em
 * leitura e a edição: título, vazio, nome, email, avatar e modo de edição
 * com rascunho, sem rede, cálculo ou persistência. Os dados chegam por props
 * (fixtures até F01/F05); só `displayName` é enviado; papéis, permissões e
 * encerramento de sessão pertencem ao backend.
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
