// Verifica telemetria, resumos e comparação por HTTP/JWT com fonte sintética isolada.
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { EnergySummary, Prisma } from '@prisma/client';
import { energySummaryFixture } from '../../../../../packages/shared-types/src/fixtures';
import { configureApplication } from '../../main';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginAttemptsService } from '../auth/login-attempts.service';
import { createTelemetryFixtures } from './fixtures/telemetry.fixtures';

const userId = '00000000-0000-4000-8000-000000000001';
const sid = '00000000-0000-4000-8000-000000000002';
const testId = '00000000-0000-4000-8000-000000000301';
const installationId = '00000000-0000-4000-8000-000000000201';
const comparisonIds = [testId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000304',
  '00000000-0000-4000-8000-000000000305'];
const secret = 'access-sintetico-com-mais-de-16-caracteres';
const accessWhere = { OR: [{ createdById: userId }, { installation: { vehicle: { users: { some: { userId } } } } }] };
const publicKeys = ['id', 'testId', 'capturedAt', 'voltageV', 'currentA', 'powerW', 'devicePowerW',
  'accumulatedEnergyWh', 'accelerationXMs2', 'accelerationYMs2', 'accelerationZMs2', 'vibrationRmsMs2',
  'temperatureC', 'activePiezoCount', 'quality'];
const summaryKeys = Object.keys(energySummaryFixture);

/** Converte a fixture pública em linha Prisma com campos internos para verificar a projeção. */
function summaryRow(): EnergySummary {
  return { ...energySummaryFixture, installationId, periodStart: new Date(energySummaryFixture.periodStart),
    periodEnd: new Date(energySummaryFixture.periodEnd), calculatedAt: new Date(energySummaryFixture.calculatedAt),
    createdAt: new Date('2026-09-22T12:06:00Z'), calculationVersion: 1,
    moneySaved: new Prisma.Decimal('0.123456'), energyTariffPerKwh: new Prisma.Decimal('0.12345678'), currencyCode: 'BRL' };
}

/** Usa parâmetros repetidos do contrato, sem transformar a lista em CSV ou JSON. */
function comparisonQuery(ids: readonly string[]): string {
  return '?' + ids.map((id) => 'testIds=' + encodeURIComponent(id)).join('&');
}

describe('consulta autorizada de telemetria', () => {
  let app: INestApplication;
  let url: string;
  let access: string;
  const originalEnv = { ...process.env };
  const findUser = jest.fn(); const findSession = jest.fn();
  const findTest = jest.fn(); const findMany = jest.fn(); const count = jest.fn(); const transaction = jest.fn();
  const findInstallation = jest.fn(); const findSummaries = jest.fn(); const countSummaries = jest.fn();
  const findTests = jest.fn();
  const tx = { test: { findFirst: findTest, findMany: findTests }, telemetrySample: { findMany, count },
    versInstallation: { findFirst: findInstallation }, energySummary: { findMany: findSummaries, count: countSummaries } };

  /** Envia leitura sem CSRF e usa exclusivamente o cookie de sessão quando solicitado. */
  function request(query = '', token: string | null = access, id = testId): Promise<Response> {
    return fetch(`${url}/api/v1/tests/${id}/telemetry${query}`, { headers: token === null ? {} : { Cookie: `vers_access=${token}` } });
  }

  /** Consulta resumos com cookie de sessão e permite trocar ID sem enviar identidade no body. */
  function summaryRequest(resource: 'tests' | 'installations', query = '', token: string | null = access,
    id = resource === 'tests' ? testId : installationId): Promise<Response> {
    return fetch(`${url}/api/v1/${resource}/${id}/energy-summaries${query}`,
      { headers: token === null ? {} : { Cookie: `vers_access=${token}` } });
  }

  /** Consulta comparação sem body ou CSRF e permite ensaiar formatos inválidos da query. */
  function comparisonRequest(query = comparisonQuery(comparisonIds.slice(0, 2)), token: string | null = access): Promise<Response> {
    return fetch(`${url}/api/v1/test-comparisons${query}`,
      { headers: token === null ? {} : { Cookie: `vers_access=${token}` } });
  }

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: 'postgresql://user:password@localhost:5432/vers_test',
      JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: 'refresh-sintetico-com-mais-de-16-caracteres',
      NODE_ENV: 'test', API_PREFIX: 'api/v1', CORS_ORIGINS: 'http://localhost:3001' });
    const { AppModule } = await import('../../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({ ...tx, $transaction: transaction,
        user: { findUnique: findUser }, refreshSession: { findUnique: findSession } })
      .overrideProvider(LoginAttemptsService).useValue({}).compile();
    app = moduleRef.createNestApplication({ logger: false }); configureApplication(app, app.get(ConfigService));
    await app.init(); const server = app.getHttpServer() as Server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    access = await new JwtService().signAsync({ sub: userId, sid, typ: 'access' }, { secret, expiresIn: '15m' });
  });
  beforeEach(() => {
    jest.resetAllMocks();
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role: 'USER' }] });
    findSession.mockResolvedValue({ id: sid, userId, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    findTest.mockResolvedValue({ id: testId });
    findMany.mockResolvedValue(createTelemetryFixtures().regular.samples); count.mockResolvedValue(3);
    findInstallation.mockResolvedValue({ id: installationId });
    findSummaries.mockResolvedValue([summaryRow()]); countSummaries.mockResolvedValue(1);
    findTests.mockResolvedValue([{ id: testId, energySummaries: [summaryRow()] },
      { id: comparisonIds[1], energySummaries: [] }]);
    transaction.mockImplementation(async (callback: (db: typeof tx) => unknown) => callback(tx));
  });
  afterAll(async () => { if (app) await app.close(); process.env = originalEnv; });

  it('consulta pai, filtros e contagem no mesmo snapshot e retorna somente campos públicos', async () => {
    const response = await request('?page=2&pageSize=2&quality=VALID&capturedFrom=2026-10-13T00:00:00Z&capturedTo=2026-10-13T00:02:00Z');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
    expect(body.requestId).toBe(response.headers.get('x-request-id'));
    expect(Object.keys(body.data[0]).sort()).toEqual([...publicKeys].sort());
    expect(body.data[0]).toMatchObject({ testId, capturedAt: '2026-10-13T00:00:00.000Z', powerW: 2, devicePowerW: 20 });
    expect(findTest.mock.calls[0][0]).toEqual({ where: { id: testId, ...accessWhere }, select: { id: true } });
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { testId, test: accessWhere, quality: 'VALID',
      capturedAt: { gte: new Date('2026-10-13T00:00:00Z'), lt: new Date('2026-10-13T00:02:00Z') } },
      skip: 2, take: 2, orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }] });
    expect(Object.keys(findMany.mock.calls[0][0].select).sort()).toEqual([...publicKeys].sort());
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
    expect(findTest.mock.invocationCallOrder[0]).toBeLessThan(findMany.mock.invocationCallOrder[0]);
  });
  it('vazio autorizado usa padrões 1/20 e não confunde ausência de teste com lista vazia', async () => {
    findMany.mockResolvedValue([]); count.mockResolvedValue(0);
    const response = await request(); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20, where: { testId, test: accessWhere } });
  });
  it('preserva null, zero e histórico após remoção de referências sem expor origem interna', async () => {
    findTest.mockResolvedValue({ id: testId, createdById: userId, installationId: null });
    const fixtures = createTelemetryFixtures();
    findMany.mockResolvedValue([fixtures.absent.samples[0], { ...fixtures.zero.samples[1], deviceId: null, installationId: null, messageId: null }]);
    const response = await request(); expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data[0]).toMatchObject({ voltageV: null, currentA: null, powerW: null, accumulatedEnergyWh: null });
    expect(data[1]).toMatchObject({ voltageV: 4, currentA: 0, powerW: 0, accumulatedEnergyWh: 10 });
    for (const row of data) expect(Object.keys(row).sort()).toEqual([...publicKeys].sort());
  });
  it('ordena timestamps empatados pelo ID sem deduplicar leituras no endpoint', async () => {
    const samples = createTelemetryFixtures().regular.samples;
    findMany.mockResolvedValue([{ ...samples[0] }, { ...samples[1], capturedAt: samples[0].capturedAt }]);
    const response = await request(); expect(response.status).toBe(200);
    expect((await response.json()).data).toHaveLength(2);
    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ capturedAt: 'asc' }, { id: 'asc' }]);
  });
  it.each(['USER', 'ADMIN'])('teste alheio/ausente usa TEST_NOT_FOUND para %s, sem consultar amostras', async (role) => {
    findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role }] }); findTest.mockResolvedValue(null);
    const response = await request(); expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'TEST_NOT_FOUND' } });
    expect(findTest.mock.calls[0][0].where).toEqual({ id: testId, ...accessWhere });
    expect(findMany).not.toHaveBeenCalled(); expect(count).not.toHaveBeenCalled();
  });
  it.each(['VALID', 'PARTIAL', 'SUSPECT', 'INVALID'])('aceita filtro de qualidade %s sem alterá-lo', async (quality) => {
    expect((await request('?quality=' + quality)).status).toBe(200);
    expect(findMany.mock.calls[0][0].where.quality).toBe(quality);
  });
  it.each(['capturedFrom', 'capturedTo'])('aceita limite UTC isolado %s e página máxima', async (field) => {
    expect((await request(`?${field}=2026-10-13T00:00:00Z&pageSize=100`)).status).toBe(200);
    expect(findMany.mock.calls[0][0].where.capturedAt).toEqual({ [field === 'capturedFrom' ? 'gte' : 'lt']: new Date('2026-10-13T00:00:00Z') });
    expect(findMany.mock.calls[0][0].take).toBe(100);
  });
  it.each(['?page=0', '?pageSize=101', '?page=1.5', '?quality=GOOD', '?quality=VALID&quality=PARTIAL',
    '?capturedFrom=2026-02-31T00:00:00Z', '?capturedTo=ruim', '?capturedFrom=2026-10-13T00:00:00-03:00',
    '?capturedFrom=2026-10-13T00:02:00Z&capturedTo=2026-10-13T00:01:00Z',
    '?capturedFrom=2026-10-13T00:01:00Z&capturedTo=2026-10-13T00:01:00Z', '?deviceId=' + sid,
    '?startedFrom=2026-10-13T00:00:00Z', '?userId=' + userId])('recusa filtros inválidos antes da consulta: %s', async (query) => {
    const response = await request(query); expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(transaction).not.toHaveBeenCalled();
  });
  it('recusa UUID inválido antes de consultar o pai', async () => {
    expect((await request('', access, 'ruim')).status).toBe(400); expect(findTest).not.toHaveBeenCalled();
  });
  it.each([null, 'malformado'])('exige access cookie válido: %s', async (token) => {
    expect((await request('', token)).status).toBe(401); expect(transaction).not.toHaveBeenCalled();
  });
  it('recusa sessão revogada sem acessar dados', async () => {
    findSession.mockResolvedValue({ userId, revokedAt: new Date() });
    expect((await request()).status).toBe(401); expect(transaction).not.toHaveBeenCalled();
  });
  it.each(['parent', 'samples', 'count'])('falha de %s não expõe detalhes internos', async (operation) => {
    const failure = new Error('segredo-sintetico');
    if (operation === 'parent') findTest.mockRejectedValue(failure);
    if (operation === 'samples') findMany.mockRejectedValue(failure);
    if (operation === 'count') count.mockRejectedValue(failure);
    const response = await request(); expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('segredo-sintetico');
  });

  describe.each(['tests', 'installations'] as const)('resumos por %s', (resource) => {
    const installationAccess = { vehicle: { users: { some: { userId } } } };
    const source = resource === 'tests' ? { testId, test: accessWhere } :
      { installationId, installation: installationAccess };
    const parent = resource === 'tests' ? findTest : findInstallation;
    const id = resource === 'tests' ? testId : installationId;

    it('consulta pai, versão ativa e filtros no mesmo snapshot, com decimais públicos exatos', async () => {
      countSummaries.mockResolvedValue(3);
      const response = await summaryRequest(resource,
        '?page=2&pageSize=2&periodType=DAY&periodFrom=2026-09-22T00:00:00Z&periodTo=2026-09-23T00:00:00Z');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.meta).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
      expect(body.requestId).toBe(response.headers.get('x-request-id'));
      expect(body.data[0]).toMatchObject({ periodStart: energySummaryFixture.periodStart,
        periodEnd: energySummaryFixture.periodEnd, calculatedAt: energySummaryFixture.calculatedAt,
        moneySaved: '0.123456', energyTariffPerKwh: '0.12345678', vehicleEnergyUsedWh: null });
      expect(Object.keys(body.data[0]).sort()).toEqual([...summaryKeys].sort());
      expect(parent.mock.calls[0][0]).toEqual({ where: { id,
        ...(resource === 'tests' ? accessWhere : installationAccess) }, select: { id: true } });
      expect(findSummaries.mock.calls[0][0]).toMatchObject({ where: { ...source, calculationVersion: 1,
        periodType: 'DAY', periodStart: { gte: new Date('2026-09-22T00:00:00Z'), lt: new Date('2026-09-23T00:00:00Z') } },
        skip: 2, take: 2, orderBy: [{ periodStart: 'asc' }, { id: 'asc' }] });
      expect(Object.keys(findSummaries.mock.calls[0][0].select).sort()).toEqual([...summaryKeys].sort());
      expect(countSummaries.mock.calls[0][0].where).toEqual(findSummaries.mock.calls[0][0].where);
      expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
      expect(parent.mock.invocationCallOrder[0]).toBeLessThan(findSummaries.mock.invocationCallOrder[0]);
    });
    it('retorna vazio autorizado com defaults 1/20 e sem resumo artificial', async () => {
      findSummaries.mockResolvedValue([]); countSummaries.mockResolvedValue(0);
      const response = await summaryRequest(resource);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
      expect(findSummaries.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20,
        where: { ...source, calculationVersion: 1 } });
      expect(findSummaries.mock.calls[0][0].where.periodType).toBeUndefined();
      expect(findSummaries.mock.calls[0][0].where.periodStart).toBeUndefined();
    });
    it('preserva zero, null e qualidade sem promover INVALID ou expor versão/createdAt', async () => {
      findSummaries.mockResolvedValue([{ ...summaryRow(), recoveredEnergyWh: 0, averagePowerW: 0,
        peakPowerW: null, sampleCount: 0, quality: 'INVALID', moneySaved: new Prisma.Decimal(0),
        energyTariffPerKwh: null }]);
      const response = await summaryRequest(resource); expect(response.status).toBe(200);
      const { data } = await response.json();
      expect(data[0]).toMatchObject({ recoveredEnergyWh: 0, averagePowerW: 0, peakPowerW: null,
        sampleCount: 0, quality: 'INVALID', moneySaved: '0', energyTariffPerKwh: null });
      expect(Object.keys(data[0]).sort()).toEqual([...summaryKeys].sort());
    });
    it.each(['TEST', 'HOUR', 'DAY', 'MONTH'])('aceita período %s sem inferir outra regra', async (periodType) => {
      expect((await summaryRequest(resource, '?periodType=' + periodType)).status).toBe(200);
      expect(findSummaries.mock.calls[0][0].where.periodType).toBe(periodType);
    });
    it.each(['periodFrom', 'periodTo'])('aceita limite isolado %s e tamanho máximo', async (field) => {
      expect((await summaryRequest(resource, `?${field}=2026-09-22T00:00:00Z&pageSize=100`)).status).toBe(200);
      expect(findSummaries.mock.calls[0][0].where.periodStart).toEqual({
        [field === 'periodFrom' ? 'gte' : 'lt']: new Date('2026-09-22T00:00:00Z') });
      expect(findSummaries.mock.calls[0][0].take).toBe(100);
    });
    it.each(['USER', 'ADMIN'])('404 de recurso alheio ou ausente para %s precede consulta de resumos', async (role) => {
      findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role }] }); parent.mockResolvedValue(null);
      const response = await summaryRequest(resource); expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: resource === 'tests' ? 'TEST_NOT_FOUND' : 'INSTALLATION_NOT_FOUND' } });
      expect(parent.mock.calls[0][0].where).toEqual({ id, ...(resource === 'tests' ? accessWhere : installationAccess) });
      expect(findSummaries).not.toHaveBeenCalled(); expect(countSummaries).not.toHaveBeenCalled();
    });
    it.each(['?page=0', '?pageSize=101', '?pageSize=0', '?page=1.5', '?periodType=VALID',
      '?periodType=DAY&periodType=HOUR', '?periodFrom=2026-02-31T00:00:00Z', '?periodTo=ruim',
      '?periodFrom=2026-09-22T00:00:00-03:00', '?periodFrom=2026-09-23T00:00:00Z&periodTo=2026-09-22T00:00:00Z',
      '?periodFrom=2026-09-22T00:00:00Z&periodTo=2026-09-22T00:00:00Z', '?calculationVersion=2',
      '?quality=GOOD', '?userId=' + userId, '?capturedFrom=2026-09-22T00:00:00Z'])('recusa filtro inválido %s', async (query) => {
      const response = await summaryRequest(resource, query); expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(transaction).not.toHaveBeenCalled();
    });
    it('recusa UUID inválido antes da consulta', async () => {
      expect((await summaryRequest(resource, '', access, 'ruim')).status).toBe(400);
      expect(transaction).not.toHaveBeenCalled();
    });
    it.each([null, 'malformado'])('exige cookie válido %s', async (token) => {
      expect((await summaryRequest(resource, '', token)).status).toBe(401);
      expect(transaction).not.toHaveBeenCalled();
    });
    it('recusa sessão revogada antes de acessar resumos', async () => {
      findSession.mockResolvedValue({ userId, revokedAt: new Date() });
      expect((await summaryRequest(resource)).status).toBe(401);
      expect(transaction).not.toHaveBeenCalled();
    });
    it.each(['parent', 'rows', 'count'])('falha de %s não expõe detalhes de persistência', async (operation) => {
      const error = new Error('segredo-sintetico');
      if (operation === 'parent') parent.mockRejectedValue(error);
      if (operation === 'rows') findSummaries.mockRejectedValue(error);
      if (operation === 'count') countSummaries.mockRejectedValue(error);
      const response = await summaryRequest(resource); expect(response.status).toBe(500);
      expect(JSON.stringify(await response.json())).not.toContain('segredo-sintetico');
    });
  });
  it('criador consulta resumos históricos após instalação removida com referências null', async () => {
    findTest.mockResolvedValue({ id: testId, createdById: userId, installationId: null });
    findSummaries.mockResolvedValue([{ ...summaryRow(), installationId: null, moneySaved: null,
      currencyCode: null, energyTariffPerKwh: null }]);
    const response = await summaryRequest('tests'); expect(response.status).toBe(200);
    expect((await response.json()).data[0]).toMatchObject({ testId, installationId: null,
      moneySaved: null, currencyCode: null, energyTariffPerKwh: null });
    expect(findSummaries.mock.calls[0][0].where.test).toEqual(accessWhere);
    expect(findInstallation).not.toHaveBeenCalled();
  });

  describe('comparação de testes', () => {
    it('preserva ordem enviada e projeta um resumo TEST ativo por teste no mesmo snapshot', async () => {
      const ids = [comparisonIds[1], testId];
      const response = await comparisonRequest(comparisonQuery(ids)); expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.requestId).toBe(response.headers.get('x-request-id'));
      expect(Object.keys(body.data)).toEqual(['items']);
      expect(body.data.items.map((item: { testId: string }) => item.testId)).toEqual(ids);
      expect(body.data.items[0]).toEqual({ testId: ids[0], summary: null });
      expect(Object.keys(body.data.items[1]).sort()).toEqual(['summary', 'testId']);
      expect(Object.keys(body.data.items[1].summary).sort()).toEqual([...summaryKeys].sort());
      expect(body.data.items[1].summary).toMatchObject({ moneySaved: '0.123456',
        energyTariffPerKwh: '0.12345678', periodStart: energySummaryFixture.periodStart, quality: 'GOOD' });
      const query = findTests.mock.calls[0][0];
      expect(query.where).toEqual({ id: { in: ids }, ...accessWhere });
      expect(query.select.id).toBe(true);
      expect(query.select.energySummaries).toMatchObject({ where: { periodType: 'TEST', calculationVersion: 1 },
        take: 1, orderBy: [{ periodStart: 'desc' }, { calculatedAt: 'desc' }, { id: 'asc' }] });
      expect(Object.keys(query.select.energySummaries.select).sort()).toEqual([...summaryKeys].sort());
      expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
      expect(findTests).toHaveBeenCalledTimes(1);
      expect(findSummaries).not.toHaveBeenCalled(); expect(countSummaries).not.toHaveBeenCalled();
    });
    it('aceita cinco testes sem consulta individual de cada pai', async () => {
      findTests.mockResolvedValue(comparisonIds.map((id) => ({ id, energySummaries: [] })));
      const response = await comparisonRequest(comparisonQuery(comparisonIds)); expect(response.status).toBe(200);
      expect((await response.json()).data.items).toEqual(comparisonIds.map((testId) => ({ testId, summary: null })));
      expect(findTests).toHaveBeenCalledTimes(1);
    });
    it('mantém ID em maiúsculas na saída e encontra seu resumo pelo UUID canônico', async () => {
      findTests.mockResolvedValue([{ id: testId, energySummaries: [] },
        { id: comparisonIds[1], energySummaries: [{ ...summaryRow(), testId: comparisonIds[1] }] }]);
      const ids = [comparisonIds[1].toUpperCase(), testId];
      const response = await comparisonRequest(comparisonQuery(ids)); expect(response.status).toBe(200);
      const { items } = (await response.json()).data;
      expect(items[0]).toMatchObject({ testId: ids[0], summary: { testId: comparisonIds[1] } });
      expect(items[1]).toEqual({ testId, summary: null });
    });
    it('INVALID mais recente vira null sem escolher o resumo antigo válido', async () => {
      findTests.mockResolvedValue([{ id: testId, energySummaries: [{ ...summaryRow(), quality: 'INVALID' }, summaryRow()] },
        { id: comparisonIds[1], energySummaries: [] }]);
      const response = await comparisonRequest(); expect(response.status).toBe(200);
      expect((await response.json()).data.items).toEqual(comparisonIds.slice(0, 2).map((testId) => ({ testId, summary: null })));
      expect(findTests.mock.calls[0][0].select.energySummaries.where.quality).toBeUndefined();
    });
    it('PARTIAL permanece explícito e zero medido não vira ausência', async () => {
      findTests.mockResolvedValue([{ id: testId, energySummaries: [{ ...summaryRow(), quality: 'PARTIAL', recoveredEnergyWh: 0 }] },
        { id: comparisonIds[1], energySummaries: [] }]);
      const response = await comparisonRequest(); expect(response.status).toBe(200);
      expect((await response.json()).data.items[0].summary).toMatchObject({ quality: 'PARTIAL', recoveredEnergyWh: 0 });
    });
    it('preserva resumo histórico sem instalação, autorizado pelo criador', async () => {
      findTests.mockResolvedValue([{ id: testId, createdById: userId, installationId: null,
        energySummaries: [{ ...summaryRow(), installationId: null, moneySaved: null, energyTariffPerKwh: null }] },
      { id: comparisonIds[1], energySummaries: [] }]);
      const response = await comparisonRequest(); expect(response.status).toBe(200);
      expect((await response.json()).data.items[0].summary).toMatchObject({ installationId: null,
        moneySaved: null, energyTariffPerKwh: null });
      expect(findTests.mock.calls[0][0].where.OR).toEqual(accessWhere.OR);
      expect(findInstallation).not.toHaveBeenCalled();
    });
    it.each(['USER', 'ADMIN'])('qualquer teste ausente/alheio retorna 404 da operação inteira para %s', async (role) => {
      findUser.mockResolvedValue({ id: userId, status: 'ACTIVE', roles: [{ role }] });
      findTests.mockResolvedValue([{ id: testId, energySummaries: [summaryRow()] }]);
      const response = await comparisonRequest(); expect(response.status).toBe(404);
      const body = await response.json(); expect(body).toMatchObject({ error: { code: 'TEST_NOT_FOUND' } });
      expect(body).not.toHaveProperty('data');
      expect(JSON.stringify(body)).not.toContain(energySummaryFixture.id);
      expect(findTests.mock.calls[0][0].where).toEqual({ id: { in: comparisonIds.slice(0, 2) }, ...accessWhere });
    });
    it.each(['', comparisonQuery([testId]), comparisonQuery([...comparisonIds, sid]),
      comparisonQuery([testId, testId]), comparisonQuery([comparisonIds[1], comparisonIds[1].toUpperCase()]),
      comparisonQuery(['ruim', testId]), comparisonQuery(['', testId]), '?testIds=' + comparisonIds.slice(0, 2).join(','),
      '?testIds=' + encodeURIComponent(JSON.stringify(comparisonIds.slice(0, 2))),
      '?testIds[]=' + testId + '&testIds[]=' + comparisonIds[1],
      comparisonQuery(comparisonIds.slice(0, 2)) + '&userId=' + userId,
      comparisonQuery(comparisonIds.slice(0, 2)) + '&calculationVersion=2',
      comparisonQuery(comparisonIds.slice(0, 2)) + '&periodType=TEST',
      comparisonQuery(comparisonIds.slice(0, 2)) + '&quality=GOOD',
      comparisonQuery(comparisonIds.slice(0, 2)) + '&page=1'])('recusa query fora do contrato: %s', async (query) => {
      const response = await comparisonRequest(query); expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(transaction).not.toHaveBeenCalled();
    });
    it.each([null, 'malformado'])('exige access cookie válido: %s', async (token) => {
      expect((await comparisonRequest(undefined, token)).status).toBe(401);
      expect(transaction).not.toHaveBeenCalled();
    });
    it('recusa sessão revogada antes de consultar qualquer teste', async () => {
      findSession.mockResolvedValue({ userId, revokedAt: new Date() });
      expect((await comparisonRequest()).status).toBe(401); expect(findTests).not.toHaveBeenCalled();
    });
    it('falha da consulta não expõe detalhes internos', async () => {
      findTests.mockRejectedValue(new Error('segredo-sintetico'));
      const response = await comparisonRequest(); expect(response.status).toBe(500);
      expect(JSON.stringify(await response.json())).not.toContain('segredo-sintetico');
    });
  });
});
