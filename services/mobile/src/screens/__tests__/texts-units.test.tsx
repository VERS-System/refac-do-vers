/**
 * Travas transversais de textos e unidades (Task 13, lote 13e).
 *
 * Existe para travar o decidido em 16/10/2026 (regra 11): telas mantêm os
 * títulos em inglês do mockup (chips do Viber por decisão 11e, cards da
 * Home/Bateria e Auth inalterados); unidades (Wh), datas UTC e timezone são
 * exibidos crus, sem conversão no cliente. Nada é buscado ou calculado
 * aqui; qualquer tradução futura exige nova decisão e plano próprio.
 */

import { render } from '@testing-library/react-native';
import { BatteryScreen } from '../BatteryScreen';
import { HistoryScreen } from '../HistoryScreen';
import { HomeScreen } from '../HomeScreen';
import { LoginScreen } from '../LoginScreen';
import { SupportScreen } from '../SupportScreen';
import { TestsScreen } from '../TestsScreen';

describe('textos e unidades (13e)', () => {
  /** Home mantém os títulos em inglês do mockup. */
  it('mantém títulos em inglês na Home', () => {
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Battery usage')).toBeTruthy();
    expect(getByText('Money economy')).toBeTruthy();
  });

  /** Bateria mantém os títulos em inglês do mockup. */
  it('mantém títulos em inglês na Bateria', () => {
    const { getByText } = render(<BatteryScreen />);

    expect(getByText('MONTHLY RECORD')).toBeTruthy();
    expect(getByText('Today')).toBeTruthy();
  });

  /** Login mantém os rótulos em inglês. */
  it('mantém rótulos em inglês no Login', () => {
    const { getByLabelText, getByRole } = render(<LoginScreen />);

    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    expect(getByRole('button', { name: 'Login' })).toBeTruthy();
  });

  /** Unidades e timezone saem crus do contrato, sem conversão. */
  it('preserva unidades e timezone crus', () => {
    const { getByText } = render(
      <HistoryScreen
        summary={{
          dateLabel: '2025-04-24',
          energyUnit: 'Wh',
          qualityLabel: 'dados parciais',
          recoveredEnergyWh: 12.5,
        }}
        timeZone="America/Sao_Paulo"
      />,
    );

    expect(getByText('12.5 Wh')).toBeTruthy();
    expect(getByText('Fuso horário: America/Sao_Paulo')).toBeTruthy();
  });

  /** Datas UTC do suporte saem cruas, sem conversão. */
  it('preserva datas UTC cruas no Suporte', () => {
    const { getByText } = render(
      <SupportScreen
        selectedRequest={{
          createdAt: '2026-10-01T10:00:00.000Z',
          id: 'r1',
          installationId: null,
          reason: 'Barulho estranho.',
          status: 'OPEN',
          updatedAt: '2026-10-02T10:00:00.000Z',
          vehicleId: null,
        }}
      />,
    );

    expect(getByText('2026-10-01T10:00:00.000Z')).toBeTruthy();
    expect(getByText('2026-10-02T10:00:00.000Z')).toBeTruthy();
  });

  /** Período dos testes sai cru, sem reinterpretar com data local. */
  it('preserva período cru nos Testes', () => {
    const { getByText } = render(
      <TestsScreen
        items={[
          {
            id: 't1',
            name: 'Asfalto seco',
            periodLabel: '14/03/2026 12:00 UTC',
            status: 'COMPLETED',
          },
        ]}
      />,
    );

    expect(getByText('14/03/2026 12:00 UTC')).toBeTruthy();
  });
});
