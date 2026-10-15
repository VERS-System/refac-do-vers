/**
 * Testes do interruptor liga/desliga das telas de Configurações.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  /** É um switch nomeado pelo rótulo, refletindo o estado atual. */
  it('é um switch nomeado com o estado atual', () => {
    render(<Toggle label="Notificações" checked onChange={() => {}} />);

    expect(screen.getByRole('switch', { name: 'Notificações' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  /** Clicar pede o estado oposto. */
  it('chama onChange com o estado oposto', async () => {
    const aoMudar = vi.fn();
    render(<Toggle label="Notificações" checked={false} onChange={aoMudar} />);

    await userEvent.click(screen.getByRole('switch', { name: 'Notificações' }));

    expect(aoMudar).toHaveBeenCalledWith(true);
  });

  /** Barra de espaço também alterna (comportamento nativo do botão). */
  it('alterna com a barra de espaço', async () => {
    const aoMudar = vi.fn();
    render(<Toggle label="Notificações" checked onChange={aoMudar} />);

    screen.getByRole('switch', { name: 'Notificações' }).focus();
    await userEvent.keyboard(' ');

    expect(aoMudar).toHaveBeenCalledWith(false);
  });

  /** Desabilitado, não alterna. */
  it('não alterna quando desabilitado', async () => {
    const aoMudar = vi.fn();
    render(<Toggle label="Notificações" checked={false} onChange={aoMudar} disabled />);

    await userEvent.click(screen.getByRole('switch', { name: 'Notificações' }));

    expect(aoMudar).not.toHaveBeenCalled();
  });

  /** A descrição opcional fica associada ao switch. */
  it('associa a descrição ao switch', () => {
    render(
      <Toggle
        label="Notificações"
        description="Avisar quando o ESP32 ficar offline"
        checked
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('switch', { name: 'Notificações' })).toHaveAccessibleDescription(
      'Avisar quando o ESP32 ficar offline',
    );
  });
});
