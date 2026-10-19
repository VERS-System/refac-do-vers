/**
 * Ondas do painel da marca no Login e no Criar conta (Waves do DESIGN.md:
 * "thin gold lines that vibrate", uma referência à energia da vibração).
 *
 * Um canvas 2D atrás do conteúdo desenha linhas douradas finas e de baixa
 * opacidade que ondulam devagar, como traços de um osciloscópio. Perto do
 * cursor a vibração fica mais rápida e mais forte, como se o cursor fosse a
 * fonte de vibração que o VERS capta, e se acalma quando ele sai. É só
 * decoração: escondido do leitor de tela e sem capturar o cursor.
 *
 * Custo e acessibilidade: com "Reduzir movimento" (do app ou do sistema),
 * desenha um quadro parado; com a janela oculta, o laço para; sem canvas
 * (como no jsdom), não desenha nada. Plano em
 * `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { useEffect, useRef } from 'react';
import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';

/** Quantidade de linhas e o trecho vertical do painel que elas ocupam. */
const LINHAS = 15;
const TOPO = 0.16;
const ALTURA_FAIXA = 0.68;
/** Distância entre os pontos de cada linha, em px. */
const PASSO_X = 8;
/** Amplitude da ondulação de fundo e da vibração junto ao cursor, em px. */
const AMPLITUDE = 9;
const AMPLITUDE_CURSOR = 13;
/** Raio de alcance do cursor, em px. */
const RAIO_CURSOR = 130;

interface Cursor {
  x: number;
  y: number;
}

/**
 * Desenha um quadro no instante `t` (ms). `energia` (0 a 1) é quanto o cursor
 * está "vibrando" o painel; vai a zero aos poucos depois que ele sai.
 */
function desenhar(
  contexto: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  t: number,
  cursor: Cursor | null,
  energia: number,
) {
  contexto.clearRect(0, 0, largura, altura);
  const meio = (LINHAS - 1) / 2;
  for (let i = 0; i < LINHAS; i++) {
    const y0 = altura * (TOPO + (ALTURA_FAIXA * i) / (LINHAS - 1));
    // As linhas do centro brilham mais, como o traço principal de um sinal.
    const destaque = 1 - Math.abs(i - meio) / meio;
    contexto.strokeStyle = `rgba(213, 196, 98, ${0.05 + 0.13 * destaque})`;
    contexto.lineWidth = i === Math.round(meio) ? 1.2 : 1;
    const fase = t * 0.00055 + i * 0.42;
    contexto.beginPath();
    for (let x = 0; x <= largura + PASSO_X; x += PASSO_X) {
      // Envelope: as linhas nascem e morrem nas bordas do painel.
      const envelope = Math.sin((Math.PI * Math.min(x, largura)) / Math.max(largura, 1));
      let deslocamento =
        AMPLITUDE *
        envelope *
        (0.6 * Math.sin(x * 0.011 + fase) + 0.4 * Math.sin(x * 0.027 - fase * 1.6));
      if (cursor && energia > 0.001) {
        const distancia2 = (x - cursor.x) ** 2 + (y0 - cursor.y) ** 2;
        const alcance = Math.exp(-distancia2 / (2 * RAIO_CURSOR ** 2));
        deslocamento += AMPLITUDE_CURSOR * energia * alcance * Math.sin(x * 0.09 - t * 0.014);
      }
      if (x === 0) contexto.moveTo(x, y0 + deslocamento);
      else contexto.lineTo(x, y0 + deslocamento);
    }
    contexto.stroke();
  }
}

/** Canvas das ondas, para ficar atrás do conteúdo do painel da marca. */
export function OndasMarca() {
  const referencia = useRef<HTMLCanvasElement>(null);
  const reduzido = useMovimentoReduzido();

  useEffect(() => {
    const canvas = referencia.current;
    const contexto = canvas?.getContext('2d');
    if (!canvas || !contexto) return;

    let largura = 0;
    let altura = 0;
    /** Ajusta a resolução do canvas ao tamanho na tela e à densidade de pixels. */
    const medir = () => {
      const caixa = canvas.getBoundingClientRect();
      const densidade = window.devicePixelRatio || 1;
      largura = caixa.width;
      altura = caixa.height;
      canvas.width = Math.round(largura * densidade);
      canvas.height = Math.round(altura * densidade);
      contexto.setTransform(densidade, 0, 0, densidade, 0, 0);
    };
    medir();

    if (reduzido) {
      desenhar(contexto, largura, altura, 0, null, 0);
      return;
    }

    let cursor: Cursor | null = null;
    let energia = 0;
    let quadro = 0;
    const painel = canvas.parentElement;

    /** Um quadro: aproxima a energia do alvo (cursor dentro ou fora) e desenha. */
    const passo = (t: number) => {
      energia += ((cursor ? 1 : 0) - energia) * 0.06;
      desenhar(contexto, largura, altura, t, cursor, energia);
      quadro = requestAnimationFrame(passo);
    };
    /** Guarda o cursor em coordenadas do canvas. */
    const mover = (evento: PointerEvent) => {
      const caixa = canvas.getBoundingClientRect();
      cursor = { x: evento.clientX - caixa.left, y: evento.clientY - caixa.top };
    };
    const sair = () => {
      cursor = null;
    };
    /** Janela oculta: para o laço; visível de novo: recomeça. */
    const visibilidade = () => {
      if (document.hidden) {
        cancelAnimationFrame(quadro);
        quadro = 0;
      } else if (!quadro) {
        quadro = requestAnimationFrame(passo);
      }
    };

    const observador = new ResizeObserver(medir);
    observador.observe(canvas);
    painel?.addEventListener('pointermove', mover);
    painel?.addEventListener('pointerleave', sair);
    document.addEventListener('visibilitychange', visibilidade);
    quadro = requestAnimationFrame(passo);

    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      painel?.removeEventListener('pointermove', mover);
      painel?.removeEventListener('pointerleave', sair);
      document.removeEventListener('visibilitychange', visibilidade);
    };
  }, [reduzido]);

  return (
    <canvas
      ref={referencia}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
