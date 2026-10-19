/**
 * Testes do fluxo de energia na Cadeia de conversão (Fase 5, lote 14):
 * pontos de luz correm do Ponto 1 ao Ponto 4, mais rápidos com mais potência
 * e mais fracos até a fração que chega ao celular; sem potência, param.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md` (seção 7).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';
import type { RepositorioVers } from '@/data/repositorio';
import { criarRepositorioMock } from '@/data/repositorioMock';
import { duracaoFluxo } from './CadeiaConversao';

/** Abre a Visão geral e devolve o trilho do fluxo da cadeia. */
async function trilho(repositorio?: RepositorioVers) {
  window.location.hash = '#/visao-geral';
  render(<App repositorio={repositorio} />);
  const cadeia = await screen.findByRole('region', { name: 'Cadeia de conversão' });
  await screen.findByText('Nó comum');
  return cadeia.querySelector<HTMLElement>('[data-slot="fluxo"]');
}

describe('duracaoFluxo', () => {
  /** Mais potência, volta mais rápida; entre 1,4 e 6 s; sem potência, parado. */
  it('acompanha a potência do Ponto 1', () => {
    expect(duracaoFluxo(212)).toBeCloseTo(2.83, 2);
    expect(duracaoFluxo(1000)).toBe(1.4);
    expect(duracaoFluxo(50)).toBe(6);
    expect(duracaoFluxo(0)).toBeNull();
    expect(duracaoFluxo(null)).toBeNull();
  });
});

describe('CadeiaConversao — valores contados', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Com movimento, tensão, corrente e potência contam até o valor, como os KPIs. */
  it('conta os valores de cada ponto', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })),
    );
    await trilho();

    const ponto1 = screen.getByRole('article', { name: 'Nó comum' });
    const finais = [...ponto1.querySelectorAll('dd .sr-only')].map((e) => e.textContent);
    expect(finais).toEqual(['4,82 V', '44 mA', '212 mW']);
  });
});

describe('CadeiaConversao — fluxo', () => {
  /** Trilho decorativo com um marcador por ponto e luzes no ritmo de P1. */
  it('mostra o fluxo da energia', async () => {
    const fluxo = await trilho();

    expect(fluxo).toHaveAttribute('aria-hidden', 'true');
    expect(fluxo?.querySelectorAll('[data-slot="marcador"]')).toHaveLength(4);
    expect(fluxo?.querySelectorAll('[data-slot="luz"]')).toHaveLength(3);
    expect(fluxo?.style.getPropertyValue('--duracao')).toBe('2.83s');
    // 115 mW chegam ao celular de 212 mW captados: a luz termina em 54%.
    expect(fluxo?.style.getPropertyValue('--fim')).toBe('0.54');
  });

  /** Sem potência no Ponto 1, não há energia correndo. */
  it('para sem potência', async () => {
    const base = criarRepositorioMock();
    const repositorio: RepositorioVers = {
      ...base,
      obterCadeiaAoVivo: async () => {
        const cadeia = await base.obterCadeiaAoVivo();
        return { ...cadeia, pontos: cadeia.pontos.map((p) => ({ ...p, potenciaMw: 0 })) };
      },
    };

    const fluxo = await trilho(repositorio);

    expect(fluxo).toHaveAttribute('data-parado', 'true');
    expect(fluxo?.querySelectorAll('[data-slot="luz"]')).toHaveLength(0);
  });
});
