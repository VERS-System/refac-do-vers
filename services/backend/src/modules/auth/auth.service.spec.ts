// Confere cadastro pendente, hash e resposta indistinguível para email existente.

import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginAttemptsService } from './login-attempts.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

describe('AuthService.register', () => {
  const create = jest.fn();
  const prisma = { user: { create } } as unknown as PrismaService;
  const service = new AuthService(prisma, {} as LoginAttemptsService, {} as JwtService, {} as ConfigService);
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

describe('AuthService.refresh', () => {
  const oldToken = 'old-refresh';
  const oldHash = createHash('sha256').update(oldToken).digest('hex');
  const old = { id: 'old-id', userId: 'user-id', tokenHash: oldHash, expiresAt: new Date(Date.now() + 60_000), revokedAt: null, replacedBySessionId: null };
  const user = { id: 'user-id', status: 'ACTIVE' };
  const sessions = new Map<string, typeof old>();
  const refreshSession = {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => sessions.get(where.id) ?? null),
    updateMany: jest.fn(async ({ where, data }: { where: { id: string; revokedAt?: null }; data: Partial<typeof old> }) => {
      const session = sessions.get(where.id);
      if (!session || (where.revokedAt === null && session.revokedAt !== null)) return { count: 0 };
      Object.assign(session, data);
      return { count: 1 };
    }),
    create: jest.fn(async ({ data }: { data: typeof old }) => { sessions.set(data.id, { ...data, revokedAt: null, replacedBySessionId: null }); return data; }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<typeof old> }) => {
      Object.assign(sessions.get(where.id)!, data); return sessions.get(where.id);
    }),
  };
  const prisma = {
    refreshSession, user: { findUnique: jest.fn(async () => user) },
    $transaction: jest.fn(async (run: (tx: unknown) => Promise<unknown>) => run(prisma)),
  } as unknown as PrismaService;
  const jwt = {
    verifyAsync: jest.fn(async () => ({ sub: 'user-id', sid: 'old-id', typ: 'refresh' })),
    signAsync: jest.fn(async (payload: { typ: string; sid: string }) => `${payload.typ}-${payload.sid}`),
  } as unknown as JwtService;
  const config = { getOrThrow: jest.fn((key: string) => ({
    'auth.accessSecret': 'access-secret', 'auth.refreshSecret': 'refresh-secret',
    'auth.accessExpiration': '15m', 'auth.refreshExpiration': '7d',
  })[key]) } as unknown as ConfigService;
  const service = new AuthService(prisma, {} as LoginAttemptsService, jwt, config);

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.clear();
    sessions.set(old.id, { ...old });
  });

  it('rotaciona uma vez, persiste só o hash e recusa a segunda chamada concorrente', async () => {
    const results = await Promise.allSettled([service.refresh(oldToken), service.refresh(oldToken)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const successor = [...sessions.values()].find((session) => session.id !== old.id)!;
    expect(successor.tokenHash).toBe(createHash('sha256').update('refresh-' + successor.id).digest('hex'));
    expect(sessions.get(old.id)?.replacedBySessionId).toBe(successor.id);
    expect(refreshSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: old.id, revokedAt: null }) }));
  });

  it('revoga a cadeia no replay de token antigo', async () => {
    await service.refresh(oldToken);
    const successor = [...sessions.values()].find((session) => session.id !== old.id)!;
    await expect(service.refresh(oldToken)).rejects.toMatchObject({ status: 401 });
    expect(successor.revokedAt).toBeInstanceOf(Date);
  });

  it('recusa cookie ausente, assinatura inválida, sessão expirada e conta pendente', async () => {
    await expect(service.refresh(undefined)).rejects.toMatchObject({ status: 401 });
    (jwt.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error('invalid'));
    await expect(service.refresh(oldToken)).rejects.toMatchObject({ status: 401 });
    sessions.get(old.id)!.expiresAt = new Date(0);
    await expect(service.refresh(oldToken)).rejects.toMatchObject({ status: 401 });
    sessions.get(old.id)!.expiresAt = new Date(Date.now() + 60_000);
    user.status = 'PENDING_VERIFICATION';
    await expect(service.refresh(oldToken)).rejects.toMatchObject({ status: 401 });
    user.status = 'ACTIVE';
  });
});

describe('AuthService.login', () => {
  const findUnique = jest.fn();
  const createSession = jest.fn();
  const prisma = { user: { findUnique }, refreshSession: { create: createSession } } as unknown as PrismaService;
  const attempts = { assertAllowed: jest.fn(), recordFailure: jest.fn(), clear: jest.fn() } as unknown as LoginAttemptsService;
  const jwt = { signAsync: jest.fn().mockImplementation(async (payload: { typ: string }) => `${payload.typ}-token`) } as unknown as JwtService;
  const config = { getOrThrow: jest.fn((key: string) => ({
    'auth.accessSecret': 'access-secret', 'auth.refreshSecret': 'refresh-secret',
    'auth.accessExpiration': '15m', 'auth.refreshExpiration': '7d',
  })[key]) } as unknown as ConfigService;
  const service = new AuthService(prisma, attempts, jwt, config);
  const user = {
    id: 'user-id', email: 'ana@example.com', passwordHash: '', status: 'ACTIVE',
    displayName: 'Ana', avatarUrl: null, emailVerifiedAt: new Date(),
    createdAt: new Date(), updatedAt: new Date(), roles: [{ role: 'USER' }],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    user.passwordHash = await bcrypt.hash('Senha@123', 4);
    findUnique.mockResolvedValue(user);
    createSession.mockResolvedValue({ id: 'session-id' });
    (attempts.recordFailure as jest.Mock).mockResolvedValue(0);
  });

  // Hashes sintéticos produzidos pelo bcrypt 5 protegem o login após trocar a biblioteca nativa.
  it.each([
    { label: 'ASCII 2b', password: 'Migracao-Sintetica-123!', hash: '$2b$04$iojuvOBJ2Q.YkFDLsWvFjuCd.la9rcmAmNwvNASqMmO9/qh99dgNK' },
    { label: 'Unicode 2b', password: 'Senha-ação-漢字-🔋', hash: '$2b$04$RL30Ax8p6d3I4uhlx.Jawe1Ttuip9BTCL4QYd1XhMrs770WK1/Ajm' },
    { label: 'ASCII 2a', password: 'Migracao-Sintetica-123!', hash: '$2a$04$iojuvOBJ2Q.YkFDLsWvFjuCd.la9rcmAmNwvNASqMmO9/qh99dgNK' },
  ])('autentica hash legado $label e recusa senha incorreta', async ({ password, hash }) => {
    user.passwordHash = hash;
    await expect(service.login({ email: user.email, password })).resolves.toMatchObject({ user: { id: user.id } });
    await expect(service.login({ email: user.email, password: password + '!' })).rejects.toMatchObject({ status: 401 });
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('emite tokens só após persistir hash do refresh e retorna perfil sem senha', async () => {
    const result = await service.login({ email: ' ANA@EXAMPLE.COM ', password: 'Senha@123' });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'ana@example.com' } }));
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      userId: user.id, tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }) }));
    expect(result.user).toMatchObject({ id: user.id, email: user.email, roles: ['USER'] });
    expect(JSON.stringify(result.user)).not.toContain('passwordHash');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(jwt.signAsync).toHaveBeenNthCalledWith(1, expect.objectContaining({ typ: 'access' }), expect.objectContaining({ secret: 'access-secret', expiresIn: '15m' }));
    expect(jwt.signAsync).toHaveBeenNthCalledWith(2, expect.objectContaining({ typ: 'refresh' }), expect.objectContaining({ secret: 'refresh-secret', expiresIn: '7d' }));
    expect(attempts.clear).toHaveBeenCalled();
  });

  it('não emite sessão quando o armazenamento falha', async () => {
    createSession.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(service.login({ email: 'ana@example.com', password: 'Senha@123' })).rejects.toThrow('storage unavailable');
    expect(attempts.clear).not.toHaveBeenCalled();
  });

  it('responde genericamente para email ausente, senha errada e conta pendente', async () => {
    for (const account of [null, user, { ...user, status: 'PENDING_VERIFICATION' }]) {
      findUnique.mockResolvedValueOnce(account);
      await expect(service.login({ email: 'ana@example.com', password: account === user ? 'errada' : 'Senha@123' }))
        .rejects.toMatchObject({ status: 401 });
    }
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe('AuthService.logout', () => {
  const jwt = new JwtService();
  const config = { getOrThrow: (key: string) => ({
    'auth.accessSecret': 'access-secret', 'auth.refreshSecret': 'refresh-secret',
    'auth.accessExpiration': '15m', 'auth.refreshExpiration': '7d',
  })[key] } as unknown as ConfigService;
  const findSession = jest.fn();
  const listSessions = jest.fn();
  const updateSessions = jest.fn();
  const findUser = jest.fn();
  const prisma = {
    refreshSession: { findUnique: findSession, findMany: listSessions, updateMany: updateSessions },
    user: { findUnique: findUser },
    $transaction: jest.fn(async (run: (tx: unknown) => Promise<unknown>) => run(prisma)),
  } as unknown as PrismaService;
  const service = new AuthService(prisma, {} as LoginAttemptsService, jwt, config);
  let refreshToken: string;
  let accessToken: string;
  let session: { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null; replacedBySessionId: string | null };

  beforeEach(async () => {
    jest.clearAllMocks();
    refreshToken = await jwt.signAsync({ sub: 'user-id', sid: 'session-id', typ: 'refresh' }, { secret: 'refresh-secret', expiresIn: '7d' });
    accessToken = await jwt.signAsync({ sub: 'user-id', sid: 'session-id', typ: 'access' }, { secret: 'access-secret', expiresIn: '15m' });
    session = { id: 'session-id', userId: 'user-id', tokenHash: createHash('sha256').update(refreshToken).digest('hex'), expiresAt: new Date(Date.now() + 60_000), revokedAt: null, replacedBySessionId: null };
    findSession.mockImplementation(async () => session);
    listSessions.mockImplementation(async () => [{ id: session.id }]);
    findUser.mockResolvedValue({ id: 'user-id', status: 'ACTIVE' });
    updateSessions.mockImplementation(async ({ data }: { data: { revokedAt: Date } }) => { session.revokedAt = data.revokedAt; return { count: 1 }; });
  });

  it('revoga somente a sessão validada, aceita repetição e impede refresh posterior', async () => {
    await expect(service.logout(refreshToken)).resolves.toBeUndefined();
    await expect(service.logout(refreshToken)).resolves.toBeUndefined();
    expect(updateSessions).toHaveBeenCalledWith(expect.objectContaining({ where: { id: session.id, userId: session.userId, tokenHash: session.tokenHash } }));
    expect(session.revokedAt).toBeInstanceOf(Date);
    await expect(service.refresh(refreshToken)).rejects.toMatchObject({ status: 401 });
  });

  it('revoga o sucessor quando o logout recebe um refresh já rotacionado', async () => {
    session.revokedAt = new Date();
    session.replacedBySessionId = 'successor-id';
    const successor = { ...session, id: 'successor-id', revokedAt: null, replacedBySessionId: null };
    findSession.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === session.id ? session : successor);
    await service.logout(refreshToken);
    expect(updateSessions).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'successor-id' }) }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('nega token ausente, adulterado, expirado ou de tipo incorreto sem revogar', async () => {
    const expired = await jwt.signAsync({ sub: 'user-id', sid: 'session-id', typ: 'refresh' }, { secret: 'refresh-secret', expiresIn: -1 });
    const wrongType = await jwt.signAsync({ sub: 'user-id', sid: 'session-id', typ: 'access' }, { secret: 'refresh-secret' });
    for (const token of [undefined, refreshToken + 'alterado', expired, accessToken, wrongType]) {
      await expect(service.logout(token)).rejects.toMatchObject({ status: 401 });
    }
    expect(updateSessions).not.toHaveBeenCalled();
  });

  it('nega sessão alheia, inexistente, expirada ou com hash inválido', async () => {
    const original = { ...session };
    for (const change of [{ userId: 'another-user' }, { expiresAt: new Date(0) }, { tokenHash: 'hash-invalido' }]) {
      Object.assign(session, original, change);
      await expect(service.logout(refreshToken)).rejects.toMatchObject({ status: 401 });
    }
    findSession.mockResolvedValueOnce(null);
    await expect(service.logout(refreshToken)).rejects.toMatchObject({ status: 401 });
    expect(updateSessions).not.toHaveBeenCalled();
  });

  it('logout-all revoga apenas as sessões do usuário do access validado', async () => {
    const second = { ...session, id: 'second-id' };
    const foreign = { ...session, id: 'foreign-id', userId: 'other-user' };
    const rows = new Map([session, second, foreign].map((row) => [row.id, row]));
    listSessions.mockResolvedValueOnce([{ id: session.id }, { id: second.id }]);
    findSession.mockImplementation(async ({ where }: { where: { id: string } }) => rows.get(where.id));
    updateSessions.mockImplementation(async ({ where, data }: { where: { id: string }; data: { revokedAt: Date } }) => {
      rows.get(where.id)!.revokedAt = data.revokedAt;
      return { count: 1 };
    });
    await service.logoutAll(accessToken);
    expect(listSessions).toHaveBeenCalledWith({ where: { userId: session.userId }, select: { id: true } });
    expect(second.revokedAt).toBeInstanceOf(Date);
    expect(foreign.revokedAt).toBeNull();
    await expect(service.refresh(refreshToken)).rejects.toMatchObject({ status: 401 });
  });

  it('logout-all acompanha o sucessor criado enquanto a revogação aguarda a sessão', async () => {
    const successor = { ...session, id: 'new-id', replacedBySessionId: null };
    findSession.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === session.id ? session : successor);
    updateSessions.mockImplementation(async ({ where, data }: { where: { id: string }; data: { revokedAt: Date } }) => {
      if (where.id === session.id) session.replacedBySessionId = successor.id;
      (where.id === session.id ? session : successor).revokedAt = data.revokedAt;
      return { count: 1 };
    });
    await service.logoutAll(accessToken);
    expect(successor.revokedAt).toBeInstanceOf(Date);
    expect(updateSessions).toHaveBeenCalledWith(expect.objectContaining({ where: { id: session.id } }));
    expect(updateSessions).toHaveBeenCalledWith(expect.objectContaining({ where: { id: successor.id } }));
  });

  it('nega logout-all para refresh, conta pendente/bloqueada ou sessão revogada', async () => {
    await expect(service.logoutAll(refreshToken)).rejects.toMatchObject({ status: 401 });
    for (const status of ['PENDING_VERIFICATION', 'BLOCKED']) {
      findUser.mockResolvedValueOnce({ status });
      await expect(service.logoutAll(accessToken)).rejects.toMatchObject({ status: 401 });
    }
    session.revokedAt = new Date();
    await expect(service.logoutAll(accessToken)).rejects.toMatchObject({ status: 401 });
    expect(updateSessions).not.toHaveBeenCalled();
  });

  it('nega logout-all com token inválido ou vínculo alheio sem revogar terceiros', async () => {
    for (const token of [undefined, accessToken + 'alterado']) {
      await expect(service.logoutAll(token)).rejects.toMatchObject({ status: 401 });
    }
    session.userId = 'other-user';
    await expect(service.logoutAll(accessToken)).rejects.toMatchObject({ status: 401 });
    expect(updateSessions).not.toHaveBeenCalled();
  });

  it('propaga falha de revogação para não confirmar logout sem persistência', async () => {
    updateSessions.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(service.logout(refreshToken)).rejects.toThrow('storage unavailable');
  });
});
