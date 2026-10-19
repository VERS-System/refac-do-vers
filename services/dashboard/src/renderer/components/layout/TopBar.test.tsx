/**
 * Testes da barra superior das telas internas.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  /** O título da tela é o h1 da página, com o subtítulo ao lado. */
  it('mostra o título como h1 e o subtítulo', () => {
    render(<TopBar title="Visão geral" subtitle="Honda Civic 2026 · ABC1D23" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
    expect(screen.getByText('Honda Civic 2026 · ABC1D23')).toBeInTheDocument();
  });

  /** Regra de honestidade dos dados: o badge aparece por padrão. */
  it('mostra o badge Dados de exemplo por padrão', () => {
    render(<TopBar title="Energia" />);

    expect(screen.getByText('Dados de exemplo')).toBeInTheDocument();
  });

  /** Telas sem medições (como Configurações) podem esconder o badge. */
  it('esconde o badge quando sampleData é falso', () => {
    render(<TopBar title="Configurações" sampleData={false} />);

    expect(screen.queryByText('Dados de exemplo')).not.toBeInTheDocument();
  });

  /** Controles ficam antes do badge e ações depois, como nas referências. */
  it('posiciona controles antes do badge e ações depois', () => {
    render(
      <TopBar
        title="Visão geral"
        controls={<button type="button">Período</button>}
        actions={<button type="button">Notificações</button>}
      />,
    );

    const controle = screen.getByRole('button', { name: 'Período' });
    const badge = screen.getByText('Dados de exemplo');
    const acao = screen.getByRole('button', { name: 'Notificações' });
    expect(controle.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(badge.compareDocumentPosition(acao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
