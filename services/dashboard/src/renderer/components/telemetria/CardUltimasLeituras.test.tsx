/**
 * Testes da entrada das leituras novas nas Últimas leituras (AnimatedList do
 * DESIGN.md): só a leitura que chega depois da primeira carga entra animada.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md` (lote 5).
 */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { AmostraTelemetria, PaginaDe } from '@/data/tipos';
import { CardUltimasLeituras } from './CardUltimasLeituras';

/** Amostra mínima com o id e o horário dados. */
function amostra(id: string, horario: string): AmostraTelemetria {
  return {
    id,
    testeId: 't-024',
    capturadaEm: `2026-10-04T${horario}.000-03:00`,
    tensaoV: 4.82,
    correnteMa: 44,
    potenciaMw: 212,
    energiaAcumuladaMwh: 10,
    vibracaoRmsMs2: 3.2,
    temperaturaC: 31.4,
    piezosAtivos: 6,
    piezosTotal: 8,
    qualidade: 'valida',
  };
}

/** Consulta já carregada com as amostras dadas. */
function consulta(itens: AmostraTelemetria[]) {
  const pagina: PaginaDe<AmostraTelemetria> = {
    itens,
    total: itens.length,
    pagina: 1,
    tamanhoPagina: 6,
  };
  return { data: pagina, isPending: false, isError: false, refetch: () => undefined };
}

const leituras = () =>
  within(screen.getByRole('region', { name: 'Últimas leituras' })).getAllByRole('listitem');

describe('CardUltimasLeituras — leituras novas', () => {
  /** A primeira carga aparece parada; a leitura nova entra animada no topo. */
  it('anima só a leitura que chegou depois', () => {
    const antigas = [amostra('b', '18:04:50'), amostra('a', '18:04:40')];
    const { rerender } = render(
      <CardUltimasLeituras consulta={consulta(antigas)} conexao="conectado" />,
    );
    for (const item of leituras()) expect(item).not.toHaveClass('entrada-leitura');

    rerender(
      <CardUltimasLeituras
        consulta={consulta([amostra('c', '18:05:00'), ...antigas])}
        conexao="conectado"
      />,
    );

    const [nova, ...resto] = leituras();
    expect(nova).toHaveTextContent('18:05:00');
    expect(nova).toHaveClass('entrada-leitura');
    for (const item of resto) expect(item).not.toHaveClass('entrada-leitura');
  });
});
