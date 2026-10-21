/** Confere mapeamento real, unidades, ordem global e falhas sem fallback. */
import { describe, expect, it, vi } from 'vitest';
import { testRecordFixture as teste, telemetrySampleFixture as amostra, energySummaryFixture as resumo } from '@vers/shared-types';
import type { PonteEnsaios } from '../../shared/ensaios';
import { criarEnsaios } from './ensaios';

/** Cria ponte parcial para verificar apenas as operações do cenário. */
function preparar(operacoes: Partial<PonteEnsaios>) {
  const expirar = vi.fn();
  return { repositorio: criarEnsaios(operacoes as PonteEnsaios, expirar), expirar };
}

describe('adaptador de ensaios', () => {
  it('converte retrato, estado e data para Brasília, mantendo IDs e nulos', async () => {
    const listar = vi.fn().mockResolvedValue({ ok: true, data: [teste], meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
    const { repositorio } = preparar({ listar });
    const r = await repositorio.buscarTestes({ inicioDe: '2026-10-20T00:00:00-03:00', status: 'concluido' });
    expect(listar).toHaveBeenCalledWith({ page: 1, pageSize: 20, status: 'COMPLETED', startedFrom: '2026-10-20T03:00:00.000Z' });
    expect(r.itens[0]).toMatchObject({ id: teste.id, codigo: teste.id, nome: teste.name, estado: 'concluido', terreno: 'cidade',
      inicio: '2026-09-22T09:00:00.000-03:00', observacoes: null, piezosAtivos: 8, versaoConfiguracao: 1 });
  });

  it('exige instalação e configuração e envia somente campos de planejamento', async () => {
    const criar = vi.fn().mockResolvedValue({ ok: true, data: teste });
    const { repositorio } = preparar({ criar });
    const novo = { nome: 'Percurso', terreno: 'cidade' as const, local: 'Pista' };
    await expect(repositorio.criarTeste(novo)).rejects.toMatchObject({ codigo: 'validacao' });
    expect(criar).not.toHaveBeenCalled();
    await repositorio.criarTeste({ ...novo, instalacaoId: teste.installationId!, configuracaoId: teste.configurationId! });
    expect(criar).toHaveBeenCalledWith({ installationId: teste.installationId, configurationId: teste.configurationId,
      name: 'Percurso', terrain: 'CITY', testLocation: 'Pista' });
  });

  it('converte transições e deixa horários a cargo do servidor', async () => {
    const iniciar = vi.fn().mockResolvedValue({ ok: true, data: teste });
    const finalizar = vi.fn().mockResolvedValue({ ok: true, data: teste });
    const cancelar = vi.fn().mockResolvedValue({ ok: true, data: teste });
    const { repositorio } = preparar({ iniciar, finalizar, cancelar });
    await repositorio.iniciarTeste(teste.id);
    await repositorio.finalizarTeste(teste.id, { status: 'falhou', resultado: null, inclinacaoGraus: -3, velocidadeMediaKmh: 0 });
    await repositorio.cancelarTeste(teste.id, { motivo: 'Fim da bancada' });
    expect(iniciar).toHaveBeenCalledWith(teste.id);
    expect(finalizar).toHaveBeenCalledWith(teste.id, { status: 'FAILED', outcome: null, inclineDegrees: -3, averageSpeedKph: 0 });
    expect(cancelar).toHaveBeenCalledWith(teste.id, { reason: 'Fim da bancada' });
  });

  it('usa resumo oficial e converte Wh/W para mWh/mW, sem inventar ausência', async () => {
    const resumos = vi.fn().mockResolvedValueOnce({ ok: true, data: [resumo] }).mockResolvedValueOnce({ ok: true, data: [] });
    const { repositorio } = preparar({ resumos });
    const r = await repositorio.obterResumoTeste(teste.id);
    expect(r).toMatchObject({ testeId: teste.id, picoPotenciaMw: 81, amostras: 50, qualidade: 'boa' });
    expect(r!.energiaRecuperadaMwh).toBeCloseTo(14.2);
    expect(r!.potenciaMediaMw).toBeCloseTo(66.96);
    expect(await repositorio.obterResumoTeste(teste.id)).toBeNull();
  });

  it('preserva a qualidade inválida para a tela distinguir de resumo ausente', async () => {
    const { repositorio } = preparar({ resumos: vi.fn().mockResolvedValue({ ok: true, data: [{ ...resumo, quality: 'INVALID', sampleCount: 0 }] }) });
    expect(await repositorio.obterResumoTeste(teste.id)).toMatchObject({ qualidade: 'invalida', amostras: 0 });
  });

  it('pagina globalmente do mais recente sem baixar todo o teste', async () => {
    const amostras = vi.fn().mockImplementation(async (_id, q) => {
      const inicio = (q.page - 1) * q.pageSize;
      const todos = Array.from({ length: 265 }, (_, i) => ({ ...amostra, id: `amostra-${i}`, currentA: i === 264 ? null : 0.018 }));
      return { ok: true, data: todos.slice(inicio, inicio + q.pageSize), meta: { page: q.page, pageSize: q.pageSize, totalItems: 265, totalPages: Math.ceil(265 / q.pageSize) } };
    });
    const { repositorio } = preparar({ amostras });
    const r = await repositorio.obterAmostrasTelemetria({ testeId: teste.id, pagina: 1, tamanhoPagina: 20 });
    expect(r.itens.map(i => i.id)).toEqual(Array.from({ length: 20 }, (_, i) => `amostra-${264 - i}`));
    expect(r.itens[0]).toMatchObject({ correnteMa: null, piezosTotal: null, temperaturaC: null });
    expect(r.itens[0].potenciaMw).toBeCloseTo(66.96);
    expect(r.itens[1].correnteMa).toBe(18);
    expect(amostras).toHaveBeenCalledTimes(3);
    expect(amostras.mock.calls.map(([, q]) => [q.page, q.pageSize])).toEqual([[1, 1], [13, 20], [14, 20]]);
    const ultima = await repositorio.obterAmostrasTelemetria({ testeId: teste.id, pagina: 14, tamanhoPagina: 20 });
    expect(ultima.itens.map(i => i.id)).toEqual(['amostra-4', 'amostra-3', 'amostra-2', 'amostra-1', 'amostra-0']);
  });

  it('recusa total alterado durante paginação descendente', async () => {
    const amostras = vi.fn().mockResolvedValueOnce({ ok: true, data: [amostra], meta: { page: 1, pageSize: 1, totalItems: 2, totalPages: 2 } })
      .mockResolvedValue({ ok: true, data: [amostra], meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
    const { repositorio } = preparar({ amostras });
    await expect(repositorio.obterAmostrasTelemetria({ testeId: teste.id })).rejects.toMatchObject({ codigo: 'indisponivel' });
  });

  it('não repete conflito, expira em 401 e recusa ponte ausente', async () => {
    const iniciar = vi.fn().mockResolvedValueOnce({ ok: false, status: 409, erro: 'HTTP' }).mockResolvedValue({ ok: false, status: 401, erro: 'HTTP' });
    const { repositorio, expirar } = preparar({ iniciar });
    await expect(repositorio.iniciarTeste(teste.id)).rejects.toMatchObject({ codigo: 'conflito' });
    expect(iniciar).toHaveBeenCalledTimes(1);
    await expect(repositorio.iniciarTeste(teste.id)).rejects.toMatchObject({ codigo: 'sessao-expirada' });
    expect(expirar).toHaveBeenCalledOnce();
    await expect(criarEnsaios(undefined, vi.fn()).buscarTestes({})).rejects.toMatchObject({ codigo: 'indisponivel' });
  });
});
