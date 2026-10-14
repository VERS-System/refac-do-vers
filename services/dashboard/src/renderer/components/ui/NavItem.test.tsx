/**
 * Testes do item de navegação da sidebar.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Activity, LayoutDashboard } from 'lucide-react';
import { NavItem } from './NavItem';

/** Renderiza dois itens com a rota atual informada. */
function renderizarEm(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <nav>
        <NavItem to="/visao-geral" icon={LayoutDashboard} label="Visão geral" />
        <NavItem to="/telemetria" icon={Activity} label="Telemetria" />
      </nav>
    </MemoryRouter>,
  );
}

describe('NavItem', () => {
  /** É um link para a rota, nomeado pelo rótulo. */
  it('é um link para a rota', () => {
    renderizarEm('/visao-geral');

    expect(screen.getByRole('link', { name: 'Telemetria' })).toHaveAttribute('href', '/telemetria');
  });

  /** O item da rota atual é marcado como página atual; os outros não. */
  it('marca o item da rota atual', () => {
    renderizarEm('/telemetria');

    expect(screen.getByRole('link', { name: 'Telemetria' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
  });

  /** O ícone é decorativo. */
  it('usa ícone decorativo', () => {
    renderizarEm('/visao-geral');

    expect(screen.getByRole('link', { name: 'Visão geral' }).querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
