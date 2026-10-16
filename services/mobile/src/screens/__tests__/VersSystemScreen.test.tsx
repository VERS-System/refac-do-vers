/**
 * Testes unitários da tela do sistema VERS (Task 07, lotes 07a–07g).
 *
 * Existe para travar o scaffold visual, a identificação da instalação, a
 * configuração ativa, o dispositivo público, os estados, os atalhos e a
 * acessibilidade: título, aba vers ativa, vazio inicial e cards com valores
 * crus do contrato, sem rede, cálculo ou persistência. Os dados chegam por
 * props (fixtures até F01/F05); ausências nunca viram zero e nenhum segredo
 * (deviceUid, MQTT, tópicos, série) é exibido.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { VersSystemScreen } from '../VersSystemScreen';

describe('VersSystemScreen (07a)', () => {
  /** Apresenta título, subtítulo e vazio inicial na aba vers. */
  it('apresenta título e vazio inicial', () => {
    const { getByTestId, getByText } = render(<VersSystemScreen />);

    expect(getByTestId('vers-system-screen')).toBeTruthy();
    expect(getByText('Sistema VERS')).toBeTruthy();
    expect(getByTestId('vers-empty')).toBeTruthy();
  });

  /** Volta ao fluxo anterior por callback puro, sem regra de navegação interna. */
  it('volta ao acionar o botão voltar', () => {
    const onBack = jest.fn();
    const { getByRole } = render(<VersSystemScreen onBack={onBack} />);

    fireEvent.press(getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('VersSystemScreen identificação (07b)', () => {
  const INSTALLATION = {
    installedAt: '2026-03-14T12:00:00.000Z',
    status: 'ACTIVE' as const,
    systemModel: 'VERS Urban v1',
  };

  /** Exibe o card com modelo, status e data crus e esconde o vazio. */
  it('exibe a identificação quando informada', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <VersSystemScreen installation={INSTALLATION} />,
    );

    expect(getByTestId('vers-installation')).toBeTruthy();
    expect(getByText('VERS Urban v1')).toBeTruthy();
    expect(getByText('Ativo')).toBeTruthy();
    expect(getByText('2026-03-14T12:00:00.000Z')).toBeTruthy();
    expect(queryByTestId('vers-empty')).toBeNull();
  });

  /** Traduz cada status público sem expor o código cru. */
  it.each([
    ['ACTIVE', 'Ativo'],
    ['MAINTENANCE', 'Em manutenção'],
    ['INACTIVE', 'Inativo'],
    ['FAULT', 'Falha'],
  ] as const)('traduz o status %s como %s', (status, label) => {
    const { getByText } = render(
      <VersSystemScreen installation={{ ...INSTALLATION, status }} />,
    );

    expect(getByText(label)).toBeTruthy();
  });

  /** Omite linhas ausentes sem inventar valor e mantém o card. */
  it('omite campos ausentes sem inventar valor', () => {
    const { getByTestId, queryByText } = render(
      <VersSystemScreen installation={{ status: 'ACTIVE' }} />,
    );

    expect(getByTestId('vers-installation')).toBeTruthy();
    expect(queryByText('VERS Urban v1')).toBeNull();
    expect(queryByText('2026-03-14T12:00:00.000Z')).toBeNull();
  });
});

describe('VersSystemScreen configuração ativa (07c)', () => {
  const CONFIGURATION = {
    activePiezoCount: 12,
    installationPoint: 'Amortecedor traseiro',
    name: 'Montagem padrão',
    piezoAssociation: 'SERIES' as const,
    storageType: 'BATTERY' as const,
    version: 3,
  };

  /** Exibe o bloco com piezos, associação, ponto, armazenamento e versão. */
  it('exibe a configuração quando informada', () => {
    const { getByTestId, getByText } = render(
      <VersSystemScreen configuration={CONFIGURATION} installation={{ status: 'ACTIVE' }} />,
    );

    expect(getByTestId('vers-configuration')).toBeTruthy();
    expect(getByText('12 piezos')).toBeTruthy();
    expect(getByText('Série')).toBeTruthy();
    expect(getByText('Amortecedor traseiro')).toBeTruthy();
    expect(getByText('Bateria')).toBeTruthy();
    expect(getByText('v3')).toBeTruthy();
  });

  /** Omite o bloco sem configuração sem parecer falha. */
  it('omite o bloco sem configuração', () => {
    const { getByTestId, queryByTestId } = render(
      <VersSystemScreen installation={{ status: 'ACTIVE' }} />,
    );

    expect(getByTestId('vers-installation')).toBeTruthy();
    expect(queryByTestId('vers-configuration')).toBeNull();
  });

  /** Omite linhas ausentes sem inventar valor e mantém o bloco. */
  it('omite campos ausentes da configuração sem inventar valor', () => {
    const { getByTestId, queryByText } = render(
      <VersSystemScreen
        configuration={{ activePiezoCount: 12 }}
        installation={{ status: 'ACTIVE' }}
      />,
    );

    expect(getByTestId('vers-configuration')).toBeTruthy();
    expect(queryByText('Série')).toBeNull();
    expect(queryByText('Amortecedor traseiro')).toBeNull();
  });
});

describe('VersSystemScreen dispositivo público (07d)', () => {
  const DEVICE = {
    firmwareVersion: 'v2.4.1',
    lastSeenAt: '2026-03-14T12:00:00.000Z',
    name: 'ESP32 garagem',
    status: 'ONLINE' as const,
  };

  /** Exibe o bloco com metadados públicos e esconde segredos. */
  it('exibe o dispositivo quando informado', () => {
    const { getByTestId, getByText, queryByText } = render(
      <VersSystemScreen device={DEVICE} installation={{ status: 'ACTIVE' }} />,
    );

    expect(getByTestId('vers-device')).toBeTruthy();
    expect(getByText('ESP32 garagem')).toBeTruthy();
    expect(getByText('v2.4.1')).toBeTruthy();
    expect(getByText('Online')).toBeTruthy();
    expect(getByText('2026-03-14T12:00:00.000Z')).toBeTruthy();
    expect(queryByText('device-uid-123')).toBeNull();
  });

  /** Omite o bloco sem dispositivo sem parecer falha. */
  it('omite o bloco sem dispositivo', () => {
    const { getByTestId, queryByTestId } = render(
      <VersSystemScreen installation={{ status: 'ACTIVE' }} />,
    );

    expect(getByTestId('vers-installation')).toBeTruthy();
    expect(queryByTestId('vers-device')).toBeNull();
  });

  /** Omite linhas ausentes sem inventar valor e mantém o bloco. */
  it('omite campos ausentes do dispositivo sem inventar valor', () => {
    const { getByTestId, getByText, queryByText } = render(
      <VersSystemScreen
        device={{ status: 'OFFLINE' }}
        installation={{ status: 'ACTIVE' }}
      />,
    );

    expect(getByTestId('vers-device')).toBeTruthy();
    expect(getByText('Offline')).toBeTruthy();
    expect(queryByText('ESP32 garagem')).toBeNull();
  });
});

describe('VersSystemScreen estados (07e)', () => {
  const INSTALLATION = { status: 'ACTIVE' as const, systemModel: 'VERS Urban v1' };

  /** Exibe skeleton sem números no carregamento. */
  it('exibe carregamento sem conteúdo', () => {
    const { getByTestId, queryByTestId, queryByText } = render(
      <VersSystemScreen installation={INSTALLATION} status="loading" />,
    );

    expect(getByTestId('vers-loading')).toBeTruthy();
    expect(queryByTestId('vers-installation')).toBeNull();
    expect(queryByText('VERS Urban v1')).toBeNull();
  });

  /** Exibe vazio neutro sem parecer falha. */
  it('exibe vazio sem instalação', () => {
    const { getByTestId } = render(<VersSystemScreen status="empty" />);

    expect(getByTestId('vers-empty')).toBeTruthy();
  });

  /** Mantém o conteúdo com aviso na manutenção. */
  it('mantém o conteúdo com aviso na manutenção', () => {
    const { getByTestId, getByText } = render(
      <VersSystemScreen installation={{ ...INSTALLATION, status: 'MAINTENANCE' }} />,
    );

    expect(getByTestId('vers-installation')).toBeTruthy();
    expect(getByTestId('vers-warning')).toBeTruthy();
    expect(getByText('Em manutenção')).toBeTruthy();
  });

  /** Exibe erro com nova tentativa sem conteúdo. */
  it('exibe erro e repete a carga ao tentar de novo', () => {
    const onRetry = jest.fn();
    const { getByRole, getByTestId, queryByTestId } = render(
      <VersSystemScreen installation={INSTALLATION} onRetry={onRetry} status="error" />,
    );

    expect(getByTestId('vers-error')).toBeTruthy();
    expect(queryByTestId('vers-installation')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('VersSystemScreen atalhos (07f)', () => {
  const INSTALLATION = { status: 'ACTIVE' as const, systemModel: 'VERS Urban v1' };

  /** Abre os testes relacionados por callback puro. */
  it('abre os testes ao acionar VER TESTES', () => {
    const onOpenTests = jest.fn();
    const { getByRole } = render(
      <VersSystemScreen installation={INSTALLATION} onOpenTests={onOpenTests} />,
    );

    fireEvent.press(getByRole('button', { name: 'Ver testes do sistema' }));

    expect(onOpenTests).toHaveBeenCalledTimes(1);
  });

  /** Abre a revisão por callback puro. */
  it('abre a revisão ao acionar SOLICITAR REVISÃO', () => {
    const onOpenSupport = jest.fn();
    const { getByRole } = render(
      <VersSystemScreen installation={INSTALLATION} onOpenSupport={onOpenSupport} />,
    );

    fireEvent.press(getByRole('button', { name: 'Solicitar revisão do sistema' }));

    expect(onOpenSupport).toHaveBeenCalledTimes(1);
  });

  /** Omite os atalhos sem callbacks sem quebrar o layout. */
  it('omite os atalhos sem callbacks', () => {
    const { getByTestId, queryByRole } = render(
      <VersSystemScreen installation={INSTALLATION} />,
    );

    expect(getByTestId('vers-installation')).toBeTruthy();
    expect(queryByRole('button', { name: 'Ver testes do sistema' })).toBeNull();
    expect(queryByRole('button', { name: 'Solicitar revisão do sistema' })).toBeNull();
  });
});

describe('VersSystemScreen acessibilidade (07g)', () => {
  /** Expõe nome+papel em todos os botões: voltar, atalhos e abas. */
  it('expõe nome acessível em botões e atalhos', () => {
    const { getAllByRole } = render(
      <VersSystemScreen
        configuration={{ activePiezoCount: 12 }}
        device={{ status: 'ONLINE' }}
        installation={{ status: 'ACTIVE', systemModel: 'VERS Urban v1' }}
        onBack={jest.fn()}
        onOpenSupport={jest.fn()}
        onOpenTests={jest.fn()}
      />,
    );

    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(7);

    for (const button of buttons) {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  /** Informa a aba vers selecionada ao leitor de tela. */
  it('informa a aba vers selecionada ao leitor de tela', () => {
    const { getByRole } = render(
      <VersSystemScreen installation={{ status: 'ACTIVE' }} />,
    );

    expect(
      getByRole('button', { name: 'VERS' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      getByRole('button', { name: 'Início' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });
});

describe('VersSystemScreen selo de amostra (13c)', () => {
  /** Exibe o selo enquanto houver fixtures e omite com dados reais. */
  it('exibe selo de amostra e omite com dados reais', () => {
    const { getByTestId, queryByTestId, rerender } = render(<VersSystemScreen />);

    expect(getByTestId('vers-system-sample-seal')).toBeTruthy();

    rerender(<VersSystemScreen isSampleData={false} />);

    expect(queryByTestId('vers-system-sample-seal')).toBeNull();
  });
});
