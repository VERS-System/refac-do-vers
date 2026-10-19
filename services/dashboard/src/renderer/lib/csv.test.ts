/**
 * Testes da geração de CSV no formato que o Excel em português abre direto.
 */

import { describe, expect, it } from 'vitest';
import { gerarCsv } from './csv';

describe('gerarCsv', () => {
  /** Ponto e vírgula entre colunas, CRLF entre linhas e BOM para o Excel reconhecer UTF-8. */
  it('monta cabeçalho e linhas', () => {
    const csv = gerarCsv(
      ['Data', 'Energia (mWh)'],
      [
        ['04/10/2026', '168'],
        ['03/10/2026', '353'],
      ],
    );

    expect(csv).toBe('﻿Data;Energia (mWh)\r\n04/10/2026;168\r\n03/10/2026;353\r\n');
  });

  /** Campos com separador, aspas ou quebra de linha vão entre aspas, com aspas dobradas. */
  it('escapa campos especiais', () => {
    const csv = gerarCsv(['Nota'], [['a;b'], ['diz "oi"'], ['linha 1\nlinha 2'], ['1,5']]);

    expect(csv).toBe('﻿Nota\r\n"a;b"\r\n"diz ""oi"""\r\n"linha 1\nlinha 2"\r\n1,5\r\n');
  });

  /** Sem linhas, só o cabeçalho. */
  it('aceita tabela vazia', () => {
    expect(gerarCsv(['A', 'B'], [])).toBe('﻿A;B\r\n');
  });
});
