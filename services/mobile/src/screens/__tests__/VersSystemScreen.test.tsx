/**
 * Testes unitários da tela do sistema VERS (Task 07, lotes 07a–07c).
 *
 * Existe para travar o scaffold visual, a identificação da instalação e a
 * configuração ativa: título, aba vers ativa, vazio inicial e cards com
 * valores crus do contrato, sem rede, cálculo ou persistência. Os dados
 * chegam por props (fixtures até F01/F05); ausências nunca viram zero e
 * nenhum segredo (deviceUid, MQTT, tópicos, série) é exibido.
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
