/**
 * Testes do card de KPI (rótulo, valor em Geist Mono e unidade).
 */

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { KpiCard, valorContado } from './KpiCard';
import { Badge } from './Badge';

describe('KpiCard — movimento (Fase 5)', () => {
  /** O brilho dourado (SpotlightCard) acompanha o cursor dentro do card. */
  it('leva o brilho até o cursor', () => {
    render(<KpiCard label="Potência instantânea" value="212" unit="mW" />);
    const regiao = screen.getByRole('region', { name: 'Potência instantânea' });

    fireEvent.pointerMove(regiao, { clientX: 40, clientY: 24 });

    expect(regiao).toHaveClass('spotlight');
    // No hover o card sobe 2 px (Fase 5).
    expect(regiao).toHaveClass('hover:-translate-y-0.5');
    expect(regiao.style.getPropertyValue('--spot-x')).toBe('40px');
    expect(regiao.style.getPropertyValue('--spot-y')).toBe('24px');
  });

  /** Com `contagem`, o valor é um número contado e formatado pelo próprio card. */
  it('conta o valor numérico', () => {
    render(
      <KpiCard
        label="Bateria do sistema"
        contagem={{ numero: 68, formatar: (n) => String(Math.round(n)) }}
        unit="%"
      />,
    );

    const regiao = screen.getByRole('region', { name: 'Bateria do sistema' });
    expect(within(regiao).getByText('68')).toBeInTheDocument();
    expect(within(regiao).getByText('%')).toBeInTheDocument();
  });

  /** Sem número (dado ausente), o card mostra o traço em vez de contar. */
  it('não conta valor ausente', () => {
    const formatar = (n: number) => String(n);

    expect(valorContado(null, formatar)).toEqual({ value: '–' });
    expect(valorContado(53.5, formatar)).toEqual({ contagem: { numero: 53.5, formatar } });
  });
});

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

  /** Sem valor (carregando ou erro), o card mantém o rótulo e mostra só o conteúdo. */
  it('funciona sem valor', () => {
    render(
      <KpiCard label="Potência instantânea" unit="mW">
        <span>carregando</span>
      </KpiCard>,
    );

    const regiao = screen.getByRole('region', { name: 'Potência instantânea' });
    expect(within(regiao).getByText('carregando')).toBeInTheDocument();
    expect(within(regiao).queryByText('mW')).not.toBeInTheDocument();
  });
});
