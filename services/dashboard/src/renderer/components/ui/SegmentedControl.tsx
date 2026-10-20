/**
 * Controle segmentado do app desktop do VERS (por exemplo Hora, Dia, Semana, Mês).
 *
 * Implementado como um grupo de rádios acessível: a opção marcada fica
 * destacada em dourado, só ela entra na ordem de tabulação e as setas
 * esquerda/direita mudam a seleção, como nos controles nativos. O fundo
 * dourado da opção marcada desliza até a nova opção (Fase 5).
 */

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nome acessível do grupo, por exemplo "Período". */
  'aria-label': string;
  className?: string;
}

/**
 * Renderiza as opções como rádios em pílula.
 *
 * Usa "roving tabindex": a opção marcada tem `tabIndex=0` e as demais `-1`.
 * As setas calculam a próxima opção com volta nas pontas, chamam `onChange` e
 * movem o foco para ela, para que o teclado e o estado andem juntos.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': rotulo,
  className,
}: SegmentedControlProps<T>) {
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const [destaque, setDestaque] = useState<{ esquerda: number; largura: number } | null>(null);
  const posicionado = useRef(false);
  const indiceMarcado = options.findIndex((opcao) => opcao.value === value);

  // Destaque deslizante (Fase 5): mede a opção marcada e leva o fundo até ela.
  // A primeira posição entra sem transição.
  // Mede de novo se o tamanho mudar (por exemplo, quando a fonte termina de carregar).
  useLayoutEffect(() => {
    const medir = () => {
      const botao = botoes.current[indiceMarcado];
      setDestaque(botao ? { esquerda: botao.offsetLeft, largura: botao.offsetWidth } : null);
    };
    medir();
    const observador = new ResizeObserver(medir);
    for (const botao of botoes.current) if (botao) observador.observe(botao);
    return () => observador.disconnect();
  }, [indiceMarcado]);
  useLayoutEffect(() => {
    if (destaque) posicionado.current = true;
  }, [destaque]);

  /** Trata as setas: seleciona e foca a opção vizinha. */
  function aoPressionarTecla(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[evento.key];
    if (passo === undefined) return;
    evento.preventDefault();
    const proximo = (indice + passo + options.length) % options.length;
    onChange(options[proximo].value);
    botoes.current[proximo]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      className={cn(
        'relative inline-flex items-center gap-1 rounded-full border border-line p-1',
        className,
      )}
    >
      {destaque && (
        <span
          data-slot="indicador"
          data-valor={value}
          aria-hidden="true"
          style={{ transform: `translateX(${destaque.esquerda}px)`, width: destaque.largura }}
          className={cn(
            'absolute top-1 bottom-1 left-0 rounded-full bg-accent',
            posicionado.current &&
              'transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          )}
        />
      )}
      {options.map((opcao, indice) => {
        const marcada = opcao.value === value;
        return (
          <button
            key={opcao.value}
            ref={(elemento) => {
              botoes.current[indice] = elemento;
            }}
            type="button"
            role="radio"
            aria-checked={marcada}
            tabIndex={marcada ? 0 : -1}
            onClick={() => onChange(opcao.value)}
            onKeyDown={(evento) => aoPressionarTecla(evento, indice)}
            className={cn(
              'relative h-8 rounded-full px-4 text-sm transition-colors duration-150',
              marcada
                ? 'font-medium text-fg-on-accent'
                : 'text-fg-secondary hover:bg-hover hover:text-fg',
            )}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}
