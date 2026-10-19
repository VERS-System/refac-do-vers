/**
 * Testes das ondas do painel da marca (Waves do DESIGN.md).
 *
 * O canvas é decorativo e não pode quebrar a tela: sem canvas (jsdom), nada
 * é desenhado; com menos movimento, um quadro parado; com movimento, um laço
 * de quadros que para quando a janela some e quando a tela sai.
 * Plano: `.AIs/docs/plans/desktop-frontend-fase-5.md` (lote 7).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { OndasMarca } from './OndasMarca';

/** Contexto 2D falso que conta os traços desenhados. */
function contextoFalso() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 1,
    strokeStyle: '',
  };
}

/** Faz o canvas devolver o contexto falso. */
function comCanvas() {
  const contexto = contextoFalso();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    contexto as unknown as CanvasRenderingContext2D,
  );
  return contexto;
}

/** Sistema sem pedido de menos movimento. */
function permitirMovimento() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('OndasMarca', () => {
  /** O canvas é só decoração: escondido do leitor de tela e sem capturar o cursor. */
  it('é decorativo', () => {
    const { container } = render(<OndasMarca />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveClass('pointer-events-none');
  });

  /** Com menos movimento, desenha um quadro parado e não agenda outros. */
  it('desenha um quadro parado sem movimento', () => {
    const contexto = comCanvas();
    const agendar = vi.spyOn(window, 'requestAnimationFrame');

    render(<OndasMarca />);

    expect(contexto.stroke).toHaveBeenCalled();
    expect(agendar).not.toHaveBeenCalled();
  });

  /** Com movimento, anima em laço e cancela o laço ao sair da tela. */
  it('anima e para ao desmontar', () => {
    comCanvas();
    permitirMovimento();
    const agendar = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(7);
    const cancelar = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { unmount } = render(<OndasMarca />);
    expect(agendar).toHaveBeenCalled();

    unmount();
    expect(cancelar).toHaveBeenCalledWith(7);
  });

  /** Janela oculta: o laço para; ao voltar, recomeça. */
  it('pausa com a janela oculta', () => {
    comCanvas();
    permitirMovimento();
    const agendar = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(3);
    const cancelar = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<OndasMarca />);
    agendar.mockClear();

    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cancelar).toHaveBeenCalledWith(3);

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(agendar).toHaveBeenCalled();
  });
});
