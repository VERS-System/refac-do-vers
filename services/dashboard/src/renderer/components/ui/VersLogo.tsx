/**
 * Logo oficial do VERS: símbolo de três faixas inclinadas + "VERS" em Zen Dots.
 *
 * Reproduz o markup obrigatório do DESIGN.md: faixas cinza claro, dourada e
 * cinza claro, nome sempre em cinza claro (nunca dourado) e nunca "///VERS"
 * digitado como texto. Há dois tamanhos: o da sidebar e o do painel das telas
 * de autenticação.
 */

import { cn } from '@/lib/cn';

export type VersLogoSize = 'sidebar' | 'auth';

export interface VersLogoProps {
  size?: VersLogoSize;
  /** Versão exibida ao lado do nome, por exemplo "v0.4". */
  version?: string;
  className?: string;
}

/** Medidas de cada tamanho, conforme o DESIGN.md. */
const MEDIDAS: Record<
  VersLogoSize,
  { largura: number; altura: number; fonte: string; espaco: string }
> = {
  sidebar: { largura: 42, altura: 28, fonte: 'text-[22px]', espaco: 'gap-2.5' },
  auth: { largura: 72, altura: 48, fonte: 'text-[44px]', espaco: 'gap-4' },
};

/**
 * Renderiza o símbolo, o nome e a versão opcional.
 *
 * Símbolo e nome formam uma única imagem nomeada "VERS" para leitores de
 * tela; a versão fica fora dela, como texto comum. As cores das faixas são
 * fixas porque fazem parte da marca.
 */
export function VersLogo({ size = 'sidebar', version, className }: VersLogoProps) {
  const medidas = MEDIDAS[size];
  return (
    <div className={cn('flex items-center', className)}>
      <span role="img" aria-label="VERS" className={cn('flex items-center', medidas.espaco)}>
        <svg
          width={medidas.largura}
          height={medidas.altura}
          viewBox="0 0 140 93"
          aria-hidden="true"
          className="shrink-0"
        >
          <polygon fill="#D9D9D9" points="41.9,0.1 65.6,0.6 43.6,47.9 12.1,92.9 0.1,92.9" />
          <polygon fill="#D5C462" points="79.9,0.1 103.6,0.6 81.6,47.9 50.1,92.9 38.1,92.9" />
          <polygon fill="#D9D9D9" points="115.9,0.1 139.9,0.6 117.6,47.9 86.1,92.9 74.1,92.9" />
        </svg>
        <span
          aria-hidden="true"
          className={cn('font-display leading-none tracking-[1px] text-logo', medidas.fonte)}
        >
          VERS
        </span>
      </span>
      {version && (
        <span className="ml-2.5 self-end text-[11px] leading-4 text-fg-muted">{version}</span>
      )}
    </div>
  );
}
