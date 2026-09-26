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
const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;

/** Mantém IDs opcionais dentro dos formatos aceitos pelo banco e pelo HTTP. */
function toAllowedId(value: string | null | undefined, pattern: RegExp): string | null {
  if (value == null) return null;
  if (!pattern.test(value)) throw new Error('Identificador de auditoria invalido');
  return value;
}

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
      actorId: toAllowedId(input.actorId, UUID_PATTERN),
      resourceId: toAllowedId(input.resourceId, UUID_PATTERN),
      requestId: toAllowedId(input.requestId, REQUEST_ID_PATTERN),
    };
  }

  /**
   * Entrega somente o evento permitido ao gravador fornecido pelo domínio.
   * Oculta erros internos de armazenamento sem guardar payload livre.
   */
  async persistEvent(
    input: AuditEventInput,
    persist: (event: SafeAuditEvent) => Promise<void>,
  ): Promise<void> {
    const event = this.createEvent(input);

    try {
      await persist(event);
    } catch {
      throw new Error('Falha ao registrar auditoria');
    }
  }
}
