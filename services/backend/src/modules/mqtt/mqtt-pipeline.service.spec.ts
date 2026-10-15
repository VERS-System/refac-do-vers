// Verifica recuperação paginada, lifecycle e eventos após commit sem broker ou banco reais.
import { Logger } from '@nestjs/common';
import { MqttPipelineService } from './mqtt-pipeline.service';

/** Expõe somente dependências usadas pelo pipeline, com resultados controláveis por cenário. */
function setup(): { service: MqttPipelineService; prisma: { mqttMessage: { findMany: jest.Mock }; test: { findMany: jest.Mock } };
  reception: { receive: jest.Mock; process: jest.Mock }; summaries: { recomputeMessage: jest.Mock; recomputeTest: jest.Mock };
  transport: { status: string; start: jest.Mock; pause: jest.Mock; resume: jest.Mock; onModuleDestroy: jest.Mock } } {
  const prisma = { mqttMessage: { findMany: jest.fn().mockResolvedValue([]) }, test: { findMany: jest.fn().mockResolvedValue([]) } };
  const reception = { receive: jest.fn().mockResolvedValue({ outcome: 'RECEIVED', id: 'message' }),
    process: jest.fn().mockResolvedValue({ outcome: 'PROCESSED', id: 'message' }) };
  const summaries = { recomputeMessage: jest.fn().mockResolvedValue(undefined), recomputeTest: jest.fn().mockResolvedValue(null) };
  const transport = { status: 'unavailable', start: jest.fn(), pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined), onModuleDestroy: jest.fn().mockResolvedValue(undefined) };
  return { service: new MqttPipelineService(prisma as never, reception as never, summaries as never, transport as never),
    prisma, reception, summaries, transport };
}

describe('pipeline MQTT', () => {
  let h: ReturnType<typeof setup>;
  beforeEach(() => { jest.useFakeTimers(); h = setup(); jest.spyOn(Logger.prototype, 'warn').mockImplementation(); });
  afterEach(async () => { await h.service.onModuleDestroy(); jest.restoreAllMocks(); jest.useRealTimers(); });

  it('constructor não inicia rede, consulta ou timer', () => {
    expect(h.transport.start).not.toHaveBeenCalled(); expect(h.prisma.mqttMessage.findMany).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
  it('recebe, processa e emite somente após a promessa de commit resolver', async () => {
    jest.setSystemTime(new Date('2026-10-14T12:00:00.000Z'));
    let commit!: () => void; const event = jest.fn(); h.service.events.on('telemetry.processed', event);
    h.reception.process.mockImplementationOnce(() => new Promise((resolve) => {
      commit = (): void => { resolve({ outcome: 'PROCESSED', id: 'message' }); };
    }));
    const pending = h.service.handle({} as never, new Date()); await Promise.resolve(); await Promise.resolve();
    expect(event).not.toHaveBeenCalled();
    jest.setSystemTime(new Date('2026-10-14T12:00:01.000Z')); commit(); await pending;
    expect(event).toHaveBeenCalledTimes(1);
    expect(event).toHaveBeenCalledWith({ version: 1, type: 'telemetry.processed', messageId: 'message',
      correlationId: 'message', occurredAt: '2026-10-14T12:00:01.000Z' });
    expect(h.reception.receive.mock.invocationCallOrder[0]).toBeLessThan(h.reception.process.mock.invocationCallOrder[0]);
  });
  it('duplicata RECEIVED retoma processamento e não reinventa recepção', async () => {
    h.reception.receive.mockResolvedValue({ outcome: 'DUPLICATE', id: 'message' });
    await h.service.handle({} as never, new Date()); expect(h.reception.process).toHaveBeenCalledWith('message');
  });
  it('PROCESSED legado repara resumos sem normalizar novamente nem emitir evento novo', async () => {
    h.reception.process.mockResolvedValue({ outcome: 'ALREADY_PROCESSED', id: 'message' });
    const event = jest.fn(); h.service.events.on('telemetry.processed', event);
    await h.service.handle({} as never, new Date());
    expect(h.summaries.recomputeMessage).toHaveBeenCalledWith('message'); expect(event).not.toHaveBeenCalled();
  });
  it('recuperação emite o mesmo contrato mínimo após processamento pendente', async () => {
    jest.setSystemTime(new Date('2026-10-14T13:00:00.000Z'));
    h.prisma.mqttMessage.findMany.mockResolvedValueOnce([{ id: 'pending' }]);
    const event = jest.fn(); h.service.events.on('telemetry.processed', event);
    await h.service.recover();
    expect(event).toHaveBeenCalledWith({ version: 1, type: 'telemetry.processed', messageId: 'pending',
      correlationId: 'pending', occurredAt: '2026-10-14T13:00:00.000Z' });
    expect(h.reception.process).toHaveBeenCalledWith('pending');
  });
  it.each(['REJECTED', 'NOT_FOUND'])('processamento %s não emite atualização', async (outcome) => {
    h.reception.process.mockResolvedValue({ outcome, id: 'message' });
    const event = jest.fn(); h.service.events.on('telemetry.processed', event);
    await h.service.handle({} as never, new Date()); expect(event).not.toHaveBeenCalled();
  });
  it.each([{ outcome: 'REJECTED', id: 'message' }, { outcome: 'REJECTED', id: null }])(
    'rejeição permanente é confirmável sem processar novamente %#', async (receipt) => {
      h.reception.receive.mockResolvedValue(receipt); await h.service.handle({} as never, new Date());
      expect(h.reception.process).not.toHaveBeenCalled();
    });
  it('falha de processamento não emite evento nem confirma sucesso', async () => {
    h.reception.process.mockRejectedValue(new Error('CANARY_SECRET'));
    const event = jest.fn(); h.service.events.on('telemetry.processed', event);
    await expect(h.service.handle({} as never, new Date())).rejects.toThrow('MQTT_PIPELINE_FAILED');
    expect(event).not.toHaveBeenCalled();
  });
  it('listener síncrono com erro não desfaz histórico nem bloqueia ACK', async () => {
    h.service.events.on('telemetry.processed', () => { throw new Error('CANARY_SECRET'); });
    const next = jest.fn(); h.service.events.once('telemetry.processed', next);
    await expect(h.service.handle({} as never, new Date())).resolves.toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it('listener assíncrono com erro é capturado sem rejeição não tratada', async () => {
    h.service.events.on('telemetry.processed', async () => { throw new Error('CANARY_SECRET'); });
    await h.service.handle({} as never, new Date()); await jest.advanceTimersByTimeAsync(0);
    expect(Logger.prototype.warn).toHaveBeenCalledWith('mqtt_event_failed');
  });
  it('recuperação pagina por ID sem offset e avança após falha de uma mensagem', async () => {
    const page = Array.from({ length: 100 }, (_, index) => ({ id: `m${String(index).padStart(3, '0')}` }));
    h.prisma.mqttMessage.findMany.mockResolvedValueOnce(page).mockResolvedValueOnce([{ id: 'm100' }]);
    h.reception.process.mockRejectedValueOnce(new Error('CANARY_SECRET'));
    const result = await h.service.recover();
    expect(result).toMatchObject({ failed: 1 }); expect(h.reception.process).toHaveBeenCalledTimes(101);
    expect(h.prisma.mqttMessage.findMany.mock.calls[1][0]).toMatchObject({ where: { status: 'RECEIVED', id: { gt: 'm099' } },
      take: 100, orderBy: { id: 'asc' }, select: { id: true } });
    expect(h.prisma.mqttMessage.findMany.mock.calls[1][0]).not.toHaveProperty('skip');
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it('recupera TEST encerrado sem nova mensagem e continua após falha de um teste', async () => {
    h.prisma.test.findMany.mockResolvedValueOnce([{ id: 'finished' }, { id: 'retry-later' }, { id: 'next' }]);
    h.summaries.recomputeTest.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('CANARY_SECRET')).mockResolvedValueOnce(null);
    expect(await h.service.recover()).toMatchObject({ failed: 1 });
    expect(h.summaries.recomputeTest.mock.calls).toEqual([['finished'], ['retry-later'], ['next']]);
    expect(h.prisma.test.findMany.mock.calls[0][0].where).toMatchObject({ status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
      samples: { some: {} } });
  });
  it('duas chamadas de recuperação compartilham a mesma varredura', async () => {
    let release!: () => void;
    h.prisma.mqttMessage.findMany.mockImplementationOnce(() => new Promise((resolve) => { release = (): void => { resolve([]); }; }));
    const first = h.service.recover(); const second = h.service.recover();
    expect(h.prisma.mqttMessage.findMany).toHaveBeenCalledTimes(1); release(); await Promise.all([first, second]);
    expect(h.prisma.test.findMany).toHaveBeenCalledTimes(1);
  });
  it('start desabilitado não lê histórico, inicia timer ou abre conexão', async () => {
    h.transport.status = 'disabled'; await h.service.start();
    expect(h.prisma.mqttMessage.findMany).not.toHaveBeenCalled(); expect(h.transport.start).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
  it('start recupera antes de consumir e repete a cada 60 s', async () => {
    await h.service.start(); expect(h.transport.start).toHaveBeenCalledWith(expect.any(Function));
    expect(h.prisma.mqttMessage.findMany.mock.invocationCallOrder[0]).toBeLessThan(h.transport.start.mock.invocationCallOrder[0]);
    await jest.advanceTimersByTimeAsync(59999); expect(h.prisma.mqttMessage.findMany).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1); expect(h.prisma.mqttMessage.findMany).toHaveBeenCalledTimes(2);
    await expect(h.service.start()).rejects.toThrow('MQTT_PIPELINE_ALREADY_STARTED');
  });
  it('pausa impede novos handles e timer, preservando commit em andamento', async () => {
    await h.service.start(); let commit!: () => void;
    h.reception.process.mockImplementationOnce(() => new Promise((resolve) => {
      commit = (): void => { resolve({ outcome: 'PROCESSED', id: 'message' }); };
    }));
    const work = h.service.handle({} as never, new Date()); await Promise.resolve(); await Promise.resolve();
    let finished = false; const paused = h.service.pause().then(() => { finished = true; });
    await expect(h.service.handle({} as never, new Date())).rejects.toThrow('MQTT_PIPELINE_PAUSED');
    await Promise.resolve(); expect(finished).toBe(false); expect(h.transport.pause).toHaveBeenCalled();
    commit(); await Promise.all([work, paused]); await jest.advanceTimersByTimeAsync(60000);
    expect(h.prisma.mqttMessage.findMany).toHaveBeenCalledTimes(1);
    await expect(h.service.recover()).rejects.toThrow('MQTT_PIPELINE_PAUSED');
  });
  it('retoma recuperando antes do transporte, sem duplicar timer ou chamada', async () => {
    await h.service.start(); await h.service.pause(); await Promise.all([h.service.resume(), h.service.resume()]);
    expect(h.transport.resume).toHaveBeenCalledTimes(1);
    expect(h.prisma.mqttMessage.findMany.mock.invocationCallOrder[1]).toBeLessThan(h.transport.resume.mock.invocationCallOrder[0]);
    expect(jest.getTimerCount()).toBe(1);
  });
  it('pausa durante recuperação inicial impede start até retomada', async () => {
    let release!: () => void;
    h.prisma.mqttMessage.findMany.mockImplementationOnce(() => new Promise((resolve) => { release = (): void => { resolve([]); }; }));
    const starting = h.service.start(); const paused = h.service.pause(); release(); await Promise.all([starting, paused]);
    expect(h.transport.start).not.toHaveBeenCalled(); await h.service.resume(); expect(h.transport.resume).toHaveBeenCalledTimes(1);
  });
  it('pausa conclui item atual da recuperação e preserva itens seguintes sem processar', async () => {
    h.prisma.mqttMessage.findMany.mockResolvedValueOnce([{ id: 'first' }, { id: 'second' }]);
    let commit!: () => void;
    h.reception.process.mockImplementationOnce(() => new Promise((resolve) => {
      commit = (): void => { resolve({ outcome: 'PROCESSED', id: 'first' }); };
    }));
    const recovery = h.service.recover(); await Promise.resolve(); const paused = h.service.pause(); commit();
    await Promise.all([recovery, paused]); expect(h.reception.process).toHaveBeenCalledTimes(1);
    expect(h.reception.process).toHaveBeenCalledWith('first'); expect(h.prisma.test.findMany).not.toHaveBeenCalled();
  });
  it('nova pausa durante recuperação de retomada impede reabrir o transporte', async () => {
    await h.service.start(); await h.service.pause(); let release!: () => void;
    h.prisma.mqttMessage.findMany.mockImplementationOnce(() => new Promise((resolve) => { release = (): void => { resolve([]); }; }));
    const resumed = h.service.resume(); await Promise.resolve(); await Promise.resolve();
    const paused = h.service.pause(); release(); await Promise.all([resumed, paused]);
    expect(h.transport.resume).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
  });
  it('falha na recuperação mantém pausado e permite retentativa explícita', async () => {
    await h.service.start(); await h.service.pause();
    h.prisma.mqttMessage.findMany.mockRejectedValueOnce(new Error('CANARY_SECRET'));
    await expect(h.service.resume()).rejects.toThrow('MQTT_PIPELINE_RESUME_FAILED');
    await expect(h.service.handle({} as never, new Date())).rejects.toThrow('MQTT_PIPELINE_PAUSED');
    await h.service.resume(); expect(h.transport.resume).toHaveBeenCalledTimes(1);
  });
  it('falha de consulta periódica gera código seguro e próxima janela tenta novamente', async () => {
    await h.service.start(); h.prisma.mqttMessage.findMany.mockRejectedValueOnce(new Error('CANARY_SECRET'));
    await jest.advanceTimersByTimeAsync(60000); await jest.advanceTimersByTimeAsync(60000);
    expect(h.prisma.mqttMessage.findMany).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls)).not.toContain('CANARY_SECRET');
  });
  it('shutdown cancela timer, fecha transporte e impede novo trabalho', async () => {
    await h.service.start(); await h.service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(120000); expect(h.prisma.mqttMessage.findMany).toHaveBeenCalledTimes(1);
    expect(h.transport.onModuleDestroy).toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
    await expect(h.service.handle({} as never, new Date())).rejects.toThrow('MQTT_PIPELINE_STOPPED');
  });
  it('shutdown aguarda commit em curso antes de concluir', async () => {
    let commit!: () => void; h.reception.process.mockImplementationOnce(() => new Promise((resolve) => {
      commit = (): void => { resolve({ outcome: 'PROCESSED', id: 'message' }); };
    }));
    const pending = h.service.handle({} as never, new Date()); await Promise.resolve(); await Promise.resolve();
    const closed = jest.fn(); const shutdown = h.service.onModuleDestroy().then(closed);
    await Promise.resolve(); expect(closed).not.toHaveBeenCalled(); commit(); await pending; await shutdown;
    expect(closed).toHaveBeenCalledTimes(1);
  });
  it('shutdown durante recuperação inicial não permite ligar consumidor depois', async () => {
    let release!: () => void;
    h.prisma.mqttMessage.findMany.mockImplementationOnce(() => new Promise((resolve) => { release = (): void => { resolve([]); }; }));
    const starting = h.service.start(); const shutdown = h.service.onModuleDestroy();
    release(); await starting; await shutdown;
    expect(h.transport.start).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
  });
  it('callback entregue ao transporte usa o mesmo pipeline de recepção e commit', async () => {
    await h.service.start(); const callback = h.transport.start.mock.calls[0][0];
    const packet = { topic: 'synthetic' }; const time = new Date();
    await callback(packet, time);
    expect(h.reception.receive).toHaveBeenCalledWith(packet, time);
    expect(h.reception.process).toHaveBeenCalledWith('message');
  });
});
