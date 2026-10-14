/**
 * Avatar do usuário (linha do usuário na sidebar, Configurações).
 *
 * Mostra a foto quando existir; sem foto, mostra as iniciais do nome num
 * círculo grafite.
 */

import { cn } from '@/lib/cn';

export interface AvatarProps {
  name: string;
  src?: string;
  /** Diâmetro em pixels (padrão: 36). */
  size?: number;
  className?: string;
}

/**
 * Calcula as iniciais exibidas no avatar.
 *
 * Usa a primeira letra do primeiro e do último nome ("Maria da Silva Souza"
 * vira "MS"), em maiúsculas. Nome único gera uma letra e nome vazio, texto vazio.
 */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/**
 * Renderiza a foto ou as iniciais, sempre nomeadas pelo nome completo.
 *
 * Sem foto, o círculo recebe `role="img"` com `aria-label`, para que leitores
 * de tela anunciem o nome e não as letras soltas.
 */
export function Avatar({ name, src, size = 36, className }: AvatarProps) {
  const classes = cn('shrink-0 rounded-full border border-line', className);
  if (src) {
    return <img src={src} alt={name} width={size} height={size} className={cn(classes, 'object-cover')} />;
  }
  return (
    <div
      role="img"
      aria-label={name}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(classes, 'grid place-items-center bg-surface-raised font-semibold text-fg')}
    >
      <span aria-hidden="true">{iniciais(name)}</span>
    </div>
  );
}
