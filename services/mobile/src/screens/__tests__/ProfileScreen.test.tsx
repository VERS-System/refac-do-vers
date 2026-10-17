/**
 * Testes unitários da tela de perfil (Task 09, lotes 09a–09g).
 *
 * Existe para travar o scaffold visual, a rota na aba profile, os dados em
 * leitura, a edição, os estados, os atalhos, a saída e a acessibilidade:
 * título, vazio, nome, email, avatar, modo de edição, confirmação de saída
 * e callbacks, sem rede, cálculo ou persistência. Os dados chegam por props
 * (fixtures até F01/F05); só `displayName` é enviado; o encerramento efetivo
 * pertence ao backend.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { theme } from '../../constants/theme';
import { ProfileScreen } from '../ProfileScreen';

describe('ProfileScreen (09a)', () => {
  /** Apresenta vazio inicial na aba profile, sem barra de título (R1). */
  it('apresenta vazio inicial sem barra de título', () => {
    const { getByTestId, queryByTestId } = render(<ProfileScreen />);

    expect(getByTestId('profile-screen')).toBeTruthy();
    expect(getByTestId('profile-empty')).toBeTruthy();
    expect(queryByTestId('profile-header')).toBeNull();
  });
});

describe('ProfileScreen leitura (09b)', () => {
  const PROFILE = {
    avatarUrl: 'https://exemplo.com/ana.png',
    displayName: 'Anna Newman',
    email: 'anna@vers.com',
  };

  /** Exibe foto e nome crus e esconde o vazio (R1, sem email). */
  it('exibe os dados quando informados', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <ProfileScreen profile={PROFILE} />,
    );

    expect(getByTestId('profile-data')).toBeTruthy();
    expect(getByTestId('profile-avatar-image')).toBeTruthy();
    expect(getByText('Anna Newman')).toBeTruthy();
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

    fireEvent.press(getByRole('button', { name: 'Editar informações de usuário' }));

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

describe('ProfileScreen atalhos (09e, itens R2)', () => {
  const PROFILE = { displayName: 'Anna Newman', email: 'anna@vers.com' };

  /** Abre os veículos por callback puro. */
  it('abre os veículos ao acionar o atalho', () => {
    const onOpenVehicles = jest.fn();
    const { getByRole } = render(
      <ProfileScreen onOpenVehicles={onOpenVehicles} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Informações do carro' }));

    expect(onOpenVehicles).toHaveBeenCalledTimes(1);
  });

  /** Omite os itens do carro sem callbacks sem quebrar o layout. */
  it('omite os itens sem callbacks', () => {
    const { getByTestId, queryByRole } = render(<ProfileScreen profile={PROFILE} />);

    expect(getByTestId('profile-data')).toBeTruthy();
    expect(queryByRole('button', { name: 'Informações do carro' })).toBeNull();
    expect(queryByRole('button', { name: 'Informações de energia' })).toBeNull();
  });
});

describe('ProfileScreen sair (09f, popup R3+)', () => {
  const PROFILE = { displayName: 'Anna Newman', email: 'anna@vers.com' };

  /** Abre o popup de confirmação ao acionar SAIR. */
  it('abre o popup ao acionar SAIR', () => {
    const onRequestLogout = jest.fn();
    const { getByRole, getByText } = render(
      <ProfileScreen onRequestLogout={onRequestLogout} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sair' }));

    expect(onRequestLogout).toHaveBeenCalledTimes(1);
    expect(getByText('Deseja sair da conta?')).toBeTruthy();
    expect(getByRole('button', { name: 'Confirmar saída' })).toBeTruthy();
    expect(getByRole('button', { name: 'Cancelar saída' })).toBeTruthy();
  });

  /** Confirma a saída sem encerrar nada localmente. */
  it('confirma a saída sem encerrar localmente', () => {
    const onConfirmLogout = jest.fn();
    const { getByRole } = render(
      <ProfileScreen onConfirmLogout={onConfirmLogout} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sair' }));
    fireEvent.press(getByRole('button', { name: 'Confirmar saída' }));

    expect(onConfirmLogout).toHaveBeenCalledTimes(1);
  });

  /** Cancela a saída fechando o popup, sem confirmar. */
  it('cancela a saída sem confirmar', () => {
    const onCancelLogout = jest.fn();
    const onConfirmLogout = jest.fn();
    const { getByRole, queryByText } = render(
      <ProfileScreen onCancelLogout={onCancelLogout} onConfirmLogout={onConfirmLogout} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sair' }));
    fireEvent.press(getByRole('button', { name: 'Cancelar saída' }));

    expect(onCancelLogout).toHaveBeenCalledTimes(1);
    expect(onConfirmLogout).not.toHaveBeenCalled();
    expect(queryByText('Deseja sair da conta?')).toBeNull();
  });

  /** Toque no fundo escurecido cancela como o Cancelar. */
  it('cancela ao tocar no fundo do popup', () => {
    const onCancelLogout = jest.fn();
    const { getByRole, getByTestId } = render(
      <ProfileScreen onCancelLogout={onCancelLogout} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sair' }));
    fireEvent.press(getByTestId('profile-logout-backdrop'));

    expect(onCancelLogout).toHaveBeenCalledTimes(1);
  });

  /** Sair do popup sem fundo, só o texto vermelho. */
  it('mantém o sair do popup só em texto vermelho', () => {
    const { getByRole, getByText } = render(
      <ProfileScreen profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sair' }));

    expect(
      getByRole('button', { name: 'Confirmar saída' }).props.style.backgroundColor,
    ).toBeUndefined();
    expect(getByText('Sair').props.style.color).toBe(theme.colors.error);
  });

  /** Botões do popup em linhas separadas por divisor. */
  it('separa os botões do popup por linhas', () => {
    const { getAllByTestId, getByRole } = render(
      <ProfileScreen profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sair' }));

    expect(getAllByTestId('profile-logout-confirm-divider').length).toBeGreaterThanOrEqual(1);
  });

  /** Divisores da confirmação e das ações cortam o cartão ponta a ponta. */
  it('corta os divisores ponta a ponta sem margem', () => {
    const { getAllByTestId, getByRole, getByTestId } = render(
      <ProfileScreen profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sair' }));

    expect(getAllByTestId('profile-logout-confirm-divider').length).toBe(2);
    expect(getByTestId('profile-logout-confirm').props.style.padding).toBeUndefined();
  });

  /** Popup aberto: nome+papel em todos os botões e alvo de toque nas linhas. */
  it('expõe nome acessível e hitSlop no popup', () => {
    const { getAllByRole, getByRole } = render(
      <ProfileScreen profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Sair' }));

    for (const button of getAllByRole('button')) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }

    expect(
      getByRole('button', { name: 'Confirmar saída' }).props.hitSlop,
    ).toBeTruthy();
    expect(
      getByRole('button', { name: 'Cancelar saída' }).props.hitSlop,
    ).toBeTruthy();
  });
});

describe('ProfileScreen acessibilidade (09g)', () => {
  const PROFILE = { displayName: 'Anna Newman', email: 'anna@vers.com' };

  /** Expõe nome+papel em todos os botões: editar, atalhos, sair e abas (R1, sem voltar). */
  it('expõe nome acessível em botões e atalhos', () => {
    const { getAllByRole } = render(
      <ProfileScreen
        onOpenEnergy={jest.fn()}
        onOpenVehicles={jest.fn()}
        profile={PROFILE}
      />,
    );

    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(8);

    for (const button of buttons) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  /** Expõe nome+papel nos botões do modo de edição. */
  it('expõe nome acessível no modo de edição', () => {
    const { getByRole } = render(<ProfileScreen editing profile={PROFILE} />);

    expect(getByRole('button', { name: 'Salvar perfil' })).toBeTruthy();
    expect(getByRole('button', { name: 'Cancelar edição' })).toBeTruthy();
  });

  /** Informa a aba profile selecionada ao leitor de tela. */
  it('informa a aba profile selecionada ao leitor de tela', () => {
    const { getByRole } = render(<ProfileScreen profile={PROFILE} />);

    expect(
      getByRole('button', { name: 'Perfil' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      getByRole('button', { name: 'Início' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });
});

describe('ProfileScreen seções (R2)', () => {
  const PROFILE = { displayName: 'Anna Newman' };

  /** Exibe as seções Carro e Usuário em texto. */
  it('exibe as seções em texto', () => {
    const { getByText } = render(
      <ProfileScreen
        onOpenEnergy={jest.fn()}
        onOpenVehicles={jest.fn()}
        profile={PROFILE}
      />,
    );

    expect(getByText('Carro')).toBeTruthy();
    expect(getByText('Informações do carro')).toBeTruthy();
    expect(getByText('Informações de energia')).toBeTruthy();
    expect(getByText('Usuário')).toBeTruthy();
    expect(getByText('Editar informações de usuário')).toBeTruthy();
  });

  /** Abre os veículos pelas informações do carro. */
  it('abre os veículos pelas informações do carro', () => {
    const onOpenVehicles = jest.fn();
    const { getByRole } = render(
      <ProfileScreen onOpenVehicles={onOpenVehicles} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Informações do carro' }));

    expect(onOpenVehicles).toHaveBeenCalledTimes(1);
  });

  /** Abre a energia pela seção do carro. */
  it('abre a energia pelas informações de energia', () => {
    const onOpenEnergy = jest.fn();
    const { getByRole } = render(
      <ProfileScreen onOpenEnergy={onOpenEnergy} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Informações de energia' }));

    expect(onOpenEnergy).toHaveBeenCalledTimes(1);
  });

  /** Abre a edição pelas informações do usuário. */
  it('abre a edição pelas informações do usuário', () => {
    const onEdit = jest.fn();
    const { getByDisplayValue, getByRole } = render(
      <ProfileScreen onEdit={onEdit} profile={PROFILE} />,
    );

    fireEvent.press(getByRole('button', { name: 'Editar informações de usuário' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(getByDisplayValue('Anna Newman')).toBeTruthy();
  });
});

describe('ProfileScreen alinhamento (ajuste R2)', () => {
  const PROFILE = { displayName: 'Anna Newman' };

  /** Alinha títulos e itens à esquerda, direto na tela. */
  it('alinha seções à esquerda sem cartão', () => {
    const { getByTestId, getByText } = render(
      <ProfileScreen
        onOpenEnergy={jest.fn()}
        onOpenVehicles={jest.fn()}
        profile={PROFILE}
      />,
    );

    expect(getByTestId('profile-data').props.style.backgroundColor).toBeUndefined();
    expect(getByText('Carro').props.style.textAlign).toBe('left');
    expect(getByText('Informações do carro').props.style.textAlign).toBe('left');
    expect(getByText('Usuário').props.style.textAlign).toBe('left');
  });

  /** Hierarquia: respiro após o título, itens compactos. */
  it('separa títulos da lista e compacta os itens', () => {
    const { getByRole, getByText } = render(
      <ProfileScreen
        onOpenEnergy={jest.fn()}
        onOpenVehicles={jest.fn()}
        profile={PROFILE}
      />,
    );

    expect(getByText('Carro').props.style.marginBottom).toBe(12);
    expect(
      getByRole('button', { name: 'Informações do carro' }).props.style.paddingVertical,
    ).toBe(4);
  });

  /** Dourado só nos títulos e divisores; itens em branco. */
  it('restringe o dourado a títulos e divisores', () => {
    const { getAllByTestId, getByText } = render(
      <ProfileScreen
        onOpenEnergy={jest.fn()}
        onOpenVehicles={jest.fn()}
        profile={PROFILE}
      />,
    );

    expect(getByText('Carro').props.style.color).toBe(theme.colors.gold);
    expect(getByText('Usuário').props.style.color).toBe(theme.colors.gold);
    expect(getByText('Informações do carro').props.style.color).toBe(theme.colors.white);
    expect(getByText('Editar informações de usuário').props.style.color).toBe(
      theme.colors.white,
    );

    for (const divider of getAllByTestId('profile-section-divider')) {
      expect(divider.props.style.borderTopColor).toBe(theme.colors.gold);
    }
  });

  /** Sair em peso médio. */
  it('renderiza o sair em peso médio', () => {
    const { getByText } = render(<ProfileScreen profile={PROFILE} />);

    expect(getByText('SAIR').props.style.fontWeight).toBe('500');
  });

  /** Nome em branco e Sair em vermelho suave. */
  it('aplica branco no nome e vermelho no sair', () => {
    const { getByRole, getByText } = render(<ProfileScreen profile={PROFILE} />);

    expect(getByText('Anna Newman').props.style.color).toBe(theme.colors.white);

    const logout = getByRole('button', { name: 'Sair' });
    expect(logout.props.style.backgroundColor).toBe(theme.colors.errorSoft);
    expect(getByText('SAIR').props.style.color).toBe(theme.colors.error);
  });
});

describe('ProfileScreen reestilização (R1)', () => {
  const PROFILE = { displayName: 'Anna Newman', email: 'anna@vers.com' };

  /** Exibe o selo de admin quando informado e omite sem ele. */
  it('exibe selo de admin quando informado', () => {
    const { getByTestId, getByText, queryByTestId, rerender } = render(
      <ProfileScreen isAdmin profile={PROFILE} />,
    );

    expect(getByTestId('profile-admin-seal')).toBeTruthy();
    expect(getByText('Área do administrador')).toBeTruthy();

    rerender(<ProfileScreen profile={PROFILE} />);

    expect(queryByTestId('profile-admin-seal')).toBeNull();
  });

  /** Apresenta avatar com anel e nome sem barra de título. */
  it('apresenta avatar e nome sem barra de título', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <ProfileScreen
        profile={{ avatarUrl: 'https://exemplo.com/ana.png', displayName: 'Anna Newman' }}
      />,
    );

    expect(getByTestId('profile-avatar-ring')).toBeTruthy();
    expect(getByTestId('profile-avatar-image')).toBeTruthy();
    expect(getByText('Anna Newman')).toBeTruthy();
    expect(queryByTestId('profile-header')).toBeNull();
  });
});

describe('ProfileScreen modo de edição (R3)', () => {
  const PROFILE = { displayName: 'Anna Newman' };

  /** Respiro do bloco de edição igual ao divisor do modo visual. */
  it('aplica respiro ao bloco de edição', () => {
    const { getByTestId } = render(<ProfileScreen editing profile={PROFILE} />);

    expect(getByTestId('profile-edit-block').props.style.marginTop).toBe(16);
  });

  /** Cancelar vira ação de texto (sem pílula dourada) com alvo de toque. */
  it('renderiza cancelar como ação de texto', () => {
    const { getByRole, getByText } = render(
      <ProfileScreen editing profile={PROFILE} />,
    );

    expect(getByText('CANCELAR').props.style.color).toBe(theme.colors.white);
    expect(
      getByRole('button', { name: 'Cancelar edição' }).props.hitSlop,
    ).toBeTruthy();
  });

  /** Salvar segue o PrimaryButton dourado como ação principal. */
  it('mantém salvar como ação principal', () => {
    const { getByText } = render(<ProfileScreen editing profile={PROFILE} />);

    expect(getByText('SALVAR').props.style.color).toBe(theme.colors.background);
  });
});
