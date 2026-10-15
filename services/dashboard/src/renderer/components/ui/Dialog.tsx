/**
 * Diálogo modal do app desktop do VERS (planejar, iniciar, finalizar e
 * cancelar testes; editar cadastros; confirmações).
 *
 * Acessível como pede a WAI-ARIA: `role="dialog"` com `aria-modal`, nome
 * pelo título e descrição pelo texto de apoio; o foco entra no primeiro
 * elemento interativo, fica preso dentro (Tab e Shift+Tab dão a volta) e
 * volta para quem abriu ao fechar. Esc e o clique no fundo fecham.
 */

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export interface DialogProps {
  aberto: boolean;
  titulo: string;
  /** Texto curto abaixo do título, que descreve o diálogo para leitores de tela. */
  descricao?: string;
  onFechar: () => void;
  children?: ReactNode;
  className?: string;
}

/** Elementos que recebem foco pelo teclado. */
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Lista os elementos focáveis dentro do painel, na ordem do documento. */
function focaveis(painel: HTMLElement | null): HTMLElement[] {
  return painel ? Array.from(painel.querySelectorAll<HTMLElement>(FOCAVEIS)) : [];
}

/**
 * Renderiza o diálogo num portal sobre a página, quando aberto.
 *
 * Ao abrir, guarda o elemento que tinha o foco e foca o primeiro elemento
 * interativo do painel (ou o próprio painel); ao fechar, devolve o foco.
 */
export function Dialog({ aberto, titulo, descricao, onFechar, children, className }: DialogProps) {
  const idTitulo = useId();
  const idDescricao = useId();
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    if (!aberto) return undefined;
    const anterior = document.activeElement as HTMLElement | null;
    const [primeiro] = focaveis(painel.current);
    (primeiro ?? painel.current)?.focus();
    return () => anterior?.focus?.();
  }, [aberto]);

  if (!aberto) return null;

  /** Esc fecha; Tab e Shift+Tab dão a volta entre o primeiro e o último elemento. */
  function aoPressionarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      fechar.current();
      return;
    }
    if (evento.key !== 'Tab') return;
    const lista = focaveis(painel.current);
    if (lista.length === 0) return;
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div
        data-slot="fundo"
        aria-hidden="true"
        className="absolute inset-0 bg-black/60"
        onClick={() => fechar.current()}
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDescricao : undefined}
        tabIndex={-1}
        onKeyDown={aoPressionarTecla}
        className={cn(
          'relative flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-elevation-1 outline-none',
          className,
        )}
      >
        <header className="flex flex-col gap-1">
          <h2 id={idTitulo} className="text-lg leading-6 font-semibold text-fg">
            {titulo}
          </h2>
          {descricao && (
            <p id={idDescricao} className="text-[13px] leading-5 text-fg-muted">
              {descricao}
            </p>
          )}
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}
