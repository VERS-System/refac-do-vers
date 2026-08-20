// Testes unitários do ciclo de conexão do Prisma usado pelo backend VERS.

jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClientMock {
    $connect = jest.fn<Promise<void>, []>();
    $disconnect = jest.fn<Promise<void>, []>();
  },
}));

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('conecta o Prisma durante a inicialização do módulo', async () => {
    const connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('desconecta o Prisma durante a destruição do módulo', async () => {
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('propaga falhas de conexão para impedir inicialização inconsistente', async () => {
    const connectionError = new Error('falha simulada de conexão');
    jest.spyOn(service, '$connect').mockRejectedValue(connectionError);

    await expect(service.onModuleInit()).rejects.toBe(connectionError);
  });

  it('propaga falhas de desconexão para permitir diagnóstico do encerramento', async () => {
    const disconnectionError = new Error('falha simulada de desconexão');
    jest.spyOn(service, '$disconnect').mockRejectedValue(disconnectionError);

    await expect(service.onModuleDestroy()).rejects.toBe(disconnectionError);
  });
});
