/**
 * Desenho da topologia dos piezos no chassi (vista de cima).
 *
 * Mostra as 8 posições (1 a 4 na suspensão dianteira, 5 a 8 na traseira),
 * com os piezos captando em dourado e os inativos apagados. O desenho é uma
 * imagem nomeada por um resumo em texto, para leitores de tela.
 */

import { cn } from '@/lib/cn';

export interface TopologiaPiezosProps {
  total: number;
  inativos: readonly number[];
  className?: string;
}

/** Posição (x, y) de cada piezo no desenho: pares nas quatro rodas. */
const POSICOES: Record<number, { x: number; y: number }> = {
  1: { x: 46, y: 70 },
  2: { x: 66, y: 70 },
  3: { x: 154, y: 70 },
  4: { x: 174, y: 70 },
  5: { x: 46, y: 250 },
  6: { x: 66, y: 250 },
  7: { x: 154, y: 250 },
  8: { x: 174, y: 250 },
};

/** "6 e 8" ou "2, 5 e 7": lista em português. */
function listar(numeros: readonly number[]): string {
  if (numeros.length <= 1) return numeros.join('');
  return `${numeros.slice(0, -1).join(', ')} e ${numeros[numeros.length - 1]}`;
}

/** Resumo acessível da topologia. */
export function descreverTopologia(total: number, inativos: readonly number[]): string {
  const ativos = total - inativos.length;
  const resto = inativos.length ? `inativos: ${listar(inativos)}` : 'todos captando';
  return `Topologia dos piezos: ${total} posições, ${ativos} captando; ${resto}.`;
}

/** Renderiza o chassi, as rodas e os piezos numerados. */
export function TopologiaPiezos({ total, inativos, className }: TopologiaPiezosProps) {
  const posicoes = Array.from({ length: total }, (_, i) => i + 1).filter((n) => POSICOES[n]);
  return (
    <div
      role="img"
      aria-label={descreverTopologia(total, inativos)}
      className={cn('grid place-items-center rounded-control bg-inset p-4', className)}
    >
      <svg viewBox="0 0 220 320" className="h-64 w-auto" aria-hidden="true">
        <rect
          x="70"
          y="20"
          width="80"
          height="280"
          rx="36"
          className="fill-none stroke-line-strong"
          strokeWidth="2"
        />
        <rect
          x="84"
          y="90"
          width="52"
          height="120"
          rx="10"
          className="fill-none stroke-line"
          strokeWidth="1.5"
        />
        {[
          [30, 52],
          [176, 52],
          [30, 232],
          [176, 232],
        ].map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="14"
            height="36"
            rx="4"
            className="fill-surface-raised stroke-line"
          />
        ))}
        <line x1="56" y1="70" x2="164" y2="70" className="stroke-line" strokeDasharray="3 4" />
        <line x1="56" y1="250" x2="164" y2="250" className="stroke-line" strokeDasharray="3 4" />
        {posicoes.map((numero) => {
          const { x, y } = POSICOES[numero];
          const ativo = !inativos.includes(numero);
          return (
            <g key={numero}>
              <circle
                cx={x}
                cy={y}
                r="9"
                className={ativo ? 'fill-accent' : 'fill-surface stroke-line-strong'}
                strokeWidth={ativo ? 0 : 1.5}
              />
              <text
                x={x}
                y={y + 3.5}
                textAnchor="middle"
                className={ativo ? 'fill-fg-on-accent' : 'fill-fg-muted'}
                style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              >
                {numero}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
