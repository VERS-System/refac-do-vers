// Politica minima de auditoria reutilizavel pelos modulos de dominio.

import { Injectable } from '@nestjs/common';

type AuditResult = 'SUCCESS' | 'FAILURE';
type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'vehicle.create'
  | 'vehicle.update'
  | 'vehicle.delete'
  | 'test.start'
  | 'test.finish'
  | 'test.cancel'
  | 'support.create';

type AuditResourceType =
  | 'session'
  | 'user'
  | 'vehicle'
  | 'test'
  | 'supportRequest';

export interface AuditEventInput {
  action: string;
  resourceType: string;
  result: AuditResult;
  actorId?: string | null;
  resourceId?: string | null;
  requestId?: string | null;
  payload?: unknown;
}

export interface SafeAuditEvent {
  action: AuditAction;
  resourceType: AuditResourceType;
  result: AuditResult;
  actorId: string | null;
  resourceId: string | null;
  requestId: string | null;
}

const ALLOWED_ACTIONS = new Set<AuditAction>([
  'auth.login',
  'auth.logout',
  'auth.register',
  'vehicle.create',
  'vehicle.update',
  'vehicle.delete',
  'test.start',
  'test.finish',
  'test.cancel',
  'support.create',
]);

const ALLOWED_RESOURCE_TYPES = new Set<AuditResourceType>([
  'session',
  'user',
  'vehicle',
  'test',
  'supportRequest',
]);

/**
 * Verifica se o valor pertence a allowlist de acoes auditaveis.
 * A validacao impede que payloads livres virem linhas de auditoria.
 */
function toAllowedAction(action: string): AuditAction {
  if (!ALLOWED_ACTIONS.has(action as AuditAction)) {
    throw new Error('Acao de auditoria nao permitida');
  }

  return action as AuditAction;
}

/**
 * Verifica se o recurso auditado pertence ao conjunto persistivel.
 * Tipos soltos sao rejeitados para manter a tabela enxuta e consultavel.
 */
function toAllowedResourceType(resourceType: string): AuditResourceType {
  if (!ALLOWED_RESOURCE_TYPES.has(resourceType as AuditResourceType)) {
    throw new Error('Recurso de auditoria nao permitido');
  }

  return resourceType as AuditResourceType;
}

@Injectable()
export class AuditPolicyService {
  /**
   * Produz o evento seguro que pode ser persistido por fases futuras.
   * O campo `payload` e deliberadamente ignorado para nao armazenar segredos.
   */
  createEvent(input: AuditEventInput): SafeAuditEvent {
    return {
      action: toAllowedAction(input.action),
      resourceType: toAllowedResourceType(input.resourceType),
      result: input.result,
      actorId: input.actorId ?? null,
      resourceId: input.resourceId ?? null,
      requestId: input.requestId ?? null,
    };
  }
}
