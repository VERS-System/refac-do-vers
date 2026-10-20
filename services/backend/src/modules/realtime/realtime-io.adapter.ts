// Aplica a lista CORS existente também ao handshake Engine.IO, incluindo WebSocket.
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { createCorsConfig } from '../../config/cors.config';

export class RealtimeIoAdapter extends IoAdapter {
  /** Recebe aplicação e configuração validadas, sem criar servidor no constructor. */
  constructor(app: INestApplication | undefined, private readonly config: ConfigService) { super(app); }

  /** Recusa Origin ausente/alheio nos dois transportes, sem recuperação automática de salas. */
  override createIOServer(port: number, options: Partial<ServerOptions> = {}): Server {
    const cors = createCorsConfig(this.config.getOrThrow<string>('CORS_ORIGINS'));
    const origins = cors.origin as string[];
    return super.createIOServer(port, { ...options, cors, maxHttpBufferSize: 1024,
      transports: ['polling', 'websocket'], connectionStateRecovery: undefined,
      allowRequest: (request, done): void => { done(null, typeof request.headers.origin === 'string' && origins.includes(request.headers.origin) && request.headers.origin !== 'null' && request.headers.origin !== '*'); },
    } satisfies Partial<ServerOptions>) as Server;
  }
}
