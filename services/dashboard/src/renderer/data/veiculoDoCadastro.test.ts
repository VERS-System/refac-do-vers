/**
 * Testes do veículo guardado pelo Criar conta até o primeiro acesso.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-veiculo-no-cadastro.md`:
 * um só registro no `localStorage`, lido pelo e-mail da conta (sem diferenciar
 * maiúsculas) e apagado depois de usado; falhas do armazenamento não quebram
 * o app.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apagarVeiculoDoCadastro,
  guardarVeiculoDoCadastro,
  lerVeiculoDoCadastro,
} from './veiculoDoCadastro';

const POLO = { placa: 'GHI2J34', fabricante: 'Volkswagen', modelo: 'Polo', ano: '2023' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('veículo do cadastro', () => {
  /** Lê pelo e-mail da conta, ignorando maiúsculas e espaços nas pontas. */
  it('guarda e lê pelo e-mail', () => {
    guardarVeiculoDoCadastro(' Novo@Vers.com ', POLO);

    expect(lerVeiculoDoCadastro('novo@vers.com')).toEqual(POLO);
    expect(lerVeiculoDoCadastro('outro@vers.com')).toBeNull();
    expect(lerVeiculoDoCadastro()).toEqual(POLO);
  });

  /** Guarda só o último cadastro e não guarda a senha nem outros dados. */
  it('guarda só o último veículo', () => {
    guardarVeiculoDoCadastro('novo@vers.com', POLO);
    guardarVeiculoDoCadastro('outro@vers.com', { ...POLO, placa: 'JKL3M45' });

    expect(lerVeiculoDoCadastro('novo@vers.com')).toBeNull();
    expect(lerVeiculoDoCadastro('outro@vers.com')?.placa).toBe('JKL3M45');
    expect(Object.keys(localStorage).filter((chave) => chave.includes('veiculo'))).toEqual([
      'vers:veiculo-do-cadastro',
    ]);
    expect(localStorage.getItem('vers:veiculo-do-cadastro')).not.toMatch(/senha/i);
  });

  /** Depois de usado ou pulado, o registro some. */
  it('apaga o veículo guardado', () => {
    guardarVeiculoDoCadastro('novo@vers.com', POLO);

    apagarVeiculoDoCadastro();

    expect(lerVeiculoDoCadastro('novo@vers.com')).toBeNull();
  });

  /** Registro corrompido ou armazenamento bloqueado: segue sem veículo. */
  it('resiste a falhas do armazenamento', () => {
    localStorage.setItem('vers:veiculo-do-cadastro', '{quebrado');
    expect(lerVeiculoDoCadastro('novo@vers.com')).toBeNull();

    localStorage.setItem('vers:veiculo-do-cadastro', JSON.stringify({ email: 'novo@vers.com' }));
    expect(lerVeiculoDoCadastro('novo@vers.com')).toBeNull();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => guardarVeiculoDoCadastro('novo@vers.com', POLO)).not.toThrow();
    expect(lerVeiculoDoCadastro('novo@vers.com')).toBeNull();
    expect(() => apagarVeiculoDoCadastro()).not.toThrow();
  });
});
