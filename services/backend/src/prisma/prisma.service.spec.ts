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

  it('desconecta o Prisma durante a destruição do módulo', async () => {
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('propaga falhas de desconexão para permitir diagnóstico do encerramento', async () => {
    const disconnectionError = new Error('falha simulada de desconexão');
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    jest.spyOn(service, '$disconnect').mockRejectedValue(disconnectionError);

    await expect(service.onModuleDestroy()).rejects.toBe(disconnectionError);
  });

  it('não desconecta novamente depois de encerrar com sucesso', async () => {
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();
    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('permite tentar desconectar novamente depois de uma falha', async () => {
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockRejectedValueOnce(new Error('falha temporária'))
      .mockResolvedValueOnce(undefined);

    await expect(service.onModuleDestroy()).rejects.toThrow('falha temporária');
    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
