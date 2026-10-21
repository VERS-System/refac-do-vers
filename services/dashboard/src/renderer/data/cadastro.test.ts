/** Confere paginação completa, tradução e preservação de ausência de dados reais. */
import { describe, expect, it, vi } from 'vitest';
import { vehicleFixture, installationFixture, configurationFixture } from '@vers/shared-types';
import type { PonteCadastro } from '../../shared/cadastro';
import { criarCadastro } from './cadastro';

/** Cria ponte mínima para testar contratos sem autenticação ou rede simulada adicional. */
function preparar() {
  const ponte = { veiculos: vi.fn(), criarVeiculo: vi.fn(), atualizarVeiculo: vi.fn(), removerVeiculo: vi.fn(), instalacoes: vi.fn(), configuracoes: vi.fn() } satisfies PonteCadastro;
  const expirar = vi.fn();
  return { ponte, expirar, repo: criarCadastro(ponte, expirar) };
}
const meta = { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 };
describe('cadastro real', () => {
  it('retorna null sem principal e nunca seleciona o primeiro por conveniência', async () => {
    const f = preparar();
    f.ponte.veiculos.mockResolvedValue({ ok: true, data: [{ ...vehicleFixture, isPrimary: false }], meta: { ...meta, totalItems: 1, totalPages: 1 } });
    expect(await f.repo.obterVeiculoAtivo()).toBeNull();
  });
  it('carrega todas as páginas antes de escolher principal', async () => {
    const f = preparar();
    f.ponte.veiculos.mockResolvedValueOnce({ ok: true, data: Array.from({ length: 100 }, (_, i) => ({ ...vehicleFixture, id: `v${i}`, isPrimary: false })), meta: { ...meta, totalItems: 101, totalPages: 2 } })
      .mockResolvedValueOnce({ ok: true, data: [vehicleFixture], meta: { ...meta, page: 2, totalItems: 101, totalPages: 2 } });
    expect((await f.repo.obterVeiculoAtivo())?.id).toBe(vehicleFixture.id);
    expect(f.ponte.veiculos.mock.calls).toEqual([[1], [2]]);
  });
  it('omite null no cadastro e preserva null na edição', async () => {
    const f = preparar(); f.ponte.criarVeiculo.mockResolvedValue({ ok: true, data: vehicleFixture });
    f.ponte.atualizarVeiculo.mockResolvedValue({ ok: true, data: vehicleFixture });
    await f.repo.criarVeiculo({ placa: 'ABC1D23', fabricante: null, modelo: null, ano: null });
    expect(f.ponte.criarVeiculo).toHaveBeenCalledWith({ licensePlate: 'ABC1D23' });
    await f.repo.atualizarVeiculo(vehicleFixture.id, { fabricante: null, ano: null, principal: true });
    expect(f.ponte.atualizarVeiculo).toHaveBeenCalledWith(vehicleFixture.id, { brand: null, modelYear: null, isPrimary: true });
  });
  it('não fabrica topologia e mantém instaladaEm/dispositivo nulos', async () => {
    const f = preparar();
    f.ponte.instalacoes.mockResolvedValue({ ok: true, data: [{ ...installationFixture, installedAt: null, activeDevice: null }], meta: { ...meta, totalItems: 1, totalPages: 1 } });
    f.ponte.configuracoes.mockResolvedValue({ ok: true, data: [configurationFixture], meta: { ...meta, totalItems: 1, totalPages: 1 } });
    const [i] = await f.repo.listarInstalacoes(vehicleFixture.id);
    expect(i.instaladaEm).toBeNull(); expect(i.dispositivo).toBeNull();
    const [c] = await f.repo.obterConfiguracoes(i.id);
    expect(c.piezosTotal).toBeNull(); expect(c.piezosInativos).toBeNull();
    expect(c.piezosAtivos).toBe(configurationFixture.activePiezoCount);
  });
  it('erro/404 não vira ausência e401 encerra identidade', async () => {
    const f = preparar(); f.ponte.instalacoes.mockResolvedValue({ ok: false, status: 404, erro: 'HTTP' });
    await expect(f.repo.listarInstalacoes(vehicleFixture.id)).rejects.toMatchObject({ codigo: 'nao-encontrado' });
    f.ponte.removerVeiculo.mockResolvedValue({ ok: false, status: 401, erro: 'HTTP' });
    await expect(f.repo.removerVeiculo(vehicleFixture.id)).rejects.toThrow();
    expect(f.expirar).toHaveBeenCalledOnce();
  });
  it('falha ao receber paginação inconsistente ou acima do limite explícito', async () => {
    const f = preparar(); f.ponte.veiculos.mockResolvedValue({ ok: true, data: [], meta: { ...meta, totalItems: 10001, totalPages: 101 } });
    await expect(f.repo.obterVeiculos()).rejects.toThrow();
    expect(f.ponte.veiculos).toHaveBeenCalledOnce();
  });
});
