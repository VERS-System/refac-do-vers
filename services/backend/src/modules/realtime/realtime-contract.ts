// Valida avisos mínimos de atualização no Redis, sem aceitar medições ou canais arbitrários.
import 'reflect-metadata';
import { isUUID } from 'class-validator';
import { IsValidUtcDateTime } from '../../common/dto/pagination.dto';

export type DataUpdatedEvent = Readonly<{ version: 1; type: 'data.updated';
  resource: Readonly<{ type: 'test' | 'installation'; id: string }>; occurredAt: string }>;
const utcDate = new IsValidUtcDateTime();

/** Exige objeto simples do JSON para validar campos antes de acessar recursos aninhados. */
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REALTIME_INVALID_EVENT');
  return value as Record<string, unknown>;
}

/** Limita bytes e valida allowlist, identidade e data sem expor conteúdo inválido no erro. */
export function parseDataUpdatedEvent(payload: string): DataUpdatedEvent {
  try {
    if (typeof payload !== 'string' || Buffer.byteLength(payload, 'utf8') > 1024) throw new Error();
    const event = object(JSON.parse(payload)); const resource = object(event.resource);
    if (Object.keys(event).some((key) => !['version', 'type', 'resource', 'occurredAt'].includes(key)) ||
      Object.keys(resource).some((key) => !['type', 'id'].includes(key)) ||
      event.version !== 1 || event.type !== 'data.updated' ||
      (resource.type !== 'test' && resource.type !== 'installation') ||
      typeof resource.id !== 'string' || !isUUID(resource.id, '4') ||
      typeof event.occurredAt !== 'string' || !utcDate.validate(event.occurredAt)) throw new Error();
    return { version: 1, type: 'data.updated', resource: { type: resource.type, id: resource.id }, occurredAt: event.occurredAt };
  } catch { throw new Error('REALTIME_INVALID_EVENT'); }
}

/** Deriva somente o canal interno do recurso já validado, sem aceitar nome vindo do cliente. */
export function dataUpdatedChannel(event: DataUpdatedEvent): string {
  return `vers:v1:realtime:${event.resource.type}:${event.resource.id}`;
}
