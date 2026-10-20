/** Verifica operações fixas, validação pública e ausência de replay nas transições. */
import { describe, expect, it, vi } from 'vitest';
import { testRecordFixture as teste, testListFixture, telemetrySampleListFixture, energySummaryListFixture, testComparisonFixture } from '@vers/shared-types';
import { criarEnsaios } from './ensaios';

/** Cria transporte isolado sem rede, sessão ou serviços reais. */
function preparar() {
  const fetch = vi.fn(); const autorizar = vi.fn().mockResolvedValue({ ok: true });
  const flushStore = vi.fn();
  return { fetch, autorizar, flushStore,
    executar: criarEnsaios({ fetch, cookies: { flushStore } }, 'http://localhost:3000/api/v1', autorizar) };
}

describe('ensaios no processo principal', () => {
  it('recusa URL, autoridade, IDs, datas e payloads arbitrários antes da rede', async () => {
    const { executar, fetch, autorizar } = preparar();
    for (const [acao, dados] of [
      ['fetch', { url: 'https://outro.test' }], ['listar', { page: 0 }],
      ['listar', { startedFrom: '2026-02-30T00:00:00.000Z' }],
      ['listar', { startedFrom: '2026-10-20T12:00:00.000Z', startedTo: '2026-10-20T11:00:00.000Z' }],
      ['iniciar', { id: '../users/me' }], ['iniciar', { id: teste.id, dados: { startedAt: 'agora' } }],
      ['criar', { ...teste, userId: teste.createdById }],
      ['finalizar', { id: teste.id, dados: { status: 'RUNNING' } }],
      ['cancelar', { id: teste.id, dados: { reason: null } }],
      ['comparar', { testIds: [teste.id, teste.id.toUpperCase()] }],
    ]) expect(await executar(acao, dados)).toMatchObject({ ok: false, status: 400 });
    expect(fetch).not.toHaveBeenCalled(); expect(autorizar).not.toHaveBeenCalled();
  });

  it('lista com filtros e minimiza resposta e snapshot', async () => {
    const { executar, fetch } = preparar();
    fetch.mockResolvedValue(Response.json({ ...testListFixture, data: [{ ...teste, segredo: 'interno', snapshot: { ...teste.snapshot, segredo: 'interno' } }] }));
    const r = await executar('listar', { page: 1, pageSize: 20, status: 'COMPLETED' });
    expect(r).toEqual({ ok: true, data: [teste], meta: testListFixture.meta });
    expect(fetch.mock.calls[0][0]).toContain('/tests?page=1&pageSize=20&status=COMPLETED');
    expect(JSON.stringify(r)).not.toContain('interno');
  });

  it.each(['iniciar', 'finalizar', 'cancelar'])('obtém CSRF e não repete %s após conflito', async acao => {
    const { executar, fetch, flushStore } = preparar();
    fetch.mockResolvedValueOnce(Response.json({ data: { csrfToken: 'a'.repeat(64) } }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }));
    const dados = acao === 'finalizar' ? { status: 'COMPLETED' } : {};
    expect(await executar(acao, { id: teste.id, dados })).toMatchObject({ ok: false, status: 409 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST', headers: { 'x-csrf-token': 'a'.repeat(64) }, body: JSON.stringify(dados) });
    expect(flushStore).toHaveBeenCalledTimes(1);
  });

  it('renova somente leitura uma vez, e sessão recusada bloqueia a rede', async () => {
    const { executar, fetch, autorizar } = preparar();
    fetch.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(Response.json(testListFixture));
    expect(await executar('listar', {})).toMatchObject({ ok: true });
    expect(autorizar).toHaveBeenCalledTimes(2);
    autorizar.mockResolvedValue({ ok: false, status: 401, erro: 'HTTP' });
    expect(await executar('iniciar', { id: teste.id, dados: {} })).toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['amostras', telemetrySampleListFixture], ['resumos', energySummaryListFixture],
  ] as const)('lê %s apenas do teste autorizado', async (acao, fixture) => {
    const { executar, fetch } = preparar();
    fetch.mockResolvedValueOnce(Response.json(fixture));
    expect(await executar(acao, { id: teste.id, query: {} })).toMatchObject({ ok: true, data: fixture.data });
    fetch.mockResolvedValueOnce(Response.json({ ...fixture, data: [{ ...fixture.data[0], testId: teste.configurationId }] }));
    expect(await executar(acao, { id: teste.id, query: {} })).toMatchObject({ ok: false, erro: 'RESPOSTA_INVALIDA' });
  });

  it('compara parâmetros repetidos e exige correspondência de todos os IDs', async () => {
    const { executar, fetch } = preparar();
    const testIds = testComparisonFixture.items.map(i => i.testId);
    fetch.mockResolvedValueOnce(Response.json({ data: testComparisonFixture }));
    expect(await executar('comparar', { testIds })).toEqual({ ok: true, data: testComparisonFixture });
    expect(new URL(fetch.mock.calls[0][0]).searchParams.getAll('testIds')).toEqual(testIds);
    fetch.mockResolvedValueOnce(Response.json({ data: { items: [] } }));
    expect(await executar('comparar', { testIds })).toMatchObject({ erro: 'RESPOSTA_INVALIDA' });
  });

  it('recusa metadados, enum e valor não finito na resposta', async () => {
    const { executar, fetch } = preparar();
    for (const corpo of [
      { ...testListFixture, meta: { ...testListFixture.meta, totalItems: 2 } },
      { ...testListFixture, data: [{ ...teste, status: 'NOVO' }] },
      { ...testListFixture, data: [{ ...teste, averageSpeedKph: '32' }] },
    ]) {
      fetch.mockResolvedValueOnce(Response.json(corpo));
      expect(await executar('listar', {})).toMatchObject({ erro: 'RESPOSTA_INVALIDA' });
    }
  });
});
