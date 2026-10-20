// Entrega somente avisos mínimos a sockets com sessão e recurso revalidados.
import { OnModuleDestroy } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { AuthPrincipal } from '../auth/auth-principal';
import { DataUpdatedEvent, parseDataUpdatedEvent } from './realtime-contract';
import { parseRealtimeSubscription, RealtimeAuthorizationService, RealtimeSubscription } from './realtime-authorization.service';
import { RealtimePubSubService } from './realtime-pubsub.service';

type ClientState = { origin: string | undefined; cookie: string | undefined; principal: AuthPrincipal;
  resources: Map<string, RealtimeSubscription>; pending: Map<string, RealtimeSubscription>; busy: boolean; checking: boolean; close: () => void };
type Ack = { ok: true; version: 1; resource: RealtimeSubscription['resource'] } | { ok: false; version: 1; code: string };

/** Restringe erros públicos à allowlist para nunca expor causa ou credenciais. */
function code(error: unknown): string {
  return error instanceof Error && ['INVALID_REQUEST', 'UNAUTHENTICATED', 'RESOURCE_UNAVAILABLE',
    'REALTIME_UNAVAILABLE', 'LIMIT_EXCEEDED'].includes(error.message) ? error.message : 'REALTIME_UNAVAILABLE';
}

@WebSocketGateway({ namespace: '/realtime', path: '/socket.io' })
export class RealtimeGateway implements OnGatewayInit<Namespace>, OnGatewayConnection<Socket>, OnModuleDestroy {
  private readonly clients = new Map<Socket, ClientState>();
  private started = false;
  private stopping = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  /** Recebe autorização e Pub/Sub sem instalar listeners ou iniciar rede no constructor. */
  constructor(private readonly auth: RealtimeAuthorizationService, private readonly redis: RealtimePubSubService) {}

  /** Registra middleware de namespace; não libera conexões antes do início explícito. */
  afterInit(namespace: Namespace): void {
    namespace.use((socket, next) => { void this.admit(socket, next); });
  }

  /** Fecha conexão se o transporte/reserva foi invalidado entre middleware e confirmação do connect. */
  handleConnection(socket: Socket): void {
    if (!this.available || !this.clients.has(socket)) this.close(socket);
  }

  /** Instala observação e uma única varredura de sessões; Redis continua sob o coordenador. */
  start(): void {
    if (this.stopping) throw new Error('REALTIME_STOPPED');
    if (this.started) return;
    this.started = true;
    this.redis.events.on('data.updated', this.onEvent);
    this.redis.events.on('status.changed', this.onStatus);
    this.timer = setInterval(() => { this.checkSessions(); }, 30_000); this.timer.unref();
  }

  /** Confirma disponibilidade atual, inclusive após operações assíncronas. */
  private get available(): boolean { return this.started && !this.stopping && this.redis.status === 'ok'; }

  /** Valida sessão antes de reservar quota; transporte fechado nunca deixa reserva pendente. */
  private async admit(socket: Socket, next: (error?: Error) => void): Promise<void> {
    try {
      if (!this.available) throw new Error('REALTIME_UNAVAILABLE');
      const { origin, cookie } = socket.handshake.headers;
      const principal = await this.auth.authenticate(origin, cookie);
      if (!this.available || socket.conn.readyState !== 'open') throw new Error('REALTIME_UNAVAILABLE');
      if ([...this.clients.values()].filter((value) => value.principal.sessionId === principal.sessionId).length >= 5) {
        throw new Error('LIMIT_EXCEEDED');
      }
      const close = (): void => { this.remove(socket); };
      this.clients.set(socket, { origin, cookie, principal, resources: new Map(), pending: new Map(), busy: false, checking: false, close });
      socket.once('disconnect', close); socket.conn.once('close', close);
      next();
    } catch (error) { next(new Error(code(error))); }
  }

  /** Libera quota e referências em desconexão de namespace ou transporte, mesmo antes do connect. */
  private remove(socket: Socket): void {
    const state = this.clients.get(socket);
    if (!state) return;
    this.clients.delete(socket); state.resources.clear();
    socket.off('disconnect', state.close); socket.conn.off('close', state.close);
  }

  /** Fecha somente cliente local e libera quota imediatamente. */
  private close(socket: Socket): void { this.remove(socket); socket.disconnect(true); }

  /** Autoriza e confirma assinatura somente após join concluído. */
  @SubscribeMessage('subscribe')
  subscribe(@ConnectedSocket() socket: Socket, @MessageBody() input: unknown): Promise<Ack> {
    return this.change(socket, input, true);
  }

  /** Autoriza remoção idempotente e impede aviso de consulta ainda em andamento. */
  @SubscribeMessage('unsubscribe')
  unsubscribe(@ConnectedSocket() socket: Socket, @MessageBody() input: unknown): Promise<Ack> {
    return this.change(socket, input, false);
  }

  /** Serializa uma operação por socket sem fila, preservando quota e ACKs em joins assíncronos. */
  private async change(socket: Socket, input: unknown, subscribing: boolean): Promise<Ack> {
    const state = this.clients.get(socket);
    if (!this.available || !state || state.busy) return { ok: false, version: 1, code: 'REALTIME_UNAVAILABLE' };
    state.busy = true;
    try {
      const command = parseRealtimeSubscription(input);
      await this.auth.authorize(state.origin, state.cookie, command);
      if (!this.available || this.clients.get(socket) !== state) throw new Error('REALTIME_UNAVAILABLE');
      const key = `${command.resource.type}:${command.resource.id.toLowerCase()}`;
      if (subscribing && !state.resources.has(key)) {
        if (state.resources.size >= 20) throw new Error('LIMIT_EXCEEDED');
        await socket.join(key);
        if (!this.available || this.clients.get(socket) !== state) {
          await socket.leave(key); throw new Error('REALTIME_UNAVAILABLE');
        }
        state.resources.set(key, command);
      } else if (!subscribing && state.resources.delete(key)) { await socket.leave(key); }
      if (!this.available || this.clients.get(socket) !== state) throw new Error('REALTIME_UNAVAILABLE');
      return { ok: true, version: 1, resource: command.resource };
    } catch (error) {
      if (code(error) === 'UNAUTHENTICATED') this.close(socket);
      return { ok: false, version: 1, code: code(error) };
    } finally { state.busy = false; }
  }

  /** Revalida o envelope recebido e agrupa invalidações do mesmo recurso durante consulta em curso. */
  private readonly onEvent = (input: unknown): void => {
    if (!this.available) return;
    let event: DataUpdatedEvent;
    try { event = parseDataUpdatedEvent(JSON.stringify(input)); } catch { return; }
    const key = `${event.resource.type}:${event.resource.id.toLowerCase()}`;
    for (const [socket, state] of this.clients) {
      const subscription = state.resources.get(key);
      if (!subscription || state.pending.get(key) === subscription) continue;
      state.pending.set(key, subscription);
      void this.deliver(socket, state, subscription, key, event).finally(() => {
        if (state.pending.get(key) === subscription) state.pending.delete(key);
      });
    }
  };

  /** Revalida cada destinatário e confere cancelamento depois do await, sem emitir à sala inteira. */
  private async deliver(socket: Socket, state: ClientState, subscription: RealtimeSubscription, key: string, event: DataUpdatedEvent): Promise<void> {
    try {
      await this.auth.authorize(state.origin, state.cookie, subscription);
      if (this.available && this.clients.get(socket) === state && state.resources.get(key) === subscription && socket.connected) {
        socket.emit('data.updated', event);
      }
    } catch (error) {
      if (this.clients.get(socket) !== state || state.resources.get(key) !== subscription) return;
      if (code(error) === 'RESOURCE_UNAVAILABLE') {
        state.resources.delete(key);
        try { await socket.leave(key); } catch { this.close(socket); }
      } else { this.close(socket); }
    }
  }

  /** Na queda, força nova conexão/assinatura/snapshot, sem reaproveitar permissões antigas. */
  private readonly onStatus = (): void => {
    if (this.available) return;
    for (const socket of this.clients.keys()) this.close(socket);
  };

  /** Revalida sessões ociosas a cada 30 s sem sobrepor consulta do mesmo cliente. */
  private checkSessions(): void {
    for (const [socket, state] of this.clients) {
      if (state.checking) continue;
      state.checking = true;
      void this.auth.authenticate(state.origin, state.cookie).catch(() => {
        if (this.clients.get(socket) === state) this.close(socket);
      }).finally(() => { state.checking = false; });
    }
  }

  /** Remove listeners/timer e bloqueia resultados tardios antes de encerrar clientes locais. */
  onModuleDestroy(): void {
    if (this.stopping) return;
    this.stopping = true; clearInterval(this.timer); this.timer = undefined;
    this.redis.events.off('data.updated', this.onEvent); this.redis.events.off('status.changed', this.onStatus);
    for (const socket of this.clients.keys()) this.close(socket);
  }
}
