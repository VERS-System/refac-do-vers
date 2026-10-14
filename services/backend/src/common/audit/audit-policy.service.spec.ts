// Testes da politica minima de auditoria reutilizavel pelas fases de dominio.

import { AuditPolicyService } from './audit-policy.service';

describe('AuditPolicyService', () => {
  it.each(['auth.refresh', 'auth.logout-all'])('aceita o evento de sessão %s sem payload', (action) => {
    expect(new AuditPolicyService().createEvent({ action, resourceType: 'session', result: 'SUCCESS', payload: { token: 'segredo' } })).toEqual({ action, resourceType: 'session', result: 'SUCCESS', actorId: null, resourceId: null, requestId: null });
  });

  it('rejeita resultado inválido recebido em runtime', () => {
    expect(() => new AuditPolicyService().createEvent({ action: 'auth.login', resourceType: 'session', result: 'INVALID' as 'SUCCESS' })).toThrow('Resultado de auditoria nao permitido');
  });
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

  it('entrega só o evento seguro e oculta falha interna de persistência', async () => {
    const service = new AuditPolicyService();
    const persist = jest.fn().mockRejectedValue(new Error('postgresql://segredo-interno'));

    await expect(service.persistEvent({
      action: 'vehicle.create',
      resourceType: 'vehicle',
      result: 'FAILURE',
      requestId: 'request-audit',
      payload: { password: 'senha-sintetica' },
    }, persist)).rejects.toThrow('Falha ao registrar auditoria');

    expect(persist).toHaveBeenCalledWith({
      action: 'vehicle.create',
      resourceType: 'vehicle',
      result: 'FAILURE',
      actorId: null,
      resourceId: null,
      requestId: 'request-audit',
    });
    expect(JSON.stringify(persist.mock.calls)).not.toContain('senha-sintetica');
  });

  it('rejeita identificadores fora do formato persistível', () => {
    const service = new AuditPolicyService();

    expect(() => service.createEvent({
      action: 'auth.login',
      resourceType: 'session',
      result: 'SUCCESS',
      actorId: 'email@example.com',
    })).toThrow('Identificador de auditoria invalido');
    expect(() => service.createEvent({
      action: 'vehicle.create',
      resourceType: 'vehicle',
      result: 'SUCCESS',
      resourceId: 'placa-ABC1234',
    })).toThrow('Identificador de auditoria invalido');
    expect(() => service.createEvent({
      action: 'auth.login',
      resourceType: 'session',
      result: 'SUCCESS',
      requestId: 'id com espaco',
    })).toThrow('Identificador de auditoria invalido');
  });
});
