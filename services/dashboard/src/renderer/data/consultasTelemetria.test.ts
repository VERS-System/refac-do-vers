/**
 * Testes da busca de todas as páginas de amostras (usada na exportação CSV).
 */

import { describe, expect, it, vi } from 'vitest';
import { buscarTodasAmostras } from './consultasTelemetria';
import { criarRepositorioMock } from './repositorioMock';

describe('buscarTodasAmostras', () => {
  /** Junta todas as páginas (de 100 em 100, o máximo do backend), na ordem da consulta. */
  it('percorre as páginas até o total', async () => {
    const repositorio = criarRepositorioMock();
    const espiao = vi.spyOn(repositorio, 'obterAmostrasTelemetria');
    const tarde = { id: 'teste-023' };

    const amostras = await buscarTodasAmostras(repositorio, { testeId: tarde.id });

    expect(amostras).toHaveLength(265);
    expect(amostras[0].capturadaEm.slice(11, 19)).toBe('18:05:00');
    expect(amostras.at(-1)?.capturadaEm.slice(11, 19)).toBe('17:21:00');
    expect(espiao).toHaveBeenCalledTimes(3);
    expect(
      espiao.mock.calls.map(([consulta]) => [consulta.pagina, consulta.tamanhoPagina]),
    ).toEqual([
      [1, 100],
      [2, 100],
      [3, 100],
    ]);
  });

  /** Mantém os filtros da consulta. */
  it('respeita o filtro de qualidade', async () => {
    const repositorio = criarRepositorioMock();
    const tarde = { id: 'teste-023' };

    const parciais = await buscarTodasAmostras(repositorio, {
      testeId: tarde.id,
      qualidade: 'parcial',
    });

    expect(parciais.length).toBeGreaterThan(0);
    expect(parciais.every((a) => a.qualidade === 'parcial')).toBe(true);
  });
});
