/**
 * Testes do card de gráfico (título, subtítulo, legenda e área do gráfico).
 */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ChartCard } from './ChartCard';

describe('ChartCard', () => {
  /** É uma região nomeada pelo título, com o subtítulo e o gráfico dentro. */
  it('mostra título, subtítulo e conteúdo numa região nomeada', () => {
    render(
      <ChartCard title="Energia recuperada x consumo" subtitle="Ciclo diário 00h às 24h">
        <div>gráfico</div>
      </ChartCard>,
    );

    const regiao = screen.getByRole('region', { name: 'Energia recuperada x consumo' });
    expect(within(regiao).getByRole('heading', { name: 'Energia recuperada x consumo' })).toBeInTheDocument();
    expect(within(regiao).getByText('Ciclo diário 00h às 24h')).toBeInTheDocument();
    expect(within(regiao).getByText('gráfico')).toBeInTheDocument();
  });

  /** A legenda lista as séries com o nome de cada uma. */
  it('lista as séries da legenda', () => {
    render(
      <ChartCard
        title="Energia recuperada x consumo"
        legend={[
          { label: 'Recuperada (mW)', color: 'var(--color-chart-1)' },
          { label: 'Consumo nó (mW)', color: 'var(--color-chart-3)' },
        ]}
      >
        <div />
      </ChartCard>,
    );

    const legenda = screen.getByRole('list', { name: 'Legenda' });
    expect(within(legenda).getAllByRole('listitem')).toHaveLength(2);
    expect(within(legenda).getByText('Recuperada (mW)')).toBeInTheDocument();
  });

  /** Ações extras (como um seletor) aparecem no cabeçalho. */
  it('mostra ações no cabeçalho', () => {
    render(
      <ChartCard title="Vibração RMS" actions={<button type="button">Eixo Z</button>}>
        <div />
      </ChartCard>,
    );

    expect(screen.getByRole('button', { name: 'Eixo Z' })).toBeInTheDocument();
  });
});
