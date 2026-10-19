/**
 * Testes do layout das telas de autenticação (painel da marca + formulário).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  /** O painel da marca mostra o logo, o título e o texto de apoio. */
  it('mostra logo, título e texto do painel da marca', () => {
    render(
      <AuthLayout title="Bem-vindo de volta" description="Entre com suas credenciais">
        <form aria-label="Entrar" />
      </AuthLayout>,
    );

    expect(screen.getByRole('img', { name: 'VERS' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bem-vindo de volta' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Entre com suas credenciais')).toBeInTheDocument();
  });

  /** Ocupa ao menos a altura visível da janela (`100dvh`), também no celular. */
  it('ocupa ao menos a altura visível da janela', () => {
    const { container } = render(
      <AuthLayout title="Bem-vindo de volta">
        <form aria-label="Entrar" />
      </AuthLayout>,
    );

    expect(container.firstElementChild).toHaveClass('min-h-dvh');
    expect(container.firstElementChild).not.toHaveClass('min-h-screen');
  });

  /** O conteúdo (formulário) fica na área principal. */
  it('renderiza o formulário na área principal', () => {
    render(
      <AuthLayout title="Bem-vindo de volta">
        <form aria-label="Entrar" />
      </AuthLayout>,
    );

    expect(screen.getByRole('main')).toContainElement(screen.getByRole('form', { name: 'Entrar' }));
  });

  /** Mostra o slogan e o rodapé do protótipo acadêmico. */
  it('mostra slogan e rodapé', () => {
    render(
      <AuthLayout title="Bem-vindo de volta">
        <div />
      </AuthLayout>,
    );

    expect(screen.getByText(/can be/)).toHaveTextContent('every vibration can be VERS');
    expect(screen.getByText(/Protótipo acadêmico/)).toBeInTheDocument();
  });

  /** O painel da marca tem as ondas douradas atrás do conteúdo (Waves, Fase 5). */
  it('mostra as ondas no painel da marca', () => {
    render(
      <AuthLayout title="Bem-vindo de volta">
        <p>Formulário</p>
      </AuthLayout>,
    );

    const painel = screen
      .getByRole('heading', { level: 1, name: 'Bem-vindo de volta' })
      .closest('aside');
    expect(painel?.querySelector('canvas[aria-hidden="true"]')).not.toBeNull();
  });
});
