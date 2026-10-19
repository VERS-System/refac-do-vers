/**
 * Testes do download de arquivos gerados no próprio app (ex.: CSV).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { baixarArquivo } from './download';

describe('baixarArquivo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Cria um link temporário para um Blob, clica nele e libera a URL. */
  it('baixa o conteúdo com o nome informado', async () => {
    const criar = vi.fn((_blob: Blob) => 'blob:vers/1');
    const liberar = vi.fn();
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: liberar });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('resumo.csv');
      expect(this.href).toBe('blob:vers/1');
    });

    baixarArquivo('resumo.csv', 'a;b\r\n', 'text/csv;charset=utf-8');

    expect(clique).toHaveBeenCalledOnce();
    const blob = criar.mock.calls[0][0];
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(await blob.text()).toBe('a;b\r\n');
    expect(liberar).toHaveBeenCalledWith('blob:vers/1');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
