/**
 * Card de KPI das telas do VERS (por exemplo "Potência instantânea 212 mW").
 *
 * Mostra um rótulo, um badge opcional, o valor em Geist Mono com algarismos
 * tabulares e a unidade menor e esmaecida ao lado, como pede o DESIGN.md.
 * Um conteúdo extra (minigráfico, barra de nível) pode vir em `children`.
 *
 * Movimento da Fase 5 (DESIGN.md): um brilho dourado suave acompanha o
 * cursor sobre o card (SpotlightCard), o card sobe 2 px no hover e, com
 * `contagem`, o valor sobe até o número novo (CountUp). Plano em `.AIs/docs/plans/desktop-frontend-fase-5.md`.
 */

import { useId, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { VALOR_AUSENTE } from '@/lib/format';
import { Card } from './Card';
import { ContagemNumero } from './ContagemNumero';

/** Número a contar e como formatar cada passo, na unidade do card. */
export interface ContagemKpi {
  numero: number;
  formatar: (numero: number) => string;
}

export interface KpiCardProps {
  label: string;
  /**
   * Valor já formatado (use os formatadores de `@/lib/format`). Ausente
   * enquanto os dados carregam ou falham: o card mostra só `children`.
   */
  value?: ReactNode;
  /** Valor numérico contado até o número (no lugar de `value`). */
  contagem?: ContagemKpi;
  unit?: string;
  /** Badge ou indicador exibido à direita do rótulo. */
  badge?: ReactNode;
  className?: string;
  /** Conteúdo abaixo do valor, como um minigráfico ou rodapé. */
  children?: ReactNode;
}

/**
 * Valor do card a partir de um número que pode faltar: com número, conta até
 * ele; sem número (dado ausente), mostra o traço de valor ausente, como os
 * formatadores.
 */
export function valorContado(
  numero: number | null | undefined,
  formatar: (numero: number) => string,
): Pick<KpiCardProps, 'value' | 'contagem'> {
  if (numero === null || numero === undefined || !Number.isFinite(numero)) {
    return { value: VALOR_AUSENTE };
  }
  return { contagem: { numero, formatar } };
}

/**
 * Leva o centro do brilho até o cursor, em coordenadas do card. As variáveis
 * CSS mudam direto no elemento, sem renderizar o React a cada movimento.
 */
function moverBrilho(evento: PointerEvent<HTMLElement>) {
  const card = evento.currentTarget;
  const caixa = card.getBoundingClientRect();
  card.style.setProperty('--spot-x', `${evento.clientX - caixa.left}px`);
  card.style.setProperty('--spot-y', `${evento.clientY - caixa.top}px`);
}

/**
 * Renderiza o KPI como uma região nomeada pelo rótulo.
 *
 * Usar `section` com `aria-labelledby` permite que leitores de tela e testes
 * encontrem cada KPI pelo nome ("Potência instantânea").
 */
export function KpiCard({
  label,
  value,
  contagem,
  unit,
  badge,
  className,
  children,
}: KpiCardProps) {
  const idRotulo = useId();
  const valor = contagem ? (
    <ContagemNumero numero={contagem.numero} formatar={contagem.formatar} />
  ) : (
    value
  );
  return (
    <Card
      as="section"
      aria-labelledby={idRotulo}
      onPointerMove={moverBrilho}
      className={cn(
        'spotlight flex flex-col transition-transform duration-200 ease-out hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={idRotulo} className="text-[13px] leading-[18px] font-medium text-fg-secondary">
          {label}
        </h3>
        {badge}
      </div>
      {valor !== undefined && (
        <p className="mt-4 flex items-baseline gap-1.5 font-mono">
          <span className="tabular text-[32px] leading-[38px] font-medium tracking-[-0.5px] text-fg">
            {valor}
          </span>
          {unit && <span className="text-sm text-fg-muted">{unit}</span>}
        </p>
      )}
      {children && <div className="mt-auto pt-4">{children}</div>}
    </Card>
  );
}
