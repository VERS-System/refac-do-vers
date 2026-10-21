/** Verifica limites do IPC de cadastro sem depender de serviços ou cookies reais. */
import { describe, expect, it, vi } from 'vitest';
import { vehicleFixture } from '@vers/shared-types';
import { criarCadastro } from './cadastro';

const id = '00000000-0000-4000-8000-000000000001';
describe('cadastro principal', () => {
  it('recusa operação, UUID, página e campos arbitrários antes da rede', async () => {
    const fetch = vi.fn(); const autorizar = vi.fn();
    const cadastro = criarCadastro({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1', autorizar);
    for (const [acao, dados] of [['url', {}], ['instalacoes', { id: '../users/me', pagina: 1 }], ['veiculos', { pagina: 0 }], ['veiculos', { pagina: 1, headers: {} }], ['criarVeiculo', { licensePlate: 'ABC1D23', userId: id }], ['atualizarVeiculo', { id, dados: { licensePlate: 'DEF1D23' } }]]) {
      expect(await cadastro(acao, dados)).toMatchObject({ ok: false, status: 400 });
    }
    expect(fetch).not.toHaveBeenCalled(); expect(autorizar).not.toHaveBeenCalled();
  });
  it('minimiza veículo e devolve paginação sem campos internos', async () => {
    const meta = { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 };
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: [{ ...vehicleFixture, segredo: 'privado' }], meta }));
    const cadastro = criarCadastro({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1', vi.fn().mockResolvedValue({ ok: true }));
    const resultado = await cadastro('veiculos', { pagina: 1 });
    expect(resultado).toEqual({ ok: true, data: [vehicleFixture], meta });
    expect(JSON.stringify(resultado)).not.toContain('privado');
    expect(fetch.mock.calls[0][0]).toContain('/vehicles?page=1&pageSize=100');
  });
  it('DELETE envia substituto na query, obtém CSRF e não repete após409', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: { csrfToken: 'a'.repeat(64) } }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }));
    const cadastro = criarCadastro({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1', vi.fn().mockResolvedValue({ ok: true }));
    expect(await cadastro('removerVeiculo', { id, substitutoId: id })).toMatchObject({ ok: false, status: 409 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toBe(`http://localhost:3000/api/v1/vehicles/${id}?replacementVehicleId=${id}`);
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'DELETE', headers: { 'x-csrf-token': 'a'.repeat(64) } });
  });
  it('falha de sessão bloqueia mutação e resposta inválida não vira dado', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: [{ id }] }));
    const autorizar = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, erro: 'HTTP' }).mockResolvedValue({ ok: true });
    const cadastro = criarCadastro({ fetch, cookies: { flushStore: vi.fn() } }, 'http://localhost:3000/api/v1', autorizar);
    expect(await cadastro('criarVeiculo', { licensePlate: 'ABC1D23' })).toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
    expect(await cadastro('veiculos', { pagina: 1 })).toMatchObject({ ok: false, erro: 'RESPOSTA_INVALIDA' });
  });
});
