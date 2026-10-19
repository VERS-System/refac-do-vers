/**
 * Testes das preferências do usuário (unidades, movimento, tarifa e alertas).
 */

import { describe, expect, it } from 'vitest';
import { CHAVE_ARMAZENAMENTO, PREFERENCIAS_PADRAO, usePreferencias } from './preferencias';

describe('preferências', () => {
  /** Padrão: unidades do laboratório, sem tarifa, movimento normal e os 4 alertas. */
  it('começa no padrão', () => {
    const estado = usePreferencias.getState();

    expect(estado.unidades).toEqual({ potencia: 'mW', energia: 'mWh', aceleracao: 'm/s²' });
    expect(estado.reduzirMovimento).toBe(false);
    expect(estado.tarifaPorKwh).toBeNull();
    expect(estado.alertas.map((a) => [a.id, a.ativo])).toEqual([
      ['offline', true],
      ['eficiencia', true],
      ['temperatura', true],
      ['resumo-diario', false],
    ]);
    expect(PREFERENCIAS_PADRAO.unidades.potencia).toBe('mW');
  });

  /** Salvar troca só o que foi informado. */
  it('salva parte das preferências', () => {
    usePreferencias
      .getState()
      .salvar({ unidades: { potencia: 'W', energia: 'J', aceleracao: 'g' }, tarifaPorKwh: 0.95 });

    const estado = usePreferencias.getState();
    expect(estado.unidades.potencia).toBe('W');
    expect(estado.tarifaPorKwh).toBe(0.95);
    expect(estado.reduzirMovimento).toBe(false);
  });

  /** Unidades, movimento e tarifa ficam no aparelho; os alertas, só em memória. */
  it('guarda localmente sem os alertas', () => {
    usePreferencias.getState().salvar({ reduzirMovimento: true });

    const guardado = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO) ?? '{}');
    expect(guardado.state.reduzirMovimento).toBe(true);
    expect(guardado.state.unidades).toBeDefined();
    expect(guardado.state).not.toHaveProperty('alertas');
  });
});
