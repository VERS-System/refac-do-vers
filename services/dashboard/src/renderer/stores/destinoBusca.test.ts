/**
 * Testes do destino da busca: a busca deixa o item escolhido e a tela que
 * abre o consome uma vez só (Fase 5, lote 9).
 */

import { describe, expect, it } from 'vitest';
import { consumirDestino, definirDestino } from './destinoBusca';

describe('destino da busca', () => {
  /** A tela certa recebe o destino uma vez; outra tela não o recebe. */
  it('entrega o destino uma vez à tela certa', () => {
    definirDestino({ tipo: 'veiculo', id: 'v1' });

    expect(consumirDestino('teste')).toBeNull();
    expect(consumirDestino('veiculo')).toEqual({ tipo: 'veiculo', id: 'v1' });
    expect(consumirDestino('veiculo')).toBeNull();
  });

  /** Um destino novo substitui o anterior. */
  it('guarda só o último destino', () => {
    definirDestino({ tipo: 'secao', id: 'perfil' });
    definirDestino({ tipo: 'secao', id: 'tarifa' });

    expect(consumirDestino('secao')).toEqual({ tipo: 'secao', id: 'tarifa' });
  });
});
