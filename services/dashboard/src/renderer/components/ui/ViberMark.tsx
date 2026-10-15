/**
 * Marca da Viber IA: o "Vi" desenhado em quatro polígonos.
 *
 * Substitui qualquer ícone genérico de robô (decisão de 13/10/2026). Usa
 * `currentColor`, então a cor vem do texto em volta: dourada por padrão,
 * cinza na lista de conversas e dourada no hover.
 */

import type { SVGProps } from 'react';
import { cn } from '@/lib/cn';

export interface ViberMarkProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  /** Altura em pixels; a largura segue a proporção 108 x 84 (padrão: 20). */
  size?: number | string;
  /** Esconde a marca dos leitores de tela quando um texto ao lado já nomeia a Viber. */
  decorative?: boolean;
}

/**
 * Renderiza o SVG da marca com a largura proporcional à altura.
 *
 * Também é tratada como decorativa quando recebe `aria-hidden`, o que acontece
 * quando é usada como ícone do `NavItem` ou de um botão.
 */
export function ViberMark({ size = 20, decorative, className, ...props }: ViberMarkProps) {
  const altura = Number(size);
  const largura = Math.round((altura * 108) / 84);
  const oculta = decorative || props['aria-hidden'] === true || props['aria-hidden'] === 'true';
  return (
    <svg
      width={largura}
      height={altura}
      viewBox="0 0 108 84"
      className={cn('shrink-0 text-accent', className)}
      {...props}
      {...(oculta ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Viber' })}
    >
      <polygon
        fill="currentColor"
        points="0.1,0.1 15.9,0.1 39.1,67.4 33.4,82.9 29.1,82.9 28.4,82.1"
      />
      <polygon
        fill="currentColor"
        points="64.4,1.4 80.1,1.4 79.9,3.6 63.9,46.6 44.6,81.9 42.9,83.9 36.4,83.9 36.1,81.6"
      />
      <polygon fill="currentColor" points="92.4,1.4 107.9,1.6 101.6,19.1 86.1,18.9 91.1,2.4" />
      <polygon fill="currentColor" points="83.6,25.4 99.1,25.9 93.9,42.1 71.1,83.9 63.1,83.9" />
    </svg>
  );
}
