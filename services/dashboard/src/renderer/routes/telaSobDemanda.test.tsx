/**
 * Testes da tela carregada sob demanda (divisão do app por tela, Fase 5,
 * lote 12): na primeira vez, o `Suspense` mostra o carregamento até o
 * código chegar; já carregada, a tela aparece direto.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { telaSobDemanda } from './telaSobDemanda';

/** Módulo de tela falso, com o componente como export padrão. */
function moduloFalso() {
  return { default: () => <h1>Energia</h1> };
}

describe('telaSobDemanda', () => {
  /** Na primeira vez, mostra o carregamento e depois a tela. */
  it('carrega na primeira vez', async () => {
    const carregar = vi.fn(async () => moduloFalso());
    const Tela = telaSobDemanda(carregar);

    render(
      <Suspense fallback={<p>Carregando</p>}>
        <Tela />
      </Suspense>,
    );

    expect(screen.getByText('Carregando')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Energia' })).toBeInTheDocument();
    expect(carregar).toHaveBeenCalledTimes(1);
  });

  /** Pré-carregada, aparece na primeira renderização, sem carregamento. */
  it('aparece direto depois de pré-carregada', async () => {
    const Tela = telaSobDemanda(async () => moduloFalso());
    await Tela.precarregar();

    render(
      <Suspense fallback={<p>Carregando</p>}>
        <Tela />
      </Suspense>,
    );

    expect(screen.getByRole('heading', { name: 'Energia' })).toBeInTheDocument();
    expect(screen.queryByText('Carregando')).not.toBeInTheDocument();
  });
});
