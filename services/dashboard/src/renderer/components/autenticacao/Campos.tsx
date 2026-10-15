/**
 * Peças das telas Login e Criar conta: campo de senha com "Mostrar senha",
 * lista de requisitos da senha ao vivo, etapas do cadastro e o aviso de erro
 * do envio.
 *
 * Seguem o plano `.AIs/docs/plans/desktop-frontend-autenticacao.md` e as
 * regras de senha do `RegisterDto` do backend.
 */

import { useState } from 'react';
import { Check, Circle, CircleCheck, Eye, EyeOff, Lock } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/Input';
import { requisitosSenha, type RequisitosSenha } from '@/data/calculos';
import { cn } from '@/lib/cn';

/**
 * Campo de senha com o botão "Mostrar senha" à direita.
 *
 * O botão mantém o mesmo nome e informa o estado com `aria-pressed`, como
 * pede o padrão de botões alternáveis; o campo troca entre `password` e
 * `text`.
 */
export function CampoSenha(props: Omit<InputProps, 'type' | 'icon' | 'trailing'>) {
  const [visivel, setVisivel] = useState(false);
  const Icone = visivel ? EyeOff : Eye;
  return (
    <Input
      {...props}
      type={visivel ? 'text' : 'password'}
      icon={Lock}
      trailing={
        <button
          type="button"
          aria-label="Mostrar senha"
          aria-pressed={visivel}
          onClick={() => setVisivel((atual) => !atual)}
          className="grid size-8 place-items-center rounded-full text-fg-muted hover:bg-hover hover:text-fg"
        >
          <Icone aria-hidden="true" size={18} />
        </button>
      }
    />
  );
}

/** Textos dos requisitos, na ordem da referência. */
const REQUISITOS: { chave: keyof RequisitosSenha; texto: string }[] = [
  { chave: 'tamanho', texto: '8 caracteres' },
  { chave: 'maiuscula', texto: '1 letra maiúscula' },
  { chave: 'especial', texto: '1 caractere especial' },
  { chave: 'semEspacos', texto: 'Sem espaços' },
];

/**
 * Requisitos da senha ao vivo. Cada item diz "atendido" ou "pendente" em
 * texto para leitores de tela (o ícone e a cor são só visuais).
 */
export function ListaRequisitos({ senha, id }: { senha: string; id?: string }) {
  const atendidos = requisitosSenha(senha);
  return (
    <ul
      id={id}
      aria-label="Requisitos da senha"
      className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-control border border-line-subtle bg-inset px-4 py-3"
    >
      {REQUISITOS.map(({ chave, texto }) => {
        const ok = atendidos[chave];
        const Icone = ok ? CircleCheck : Circle;
        return (
          <li
            key={chave}
            className={cn('flex items-center gap-2 text-xs', ok ? 'text-success' : 'text-fg-muted')}
          >
            <Icone aria-hidden="true" size={16} />
            <span>{texto}</span>
            <span className="sr-only">{ok ? 'atendido' : 'pendente'}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Etapas do cadastro, na ordem. */
export const ETAPAS = ['Conta', 'Veículo', 'Instalação'] as const;

/**
 * Indicador das etapas do cadastro: número (ou check, se concluída), nome e
 * a linha entre elas. A atual tem `aria-current="step"`.
 */
export function Etapas({ atual }: { atual: number }) {
  return (
    <ol aria-label="Etapas do cadastro" className="flex items-center gap-3">
      {ETAPAS.map((nome, i) => {
        const concluida = i < atual;
        const ativa = i === atual;
        return (
          <li
            key={nome}
            aria-current={ativa ? 'step' : undefined}
            className="flex flex-1 items-center gap-2 last:flex-none"
          >
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full border font-mono text-xs',
                ativa && 'border-accent bg-accent text-fg-on-accent',
                concluida && 'border-accent-border bg-accent-subtle text-accent',
                !ativa && !concluida && 'border-line text-fg-muted',
              )}
            >
              {concluida ? <Check aria-hidden="true" size={14} /> : i + 1}
            </span>
            <span
              className={cn(
                'text-[13px]',
                ativa ? 'font-semibold text-accent' : 'text-fg-secondary',
              )}
            >
              {nome}
              {concluida && <span className="sr-only"> (concluída)</span>}
            </span>
            {i < ETAPAS.length - 1 && (
              <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-line" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Aviso de erro do envio (recusa do backend), anunciado na hora. */
export function AvisoErro({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-control border border-danger/40 bg-danger-subtle px-4 py-2.5 text-[13px] text-danger"
    >
      {children}
    </p>
  );
}
