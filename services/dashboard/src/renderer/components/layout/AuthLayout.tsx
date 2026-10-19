/**
 * Layout das telas de autenticação (Login e Criar conta).
 *
 * Duas colunas: o painel da marca (logo, slogan, título em Zen Dots dourado e
 * texto de apoio sobre o gradiente diamante do DESIGN.md) e a área do
 * formulário. No Login a marca fica à esquerda; no Criar conta, à direita.
 * Atrás do conteúdo do painel, as ondas douradas do DESIGN.md (`OndasMarca`).
 *
 * Responsivo: abaixo de 1024 px o painel da marca vira uma faixa compacta
 * acima do formulário (logo, slogan e título menores; sem texto de apoio nem
 * rodapé), e o formulário ocupa a largura toda com 16 px de margem.
 */

import type { ReactNode } from 'react';
import { VersLogo } from '@/components/ui/VersLogo';
import { cn } from '@/lib/cn';
import { OndasMarca } from './OndasMarca';

export interface AuthLayoutProps {
  /** Título do painel da marca (h1 da página). */
  title: string;
  description?: string;
  /** Lado do painel da marca (padrão: esquerda). */
  brandSide?: 'left' | 'right';
  /** Formulário exibido na área principal. */
  children: ReactNode;
}

/**
 * Gradiente diamante do DESIGN.md: grafite `#282828` no centro e dourado bem
 * suave nos cantos. Os quatro gradientes lineares em diagonal formam o
 * losango; o canvas por baixo mantém o tom escuro.
 */
const GRADIENTE_MARCA = [
  'linear-gradient(to bottom right, rgb(213 196 98 / 0.07), transparent 55%)',
  'linear-gradient(to bottom left, rgb(213 196 98 / 0.07), transparent 55%)',
  'linear-gradient(to top right, rgb(213 196 98 / 0.07), transparent 55%)',
  'linear-gradient(to top left, rgb(213 196 98 / 0.07), transparent 55%)',
  '#282828',
].join(', ');

/**
 * Card de vidro do formulário de autenticação.
 *
 * Segue o efeito "Glass card" do DESIGN.md: `#101010` a ~60% com desfoque de
 * 24 px, realce branco de 6% no topo e sombra longa e suave.
 */
export function AuthCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'w-full max-w-[416px] rounded-[28px] border border-white/6 bg-[#101010]/60 p-6 backdrop-blur-xl sm:p-8',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_24px_64px_rgb(0_0_0/0.45)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Renderiza o painel da marca e a área do formulário no lado configurado. */
export function AuthLayout({ title, description, brandSide = 'left', children }: AuthLayoutProps) {
  return (
    <div
      className={cn(
        // min-h-dvh: a altura visível de verdade no celular (100vh conta a barra escondida).
        'flex min-h-dvh flex-col bg-canvas lg:flex-row',
        brandSide === 'right' && 'lg:flex-row-reverse',
      )}
    >
      <aside
        className="relative flex flex-col justify-center overflow-hidden px-4 py-6 sm:px-8 lg:w-[55%] lg:px-16 lg:py-12"
        style={{ background: GRADIENTE_MARCA }}
      >
        <OndasMarca />
        <div className="relative flex max-w-[520px] flex-col">
          <VersLogo size="auth" />
          <p className="mt-3 text-sm text-fg-secondary lg:text-base">
            every <span className="font-semibold text-accent">vibration</span> can be{' '}
            <span className="font-semibold text-accent">VERS</span>
          </p>
          <h1 className="mt-5 font-display text-[26px] leading-[34px] tracking-[1px] text-balance text-accent sm:text-[32px] sm:leading-[40px] lg:mt-14 lg:text-[44px] lg:leading-[52px]">
            {title}
          </h1>
          {description && (
            <p className="mt-5 hidden text-lg leading-7 text-fg-secondary lg:block">
              {description}
            </p>
          )}
        </div>
        <p className="absolute bottom-10 left-16 hidden font-mono text-xs text-fg-muted lg:block">
          Projeto de TCC · Vibration Energy Recovery System
        </p>
      </aside>
      <main className="relative flex flex-1 flex-col items-center justify-start px-4 py-8 sm:px-12 lg:justify-center lg:py-12">
        {children}
        <p className="mt-8 font-mono text-xs text-fg-muted lg:absolute lg:bottom-10 lg:mt-0">
          VERS · Protótipo acadêmico · v0.4
        </p>
      </main>
    </div>
  );
}
