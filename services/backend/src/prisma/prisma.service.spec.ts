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
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();
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
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    jest.spyOn(service, '$disconnect').mockRejectedValue(disconnectionError);

    await service.onModuleInit();
    await expect(service.onModuleDestroy()).rejects.toBe(disconnectionError);
  });

  it('não abre uma segunda conexão quando já está conectado', async () => {
    const connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('não desconecta novamente depois de encerrar com sucesso', async () => {
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();
    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('não tenta desconectar quando a conexão não foi concluída', async () => {
    jest.spyOn(service, '$connect').mockRejectedValue(new Error('indisponível'));
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await expect(service.onModuleInit()).rejects.toThrow('indisponível');
    await service.onModuleDestroy();

    expect(disconnect).not.toHaveBeenCalled();
  });

  it('permite tentar desconectar novamente depois de uma falha', async () => {
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockRejectedValueOnce(new Error('falha temporária'))
      .mockResolvedValueOnce(undefined);

    await service.onModuleInit();
    await expect(service.onModuleDestroy()).rejects.toThrow('falha temporária');
    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
