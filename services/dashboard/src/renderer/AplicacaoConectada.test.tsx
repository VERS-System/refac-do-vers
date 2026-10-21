/** Verifica abertura, proteção e indisponibilidade sem substituir sessão por mocks. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { userProfileFixture } from '@vers/shared-types';
import { AplicacaoConectada } from './AplicacaoConectada';

describe('aplicação conectada', () => {
  beforeEach(() => { window.location.hash = '#/visao-geral'; });
  afterEach(() => { Reflect.deleteProperty(window, 'vers'); vi.restoreAllMocks(); });

  it('aguarda perfil antes de mostrar dados e protege rota anônima', async () => {
    let concluir!: (valor: unknown) => void;
    const perfil = vi.fn().mockImplementation(() => new Promise(ok => { concluir = ok; }));
    window.vers = { plataforma: 'win32', sessao: { perfil } as never };
    render(<AplicacaoConectada />);
    expect(screen.getByText('Verificando sessão…')).toBeInTheDocument();
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    concluir({ ok: false, status: 401, erro: 'HTTP' });
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument();
  });

  it('mostra falha de API e permite nova consulta sem conta de exemplo', async () => {
    const perfil = vi.fn().mockResolvedValueOnce({ ok: false, status: 503, erro: 'HTTP' })
      .mockResolvedValue({ ok: true, usuario: userProfileFixture });
    window.vers = { plataforma: 'win32', sessao: { perfil } as never };
    render(<AplicacaoConectada />);
    expect(await screen.findByRole('alert')).toHaveTextContent('API local');
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText(/Autenticação e cadastro reais/)).toBeInTheDocument();
    expect(await screen.findByText(userProfileFixture.displayName!)).toBeInTheDocument();
  });

  it('logout confirmado limpa cache e troca de conta não reaproveita perfil anterior', async () => {
    const contaA = { ...userProfileFixture, displayName: 'Conta API A' };
    const contaB = { ...userProfileFixture, id: 'outra-conta', displayName: 'Conta API B', email: 'outra@vers.test' };
    let atual = contaA;
    const perfil = vi.fn().mockImplementation(async () => ({ ok: true, usuario: atual }));
    const entrar = vi.fn().mockImplementation(async () => { atual = contaB; return { ok: true, usuario: contaB }; });
    const sair = vi.fn().mockResolvedValue({ ok: true });
    window.vers = { plataforma: 'win32', sessao: { perfil, entrar, sair } as never };
    const limpar = vi.spyOn(QueryClient.prototype, 'clear');
    render(<AplicacaoConectada />);
    expect(await screen.findByText('Conta API A')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
    expect(limpar).toHaveBeenCalled(); expect(screen.queryByText('Conta API A')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('E-mail'), contaB.email);
    await userEvent.type(screen.getByLabelText('Senha'), 'Segredo!1');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Conta API B')).toBeInTheDocument();
    expect(screen.queryByText('Conta API A')).not.toBeInTheDocument();
  });

  it('falha de logout mantém conta e exibe recusa', async () => {
    window.vers = { plataforma: 'win32', sessao: {
      perfil: vi.fn().mockResolvedValue({ ok: true, usuario: { ...userProfileFixture, displayName: 'Conta ativa' } }),
      sair: vi.fn().mockResolvedValue({ ok: false, status: 503, erro: 'HTTP' }),
    } as never };
    render(<AplicacaoConectada />);
    await screen.findByText('Conta ativa');
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByText('Não foi possível confirmar a saída. Tente de novo.')).toBeInTheDocument();
    expect(screen.getByText('Conta ativa')).toBeInTheDocument();
  });

  it('revogação ao retornar ao app remove dados e avisa expiração', async () => {
    const perfil = vi.fn().mockResolvedValue({ ok: true, usuario: { ...userProfileFixture, displayName: 'Conta revogada' } });
    window.vers = { plataforma: 'win32', sessao: { perfil } as never };
    render(<AplicacaoConectada />);
    await screen.findByText('Conta revogada');
    perfil.mockResolvedValue({ ok: false, status: 401, erro: 'HTTP' });
    fireEvent.focus(window);
    expect(await screen.findByText('Sua sessão expirou. Entre de novo.')).toBeInTheDocument();
    expect(screen.queryByText('Conta revogada')).not.toBeInTheDocument();
  });
});
