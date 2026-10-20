// Exercita códigos de auditoria e limpeza histórica no PostgreSQL sintético real.
import { randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditPolicyService } from '../../src/common/audit/audit-policy.service';
import { AuditWriterService } from '../../src/common/audit/audit-writer.service';
import { requireLocalDatabase } from '../mqtt/fixtures';

describe('Auditoria persistida e códigos legados', () => {
  const prisma = new PrismaService();
  const requestId = randomUUID();
  const userId = randomUUID();
  const vehicleId = randomUUID();

  beforeAll(async () => { requireLocalDatabase(); await prisma.$connect(); });
  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { requestId } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('persiste gravador de auth real com campos mínimos', async () => {
    await new AuditWriterService(prisma, new AuditPolicyService()).persist({ action: 'auth.login',
      resourceType: 'session', result: 'SUCCESS', requestId, payload: { password: 'nunca-persistir' } });
    expect(await prisma.auditEvent.findMany({ where: { requestId }, select: {
      action: true, resourceType: true, result: true, actorId: true, resourceId: true,
    } })).toEqual([{ action: 'auth.login', resourceType: 'session', result: 'SUCCESS', actorId: null, resourceId: null }]);
  });

  it.each([['senha livre', 'session'], ['auth.login', 'recurso livre']])('rejeita códigos SQL inválidos: %s/%s', async (action, resourceType) => {
    await expect(prisma.auditEvent.create({ data: { action, resourceType, result: 'SUCCESS', requestId } })).rejects.toThrow();
  });

  it('limpa recurso e ator de usuário/veículo nos formatos atual e legado', async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@audit.invalid`, passwordHash: 'hash-sintetico' } });
    await prisma.vehicle.create({ data: { id: vehicleId, licensePlate: `AUD${randomInt(10000).toString().padStart(4, '0')}` } });
    const ids: string[] = [];
    for (const [resourceType, resourceId, action] of [
      ['user', userId, 'auth.register'], ['USER', userId, 'USER_CREATED'],
      ['vehicle', vehicleId, 'vehicle.create'], ['VEHICLE', vehicleId, 'VEHICLE_LINKED'],
    ]) {
      const row = await prisma.auditEvent.create({ data: { resourceType, resourceId, action,
        actorId: userId, result: 'SUCCESS', requestId } });
      ids.push(row.id);
    }
    await prisma.vehicle.delete({ where: { id: vehicleId } });
    await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.auditEvent.findMany({ where: { id: { in: ids } }, select: { actorId: true, resourceId: true } }))
      .toEqual(Array.from({ length: 4 }, () => ({ actorId: null, resourceId: null })));
  });
});
