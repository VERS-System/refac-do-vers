// Verifica opções reais do adaptador sem abrir portas ou consultar serviços externos.
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { RealtimeIoAdapter } from './realtime-io.adapter';

describe('RealtimeIoAdapter', () => {
  it('aplica CORS com credenciais e Origin obrigatório nos dois transportes', () => {
    const create = jest.spyOn(IoAdapter.prototype, 'createIOServer').mockReturnValue({});
    const adapter = new RealtimeIoAdapter(undefined, new ConfigService({ CORS_ORIGINS: 'https://web.test' }));
    adapter.createIOServer(0, { path: '/socket.io' });
    const options = create.mock.calls[0][1] as Partial<ServerOptions>;
    expect(options).toMatchObject({ path: '/socket.io', maxHttpBufferSize: 1024,
      cors: { origin: ['https://web.test'], credentials: true } });
    const allow = options.allowRequest!;
    for (const origin of [undefined, 'null', '*', 'https://foreign.test', 'https://web.test']) {
      const done = jest.fn(); allow({ headers: { origin } } as never, done);
      expect(done).toHaveBeenCalledWith(null, origin === 'https://web.test');
    }
    expect(options.connectionStateRecovery).toBeUndefined(); create.mockRestore();
  });
});
