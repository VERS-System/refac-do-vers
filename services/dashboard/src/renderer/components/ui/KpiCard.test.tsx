/**
 * Testes do card de KPI (rótulo, valor em Geist Mono e unidade).
 */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { KpiCard } from './KpiCard';
import { Badge } from './Badge';

describe('KpiCard', () => {
  /** O card é uma região nomeada pelo rótulo, com valor e unidade dentro. */
  it('mostra rótulo, valor e unidade numa região nomeada', () => {
    render(<KpiCard label="Potência instantânea" value="212" unit="mW" />);

    const regiao = screen.getByRole('region', { name: 'Potência instantânea' });
    expect(within(regiao).getByText('212')).toBeInTheDocument();
    expect(within(regiao).getByText('mW')).toBeInTheDocument();
  });

  /** Badge e rodapé opcionais aparecem dentro do card. */
  it('mostra badge e rodapé quando informados', () => {
    render(
      <KpiCard
        label="Energia recuperada hoje"
        value="292"
        unit="mWh"
        badge={<Badge tone="success">+6,6% vs média semanal</Badge>}
      >
        <span>gráfico</span>
      </KpiCard>,
    );

    const regiao = screen.getByRole('region', { name: 'Energia recuperada hoje' });
    expect(within(regiao).getByText('+6,6% vs média semanal')).toBeInTheDocument();
    expect(within(regiao).getByText('gráfico')).toBeInTheDocument();
  });

  /** Sem unidade, só o valor é exibido. */
  it('funciona sem unidade', () => {
    render(<KpiCard label="Piezos ativos" value="6 / 8" />);

    expect(screen.getByText('6 / 8')).toBeInTheDocument();
  });
});
