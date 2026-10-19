// Confere avisos por recursos normalizados sem consultar banco ou publicar em Redis real.
import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import { RealtimeNotificationService } from './realtime-notification.service';
import { MqttPipelineService } from '../mqtt/mqtt-pipeline.service';

const messageId = '00000000-0000-4000-8000-000000000701';
const installationId = '00000000-0000-4000-8000-000000000201';
const testId = '00000000-0000-4000-8000-000000000501';
const event = { version: 1, type: 'telemetry.processed', messageId, correlationId: messageId, occurredAt: '2026-10-15T12:00:00.000Z' };

describe('ponte de avisos de atualização', () => {
  const events = new EventEmitter();
  const summaries = { events: new EventEmitter() };
  const prisma = { telemetrySample: { groupBy: jest.fn() } };
  const redis = { publish: jest.fn() }; let service: RealtimeNotificationService;
  /** Aguarda as tarefas do listener sem encerrar a ponte antes de publicar os avisos. */
  async function emit(input: unknown = event): Promise<void> {
    events.emit('telemetry.processed', input); await jest.advanceTimersByTimeAsync(0);
  }
  beforeEach(() => {
    jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-15T12:00:01.000Z'));
    prisma.telemetrySample.groupBy.mockResolvedValue([]); redis.publish.mockResolvedValue(true);
    service = new RealtimeNotificationService({ events } as never, prisma as never, redis as never, summaries as never);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterEach(async () => { await service.onModuleDestroy(); jest.restoreAllMocks(); jest.clearAllMocks(); jest.useRealTimers(); });
  it('constructor inerte e start idempotente não duplicam listener', () => {
    expect(events.listenerCount('telemetry.processed')).toBe(0); expect(prisma.telemetrySample.groupBy).not.toHaveBeenCalled();
    service.start(); service.start(); expect(events.listenerCount('telemetry.processed')).toBe(1);
  });
  it('agrupa somente IDs normalizados e publica um aviso por recurso distinto', async () => {
    prisma.telemetrySample.groupBy.mockResolvedValue([{ installationId, testId }, { installationId, testId: null },
      { installationId: null, testId }, { installationId: null, testId: null }]); service.start(); await emit();
    expect(prisma.telemetrySample.groupBy).toHaveBeenCalledWith({ by: ['installationId', 'testId'], where: { messageId } });
    expect(redis.publish.mock.calls).toEqual([
      [{ version: 1, type: 'data.updated', resource: { type: 'installation', id: installationId }, occurredAt: '2026-10-15T12:00:01.000Z' }],
      [{ version: 1, type: 'data.updated', resource: { type: 'test', id: testId }, occurredAt: '2026-10-15T12:00:01.000Z' }],
    ]);
  });
  it('leituras sem teste avisam somente a instalação; ausência de amostras não publica', async () => {
    prisma.telemetrySample.groupBy.mockResolvedValueOnce([{ installationId, testId: null }]); service.start(); await emit();
    expect(redis.publish).toHaveBeenCalledTimes(1); await emit(); expect(redis.publish).toHaveBeenCalledTimes(1);
  });
  it('integra pipeline e ponte sem consultar recursos antes de resolver o commit', async () => {
    let commit!: () => void;
    const reception = { receive: jest.fn().mockResolvedValue({ outcome: 'RECEIVED', id: messageId }),
      process: jest.fn(() => new Promise((resolve) => { commit = (): void => { resolve({ outcome: 'PROCESSED', id: messageId }); }; })) };
    const pipeline = new MqttPipelineService({} as never, reception as never, {} as never,
      { onModuleDestroy: async (): Promise<void> => {} } as never);
    service = new RealtimeNotificationService(pipeline, prisma as never, redis as never, summaries as never);
    prisma.telemetrySample.groupBy.mockResolvedValueOnce([{ installationId, testId }]); service.start();
    const pending = pipeline.handle({} as never, new Date()); await jest.advanceTimersByTimeAsync(0);
    expect(prisma.telemetrySample.groupBy).not.toHaveBeenCalled(); expect(redis.publish).not.toHaveBeenCalled();
    commit(); await pending; await jest.advanceTimersByTimeAsync(0);
    expect(redis.publish).toHaveBeenCalledTimes(2); await pipeline.onModuleDestroy();
  });
  it.each([null, {}, { ...event, version: 2 }, { ...event, messageId: 'CANARY_SECRET' },
    { ...event, correlationId: testId }, { ...event, type: 'data.updated' }, { ...event, occurredAt: 'invalid' }])(
    'recusa evento interno inválido sem consultar banco %#', async (input) => {
      service.start(); await emit(input); expect(prisma.telemetrySample.groupBy).not.toHaveBeenCalled();
      expect(redis.publish).not.toHaveBeenCalled();
      expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
    });
  it('falha SQL é contida sem publicar ou registrar causa', async () => {
    prisma.telemetrySample.groupBy.mockRejectedValueOnce(new Error('CANARY_SECRET')); service.start(); await emit();
    expect(redis.publish).not.toHaveBeenCalled(); expect(Logger.prototype.warn).toHaveBeenCalledWith('realtime_notification_failed');
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it.each([false, new Error('CANARY_SECRET')])('falha de publicação não bloqueia próximo recurso nem tenta reenviar %#', async (failure) => {
    prisma.telemetrySample.groupBy.mockResolvedValueOnce([{ installationId, testId }]);
    if (failure instanceof Error) redis.publish.mockRejectedValueOnce(failure); else redis.publish.mockResolvedValueOnce(false);
    service.start(); await emit(); expect(redis.publish).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.warn).toHaveBeenCalledWith('realtime_notification_failed');
  });
  it('shutdown espera lookup iniciado, ignora resultado tardio e remove listener', async () => {
    let finish!: (rows: { installationId: string; testId: string }[]) => void;
    prisma.telemetrySample.groupBy.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    service.start(); await emit(); let closed = false; const closing = service.onModuleDestroy().then(() => { closed = true; });
    await Promise.resolve(); expect(closed).toBe(false); finish([{ installationId, testId }]); await closing;
    expect(redis.publish).not.toHaveBeenCalled(); expect(events.listenerCount('telemetry.processed')).toBe(0);
    expect(() => service.start()).toThrow('REALTIME_NOTIFICATION_STOPPED');
  });
  it.each([installationId, null])('recálculo independente avisa somente recursos confirmados: instalação %s', async (id) => {
    service.start(); service.start();
    summaries.events.emit('summary.test-recomputed', { version: 1, type: 'summary.test-recomputed', testId, installationId: id });
    await jest.advanceTimersByTimeAsync(0);
    expect(prisma.telemetrySample.groupBy).not.toHaveBeenCalled();
    expect(redis.publish.mock.calls.map(([notice]) => notice.resource)).toEqual([
      { type: 'test', id: testId }, ...(id ? [{ type: 'installation', id }] : [])]);
    await service.onModuleDestroy();
    expect(summaries.events.listenerCount('summary.test-recomputed')).toBe(0);
    summaries.events.emit('summary.test-recomputed', { version: 1, type: 'summary.test-recomputed', testId, installationId: id });
    await jest.advanceTimersByTimeAsync(0); expect(redis.publish).toHaveBeenCalledTimes(id ? 2 : 1);
  });
  it.each([null, {}, { version: 2, testId, installationId },
    { version: 1, type: 'summary.test-recomputed', testId: 'CANARY_SECRET', installationId },
    { version: 1, type: 'summary.test-recomputed', testId, installationId: 'invalid' }])(
    'recusa evento de resumo inválido %#', async (input) => {
      service.start(); summaries.events.emit('summary.test-recomputed', input); await jest.advanceTimersByTimeAsync(0);
      expect(redis.publish).not.toHaveBeenCalled();
      expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
    });
  it.each([false, new Error('CANARY_SECRET')])('falha Redis no aviso TEST não bloqueia instalação %#', async (failure) => {
    if (failure instanceof Error) redis.publish.mockRejectedValueOnce(failure); else redis.publish.mockResolvedValueOnce(false);
    service.start(); summaries.events.emit('summary.test-recomputed',
      { version: 1, type: 'summary.test-recomputed', testId, installationId });
    await jest.advanceTimersByTimeAsync(0); expect(redis.publish).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it('shutdown aguarda aviso TEST aceito e não inicia publicação da instalação', async () => {
    let finish!: (result: boolean) => void;
    redis.publish.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    service.start(); summaries.events.emit('summary.test-recomputed',
      { version: 1, type: 'summary.test-recomputed', testId, installationId });
    let closed = false; const closing = service.onModuleDestroy().then(() => { closed = true; });
    await Promise.resolve(); expect(closed).toBe(false); finish(true); await closing;
    expect(redis.publish).toHaveBeenCalledTimes(1);
    expect(summaries.events.listenerCount('summary.test-recomputed')).toBe(0);
  });
});
