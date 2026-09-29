// Confere cadastro pendente, hash e resposta indistinguível para email existente.

import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService.register', () => {
  const create = jest.fn();
  const prisma = { user: { create } } as unknown as PrismaService;
  const service = new AuthService(prisma);
  const input = { email: ' ANA@Example.com ', password: 'Senha@123', displayName: 'Ana' };

  beforeEach(() => create.mockReset());

  it('normaliza email e grava apenas hash, papel USER e estado pendente', async () => {
    create.mockResolvedValue({ id: 'user-id' });
    await service.register(input);

    const data = create.mock.calls[0][0].data as {
      email: string; passwordHash: string; password?: string; status: string;
      roles: { create: { role: string } };
    };
    expect(data.email).toBe('ana@example.com');
    expect(data.password).toBeUndefined();
    expect(data.passwordHash).not.toBe(input.password);
    expect(await bcrypt.compare(input.password, data.passwordHash)).toBe(true);
    expect(data.status).toBe('PENDING_VERIFICATION');
    expect(data.roles.create.role).toBe('USER');
  });

  it('aceita conflito de email sem expor existência; propaga outras falhas', async () => {
    create.mockRejectedValueOnce({ code: 'P2002', meta: { target: ['email'] } });
    await expect(service.register(input)).resolves.toBeUndefined();
    create.mockRejectedValueOnce(new Error('banco fora'));
    await expect(service.register(input)).rejects.toThrow('banco fora');
  });

  it('mantém sucesso para duas tentativas simultâneas do mesmo email', async () => {
    create.mockResolvedValueOnce({ id: 'user-id' });
    create.mockRejectedValueOnce({ code: 'P2002', meta: { target: ['email'] } });
    await expect(Promise.all([service.register(input), service.register(input)])).resolves.toEqual([undefined, undefined]);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
