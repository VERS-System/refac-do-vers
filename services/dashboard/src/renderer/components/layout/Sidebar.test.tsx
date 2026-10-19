/**
 * Testes da sidebar do app (logo, navegação, card do ESP32 e usuário).
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import type { DispositivoResumo, Usuario } from '@/data/tipos';

const USUARIO: Usuario = {
  id: 'u1',
  nome: 'Ana Silva',
  email: 'ana.silva@vers.com',
  emailVerificado: true,
  funcao: 'Administradora',
};
const DISPOSITIVO: DispositivoResumo = {
  nome: 'ESP32 · VERS-01',
  online: true,
  firmware: '0.4.2',
  vistoHa: 'há 3 s',
  protocolo: 'MQTT',
};

/** Renderiza a sidebar na rota informada. */
function renderizar(rota = '/visao-geral', aoSair = vi.fn(), dispositivo = DISPOSITIVO) {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Sidebar usuario={USUARIO} dispositivo={dispositivo} onSair={aoSair} />
    </MemoryRouter>,
  );
  return aoSair;
}

describe('Sidebar', () => {
  /** Mostra o logo oficial. */
  it('mostra o logo do VERS', () => {
    renderizar();

    expect(screen.getByRole('img', { name: 'VERS' })).toBeInTheDocument();
  });

  /** A navegação principal tem as 7 telas internas, na ordem do DESIGN.md. */
  it('lista as 7 telas internas na ordem do DESIGN.md', () => {
    renderizar();

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([
      'Visão geral',
      'Telemetria',
      'Energia',
      'Testes',
      'Veículos',
      'Veículo e instalação',
      'Viber IA',
      'Configurações',
    ]);
  });

  /** O item da rota atual fica marcado. */
  it('marca o item da rota atual', () => {
    renderizar('/energia');

    expect(screen.getByRole('link', { name: 'Energia' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
  });

  /** O destaque do item ativo é um só e desliza até a rota atual (Fase 5). */
  it('leva o destaque até o item da rota', () => {
    renderizar('/energia');

    const destaques = document.querySelectorAll('[data-slot="indicador-nav"]');
    expect(destaques).toHaveLength(1);
    expect(destaques[0]).toHaveAttribute('aria-hidden', 'true');
    expect(destaques[0]).toHaveAttribute('data-alvo', '/energia');
  });

  /** O card do dispositivo mostra nome, status, firmware e protocolo. */
  it('mostra o status do ESP32', () => {
    renderizar();

    const card = screen.getByRole('region', { name: 'ESP32 · VERS-01' });
    expect(within(card).getByText('Online')).toBeInTheDocument();
    expect(within(card).getByText(/Firmware 0\.4\.2/)).toBeInTheDocument();
    expect(within(card).getByText('MQTT')).toBeInTheDocument();
    // Online, só o ponto pulsa (DESIGN.md: pulso sutil no ponto ao vivo).
    expect(card.querySelectorAll('.ponto-vivo')).toHaveLength(1);
  });

  /** Dispositivo desconectado aparece como Offline, sem pulso. */
  it('mostra Offline quando o ESP32 está desconectado', () => {
    renderizar('/visao-geral', vi.fn(), { ...DISPOSITIVO, online: false });

    expect(screen.getByText('Offline')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'ESP32 · VERS-01' });
    expect(card.querySelector('.ponto-vivo')).toBeNull();
  });

  /** A linha do usuário mostra nome, função e o botão de sair. */
  it('mostra o usuário e chama onSair ao clicar em Sair', async () => {
    const aoSair = renderizar();

    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Administradora')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  /** Enquanto os dados não chegam, a sidebar funciona e indica o carregamento. */
  it('mostra o carregamento sem usuário e dispositivo', () => {
    render(
      <MemoryRouter initialEntries={['/visao-geral']}>
        <Sidebar onSair={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByText('Conectando ao dispositivo…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });
});
