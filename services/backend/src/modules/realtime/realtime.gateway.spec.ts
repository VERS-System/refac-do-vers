// Verifica lifecycle, limites e entrega autorizada com sockets sintéticos, sem rede externa.
import { EventEmitter } from 'node:events';
import { Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway';

const id = '00000000-0000-4000-8000-000000000003';
const command = { version: 1, resource: { type: 'test', id } };
const event = { ...command, type: 'data.updated', occurredAt: '2026-10-15T12:00:00.000Z' };

/** Controla a conexão e os joins sem depender de um servidor Socket.IO real. */
function socket(): Socket {
  const value = Object.assign(new EventEmitter(), {
    connected: true, handshake: { headers: { origin: 'https://web.test', cookie: 'vers_access=synthetic' } },
    conn: Object.assign(new EventEmitter(), { readyState: 'open' }),
    join: jest.fn().mockResolvedValue(undefined), leave: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(), emit: jest.fn(),
  });
  value.disconnect.mockImplementation(() => { value.connected = false; EventEmitter.prototype.emit.call(value, 'disconnect'); });
  return value as unknown as Socket;
}

describe('RealtimeGateway', () => {
  const principal = { id: 'user', sessionId: 'session', roles: [] };
  let auth: { authenticate: jest.Mock; authorize: jest.Mock };
  let redis: { status: string; events: EventEmitter };
  let gateway: RealtimeGateway;
  let middleware: (client: Socket, next: (error?: Error) => void) => void;

  /** Executa o middleware real do namespace e retorna somente o erro público. */
  async function admit(client: Socket = socket()): Promise<Error | undefined> {
    return new Promise((resolve) => { middleware(client, resolve); });
  }
  /** Drena as verificações de entrega sem avançar o relógio operacional. */
  async function flush(): Promise<void> { await jest.advanceTimersByTimeAsync(0); }

  beforeEach(() => {
    jest.useFakeTimers();
    auth = { authenticate: jest.fn().mockResolvedValue(principal), authorize: jest.fn().mockResolvedValue(principal) };
    redis = { status: 'ok', events: new EventEmitter() };
    gateway = new RealtimeGateway(auth as never, redis as never);
    gateway.afterInit({ use: jest.fn((handler) => { middleware = handler; }) } as never);
  });
  afterEach(() => { gateway.onModuleDestroy(); jest.useRealTimers(); });

  it('recusa antes do start, inicia uma vez e não abre Redis', async () => {
    expect(await admit()).toEqual(new Error('REALTIME_UNAVAILABLE'));
    expect(jest.getTimerCount()).toBe(0); gateway.start(); gateway.start();
    expect(jest.getTimerCount()).toBe(1); expect(redis.events.listenerCount('data.updated')).toBe(1);
  });
  it('delega apenas Origin/cookie e oculta falha desconhecida', async () => {
    gateway.start(); expect(await admit()).toBeUndefined();
    expect(auth.authenticate).toHaveBeenCalledWith('https://web.test', 'vers_access=synthetic');
    auth.authenticate.mockRejectedValue(new Error('conteúdo secreto'));
    expect(await admit()).toEqual(new Error('REALTIME_UNAVAILABLE'));
    auth.authenticate.mockRejectedValue(new Error('UNAUTHENTICATED'));
    expect(await admit()).toEqual(new Error('UNAUTHENTICATED'));
  });
  it('limita cinco conexões concorrentes por sessão e libera após desconexão', async () => {
    gateway.start(); const clients = Array.from({ length: 6 }, socket);
    const results = await Promise.all(clients.map(admit));
    expect(results.filter(Boolean)).toEqual([new Error('LIMIT_EXCEEDED')]);
    clients[0].disconnect(); expect(await admit()).toBeUndefined();
    auth.authenticate.mockResolvedValue({ ...principal, sessionId: 'other' });
    expect(await admit()).toBeUndefined();
  });
  it('não reserva sessão se transporte fechar durante autenticação', async () => {
    gateway.start(); const client = socket(); let finish!: (value: unknown) => void;
    auth.authenticate.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const waiting = admit(client); client.conn.readyState = 'closed'; finish(principal);
    expect(await waiting).toEqual(new Error('REALTIME_UNAVAILABLE'));
    expect((await Promise.all(Array.from({ length: 5 }, () => admit()))).every((value) => !value)).toBe(true);
  });
  it('não mantém conexão cujo handshake autorizado foi invalidado antes do connect', async () => {
    gateway.start(); const client = socket(); await admit(client);
    client.conn.emit('close'); gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect((await Promise.all(Array.from({ length: 5 }, () => admit()))).every((value) => !value)).toBe(true);
  });
  it('ACK aguarda join, subscribe/unsubscribe idempotentes e autorização por comando', async () => {
    gateway.start(); const client = socket(); await admit(client);
    let finish!: () => void; let done = false;
    jest.mocked(client.join).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const waiting = gateway.subscribe(client, command).then((result) => { done = true; return result; });
    await flush(); expect(done).toBe(false); finish();
    const success = { ok: true, version: 1, resource: command.resource };
    expect(await waiting).toEqual(success); expect(await gateway.subscribe(client, command)).toEqual(success);
    expect(client.join).toHaveBeenCalledTimes(1);
    expect(await gateway.unsubscribe(client, command)).toEqual(success);
    expect(await gateway.unsubscribe(client, command)).toEqual(success);
    expect(client.leave).toHaveBeenCalledTimes(1); expect(auth.authorize).toHaveBeenCalledTimes(4);
  });
  it('limita vinte recursos sem bloquear repetição, sem filas para comandos sobrepostos', async () => {
    gateway.start(); const client = socket(); await admit(client);
    for (let index = 1; index <= 20; index++) {
      expect(await gateway.subscribe(client, { version: 1, resource: { type: 'test', id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}` } })).toMatchObject({ ok: true });
    }
    expect(await gateway.subscribe(client, command)).toMatchObject({ ok: true });
    expect(await gateway.subscribe(client, { version: 1, resource: { type: 'installation', id } })).toEqual({ ok: false, version: 1, code: 'LIMIT_EXCEEDED' });
    let finish!: (value: unknown) => void;
    auth.authorize.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const waiting = gateway.unsubscribe(client, command);
    expect(await gateway.subscribe(client, command)).toMatchObject({ code: 'REALTIME_UNAVAILABLE' });
    finish(principal); await waiting;
  });
  it('rejeita payload inválido e oculta recursos alheios sem join', async () => {
    gateway.start(); const client = socket(); await admit(client);
    expect(await gateway.subscribe(client, { ...command, room: 'arbitrary' })).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(auth.authorize).not.toHaveBeenCalled();
    auth.authorize.mockRejectedValue(new Error('RESOURCE_UNAVAILABLE'));
    expect(await gateway.subscribe(client, command)).toMatchObject({ code: 'RESOURCE_UNAVAILABLE' });
    expect(client.join).not.toHaveBeenCalled();
  });
  it('revalida por destinatário e separa instalação/teste sem broadcast à sala', async () => {
    gateway.start(); const first = socket(); const second = socket(); await admit(first); await admit(second);
    await gateway.subscribe(first, command);
    await gateway.subscribe(second, { version: 1, resource: { type: 'installation', id } });
    auth.authorize.mockClear(); redis.events.emit('data.updated', event); await flush();
    expect(auth.authorize).toHaveBeenCalledTimes(1); expect(first.emit).toHaveBeenCalledWith('data.updated', event);
    expect(second.emit).not.toHaveBeenCalled();
    redis.events.emit('data.updated', { ...event, secret: 'forbidden' }); await flush();
    expect(auth.authorize).toHaveBeenCalledTimes(1);
  });
  it('remove vínculo revogado, recusa próximos avisos e encerra sessão inválida', async () => {
    gateway.start(); const client = socket(); await admit(client); await gateway.subscribe(client, command);
    auth.authorize.mockRejectedValueOnce(new Error('RESOURCE_UNAVAILABLE'));
    redis.events.emit('data.updated', event); await flush();
    expect(client.emit).not.toHaveBeenCalled(); expect(client.leave).toHaveBeenCalledTimes(1);
    redis.events.emit('data.updated', event); await flush(); expect(auth.authorize).toHaveBeenCalledTimes(2);
    await gateway.subscribe(client, command); auth.authorize.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    redis.events.emit('data.updated', event); await flush(); expect(client.disconnect).toHaveBeenCalled();
  });
  it.each(['unsubscribe', 'redis', 'shutdown'])('bloqueia aviso após %s durante consulta e agrupa concorrentes', async (action) => {
    gateway.start(); const client = socket(); await admit(client); await gateway.subscribe(client, command);
    let finish!: (value: unknown) => void;
    auth.authorize.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    redis.events.emit('data.updated', event); redis.events.emit('data.updated', event); await flush();
    expect(auth.authorize).toHaveBeenCalledTimes(2);
    if (action === 'unsubscribe') await gateway.unsubscribe(client, command);
    if (action === 'redis') { redis.status = 'unavailable'; redis.events.emit('status.changed'); }
    if (action === 'shutdown') gateway.onModuleDestroy();
    finish(principal); await flush(); expect(client.emit).not.toHaveBeenCalled();
  });
  it('Redis down encerra conexões, recusa comandos e volta exige nova assinatura', async () => {
    gateway.start(); const client = socket(); await admit(client); await gateway.subscribe(client, command);
    redis.status = 'unavailable'; redis.events.emit('status.changed'); expect(client.disconnect).toHaveBeenCalled();
    expect(await admit()).toEqual(new Error('REALTIME_UNAVAILABLE'));
    expect(await gateway.subscribe(client, command)).toMatchObject({ code: 'REALTIME_UNAVAILABLE' });
    redis.status = 'ok'; redis.events.emit('status.changed'); const next = socket(); await admit(next);
    redis.events.emit('data.updated', event); await flush(); expect(next.emit).not.toHaveBeenCalled();
  });
  it('entrega invalidações repetidas e com horário anterior sem tratar occurredAt como cursor', async () => {
    gateway.start(); const client = socket(); await admit(client); await gateway.subscribe(client, command);
    const delayed = { ...event, occurredAt: '2026-10-14T12:00:00.000Z' };
    auth.authorize.mockClear();
    for (const notice of [event, event, delayed]) {
      redis.events.emit('data.updated', notice); await flush();
    }
    expect(jest.mocked(client.emit).mock.calls).toEqual([
      ['data.updated', event], ['data.updated', event], ['data.updated', delayed],
    ]);
    expect(auth.authorize).toHaveBeenCalledTimes(3);
  });
  it('reconexão só recebe após novo ACK e não reproduz aviso perdido', async () => {
    gateway.start(); const previous = socket(); await admit(previous); await gateway.subscribe(previous, command);
    previous.disconnect();
    redis.events.emit('data.updated', event); await flush();
    const next = socket(); await admit(next); gateway.handleConnection(next);
    redis.events.emit('data.updated', event); await flush();
    expect(previous.emit).not.toHaveBeenCalled(); expect(next.emit).not.toHaveBeenCalled();
    expect(await gateway.subscribe(next, command)).toEqual({ ok: true, version: 1, resource: command.resource });
    await flush(); expect(next.emit).not.toHaveBeenCalled();
    redis.events.emit('data.updated', event); await flush();
    expect(next.emit).toHaveBeenCalledTimes(1); expect(next.emit).toHaveBeenCalledWith('data.updated', event);
    expect(previous.emit).not.toHaveBeenCalled();
  });
  it('nova assinatura não herda verificação pendente ou rejeição da assinatura anterior', async () => {
    gateway.start(); const client = socket(); await admit(client); await gateway.subscribe(client, command);
    let fail!: (error: Error) => void;
    auth.authorize.mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
    redis.events.emit('data.updated', event); await flush();
    await gateway.unsubscribe(client, command); await gateway.subscribe(client, command);
    redis.events.emit('data.updated', event); await flush();
    expect(client.emit).toHaveBeenCalledTimes(1);
    fail(new Error('RESOURCE_UNAVAILABLE')); await flush();
    redis.events.emit('data.updated', event); await flush();
    expect(client.emit).toHaveBeenCalledTimes(2); expect(client.leave).toHaveBeenCalledTimes(1);
  });
  it('UUID com letras maiúsculas representa a mesma assinatura e recebe aviso canônico', async () => {
    gateway.start(); const client = socket(); await admit(client);
    const resource = { type: 'test', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
    await gateway.subscribe(client, { version: 1, resource: { ...resource, id: resource.id.toUpperCase() } });
    await gateway.subscribe(client, { version: 1, resource });
    expect(client.join).toHaveBeenCalledTimes(1);
    redis.events.emit('data.updated', { ...event, resource }); await flush();
    expect(client.emit).toHaveBeenCalledTimes(1);
  });
  it('confere sessão ociosa a cada 30 s, sem consultas sobrepostas, e limpa lifecycle', async () => {
    gateway.start(); const client = socket(); await admit(client);
    let finish!: (value: unknown) => void;
    auth.authenticate.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await jest.advanceTimersByTimeAsync(60_000); expect(auth.authenticate).toHaveBeenCalledTimes(2);
    gateway.onModuleDestroy(); finish(principal); await flush();
    expect(client.disconnect).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0);
    expect(redis.events.listenerCount('data.updated')).toBe(0);
    expect(() => gateway.start()).toThrow('REALTIME_STOPPED');
  });
  it('desconecta sessão revogada mesmo sem eventos', async () => {
    gateway.start(); const client = socket(); await admit(client);
    auth.authenticate.mockRejectedValue(new Error('UNAUTHENTICATED'));
    await jest.advanceTimersByTimeAsync(30_000); expect(client.disconnect).toHaveBeenCalledTimes(1);
  });
});
