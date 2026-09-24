// Testes da politica minima de auditoria reutilizavel pelas fases de dominio.

import { AuditPolicyService } from './audit-policy.service';

describe('AuditPolicyService', () => {
  it('aceita somente eventos allowlist e campos persistiveis', () => {
    const service = new AuditPolicyService();

    expect(
      service.createEvent({
        action: 'auth.login',
        resourceType: 'session',
        result: 'SUCCESS',
        actorId: '6f7b7f64-7b7f-4a7a-9f67-8e9e5f9f7a11',
        requestId: 'request-audit',
        payload: { password: 'segredo' },
      }),
    ).toEqual({
      action: 'auth.login',
      resourceType: 'session',
      result: 'SUCCESS',
      actorId: '6f7b7f64-7b7f-4a7a-9f67-8e9e5f9f7a11',
      resourceId: null,
      requestId: 'request-audit',
    });
  });

  it('rejeita acoes fora da allowlist', () => {
    const service = new AuditPolicyService();

    expect(() =>
      service.createEvent({
        action: 'debug.dump_payload',
        resourceType: 'debug',
        result: 'FAILURE',
      }),
    ).toThrow('Acao de auditoria nao permitida');
  });
});
