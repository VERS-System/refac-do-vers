/**
 * Testes do utilitário que junta classes CSS condicionais.
 */

import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  /** Junta as classes com espaço e ignora valores falsos. */
  it('junta classes e descarta valores falsos', () => {
    expect(cn('a', false, 'b', null, undefined, '', 'c')).toBe('a b c');
  });

  /** Sem classes válidas, devolve texto vazio. */
  it('devolve texto vazio sem classes', () => {
    expect(cn(false, null)).toBe('');
  });
});
