// Verifica persistência mínima de eventos sem credenciais nem erro interno exposto.
import { PrismaService } from '../../prisma/prisma.service';
import { AuditPolicyService } from './audit-policy.service';
import { AuditWriterService } from './audit-writer.service';

describe('AuditWriterService', () => {
  const create = jest.fn();
  const prisma = { auditEvent: { create } } as unknown as PrismaService;
  const policy = new AuditPolicyService();

  beforeEach(() => create.mockReset().mockResolvedValue({ id: 'synthetic-event' }));

  it('persiste somente a projeção allowlist sem payload', async () => {
    await new AuditWriterService(prisma, policy).persist({ action: 'auth.login', resourceType: 'session', result: 'SUCCESS', requestId: 'request-audit', payload: { password: 'senha', token: 'jwt', email: 'email@example.com' } });
    expect(create).toHaveBeenCalledWith({ data: { action: 'auth.login', resourceType: 'session', result: 'SUCCESS', requestId: 'request-audit', actorId: null, resourceId: null } });
  });

  it('rejeita evento inválido antes de acessar o banco', async () => {
    await expect(new AuditWriterService(prisma, policy).persist({ action: 'debug.dump', resourceType: 'session', result: 'SUCCESS' })).rejects.toThrow('Acao de auditoria nao permitida');
    expect(create).not.toHaveBeenCalled();
  });

  it('oculta a causa interna da falha de armazenamento', async () => {
    create.mockRejectedValue(new Error('postgresql://senha-interna'));
    await expect(new AuditWriterService(prisma, policy).persist({ action: 'auth.logout', resourceType: 'session', result: 'FAILURE' })).rejects.toThrow('Falha ao registrar auditoria');
  });
});
