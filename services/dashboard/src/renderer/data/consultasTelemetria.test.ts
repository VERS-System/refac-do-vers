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

  /** Impede que mudanças concorrentes e respostas truncadas produzam CSV parcial. */
  it.each(['total', 'vazia', 'repetida', 'metadados', 'truncada', 'outro-teste'])('recusa página inconsistente: %s', async (falha) => {
    const repositorio = criarRepositorioMock();
    const original = repositorio.obterAmostrasTelemetria;
    vi.spyOn(repositorio, 'obterAmostrasTelemetria').mockImplementation(async (consulta) => {
      const resposta = await original(consulta);
      if (consulta.pagina !== 2) return resposta;
      if (falha === 'total') return { ...resposta, total: resposta.total + 1 };
      if (falha === 'vazia') return { ...resposta, itens: [] };
      if (falha === 'metadados') return { ...resposta, pagina: 1 };
      if (falha === 'truncada') return { ...resposta, itens: resposta.itens.slice(1) };
      if (falha === 'outro-teste') return { ...resposta, itens: resposta.itens.map((item) => ({ ...item, testeId: 'outro' })) };
      const primeira = await original({ ...consulta, pagina: 1 });
      return { ...resposta, itens: primeira.itens };
    });
    await expect(buscarTodasAmostras(repositorio, { testeId: 'teste-023' })).rejects.toThrow(/exporta/i);
  });

  /** Recusa excesso ou total malformado antes de percorrer mais páginas. */
  it.each([10_001, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('recusa total inválido/excessivo %s', async (total) => {
    const repositorio = criarRepositorioMock();
    const obter = vi.spyOn(repositorio, 'obterAmostrasTelemetria').mockResolvedValue({
      itens: [], total, pagina: 1, tamanhoPagina: 100,
    });
    await expect(buscarTodasAmostras(repositorio, { testeId: 'teste-023' })).rejects.toThrow(/exporta/i);
    expect(obter).toHaveBeenCalledTimes(1);
  });

  /** Uma consulta legitimamente vazia não é um truncamento. */
  it('aceita total zero', async () => {
    const repositorio = criarRepositorioMock();
    vi.spyOn(repositorio, 'obterAmostrasTelemetria').mockResolvedValue({ itens: [], total: 0, pagina: 1, tamanhoPagina: 100 });
    await expect(buscarTodasAmostras(repositorio, { testeId: 'teste-023' })).resolves.toEqual([]);
  });

  /** O limite inclusivo termina na centésima página e preserva os filtros. */
  it('exporta exatamente 10.000 amostras mantendo intervalo e qualidade', async () => {
    const repositorio = criarRepositorioMock();
    const base = (await repositorio.obterAmostrasTelemetria({ testeId: 'teste-023' })).itens[0];
    const obter = vi.spyOn(repositorio, 'obterAmostrasTelemetria').mockImplementation(async (consulta) => ({
      pagina: consulta.pagina!, tamanhoPagina: 100, total: 10_000,
      itens: Array.from({ length: 100 }, (_, indice) => ({
        ...base, id: `${consulta.pagina}-${indice}`, qualidade: 'parcial',
      })),
    }));
    const filtros = { testeId: 'teste-023', qualidade: 'parcial' as const,
      de: '2026-10-05T20:00:00.000Z', ate: '2026-10-05T22:00:00.000Z' };
    expect(await buscarTodasAmostras(repositorio, filtros)).toHaveLength(10_000);
    expect(obter).toHaveBeenCalledTimes(100);
    expect(obter.mock.calls.every(([consulta]) => consulta.de === filtros.de &&
      consulta.ate === filtros.ate && consulta.qualidade === filtros.qualidade)).toBe(true);
  });
});
