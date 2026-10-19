/**
 * Testes do menu lateral das telas estreitas (app responsivo).
 *
 * Abaixo de 1024 px a sidebar some e o botão "Abrir menu" da barra superior
 * abre a mesma navegação num painel lateral: com o ESP32 e o usuário,
 * fechando com Esc (o foco volta ao botão) e ao escolher uma tela.
 * Plano: `.AIs/docs/plans/desktop-frontend-responsivo.md`.
 */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

/** Abre o app numa rota do HashRouter. */
function abrirEm(rota: string) {
  window.location.hash = rota;
  render(<App />);
}

describe('menu lateral', () => {
  /** O painel traz a navegação, o ESP32 e o usuário; escolher uma tela fecha o menu. */
  it('abre pelo botão e navega', async () => {
    abrirEm('/visao-geral');

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));

    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(menu).toHaveAttribute('data-variante', 'lateral');
    expect(
      within(menu).getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeInTheDocument();
    expect(await within(menu).findByText('Ana Silva')).toBeInTheDocument();

    await userEvent.click(within(menu).getByRole('link', { name: 'Energia' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Energia' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });

  /** Esc fecha o menu e o foco volta ao botão que o abriu. */
  it('fecha com Esc', async () => {
    abrirEm('/visao-geral');
    const botao = screen.getByRole('button', { name: 'Abrir menu' });

    await userEvent.click(botao);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });

  /** Fora do shell (Login) não há menu. */
  it('não aparece no Login', () => {
    abrirEm('/login');

    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument();
  });
});
