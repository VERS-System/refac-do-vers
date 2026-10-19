/**
 * Testes da busca geral (Fase 5, lote 9): procura nas telas, seções das
 * Configurações, testes e veículos sem diferenciar maiúsculas, acentos nem o
 * "#" dos códigos; o título que começa com o termo vem primeiro.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { describe, expect, it } from 'vitest';
import { buscar, type ItemBusca } from './busca';

const ITENS: ItemBusca[] = [
  { id: 'tela-energia', titulo: 'Energia', grupo: 'Tela', rota: '/energia' },
  { id: 'tela-telemetria', titulo: 'Telemetria', grupo: 'Tela', rota: '/telemetria' },
  {
    id: 'secao-tarifa',
    titulo: 'Tarifa de energia',
    grupo: 'Configurações',
    rota: '/configuracoes',
  },
  {
    id: 'teste-024',
    titulo: 'Teste #024',
    detalhe: 'Cidade · 04/10',
    grupo: 'Teste',
    rota: '/testes',
  },
  {
    id: 'veiculo-strada',
    titulo: 'Fiat Strada 2024',
    detalhe: 'DEF4G56',
    grupo: 'Veículo',
    rota: '/veiculos',
  },
];

const ids = (itens: ItemBusca[]) => itens.map((item) => item.id);

describe('buscar', () => {
  /** Sem termo, sugere as telas. */
  it('sugere as telas sem termo', () => {
    expect(ids(buscar(ITENS, '  '))).toEqual(['tela-energia', 'tela-telemetria']);
  });

  /** Ignora maiúsculas e acentos; quem começa com o termo vem antes. */
  it('acha por parte do nome', () => {
    expect(ids(buscar(ITENS, 'ENERG'))).toEqual(['tela-energia', 'secao-tarifa']);
    expect(ids(buscar(ITENS, 'tele'))).toEqual(['tela-telemetria']);
  });

  /** Testes pelo código, com ou sem "#"; veículos pela placa. */
  it('acha testes e veículos pelo código e pela placa', () => {
    expect(ids(buscar(ITENS, '24'))).toEqual(['teste-024', 'veiculo-strada']);
    expect(ids(buscar(ITENS, '#024'))).toEqual(['teste-024']);
    expect(ids(buscar(ITENS, 'def4'))).toEqual(['veiculo-strada']);
  });

  /** Várias palavras: todas precisam aparecer, em qualquer ordem. */
  it('exige todas as palavras', () => {
    expect(ids(buscar(ITENS, 'cidade teste'))).toEqual(['teste-024']);
    expect(ids(buscar(ITENS, 'cidade energia'))).toEqual([]);
  });

  /** No máximo `limite` resultados. */
  it('limita os resultados', () => {
    expect(buscar(ITENS, 'e', 2)).toHaveLength(2);
  });
});
