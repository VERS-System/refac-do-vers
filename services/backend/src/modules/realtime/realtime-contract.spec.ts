// Exercita o contrato de invalidação na fronteira Redis sem payload MQTT ou serviços externos.
import { dataUpdatedChannel, parseDataUpdatedEvent } from './realtime-contract';

const resource = { type: 'test', id: '00000000-0000-4000-8000-000000000501' };
const event = { version: 1, type: 'data.updated', resource, occurredAt: '2026-10-14T12:00:00.000Z' };

describe('contrato Redis de atualização', () => {
  it.each(['test', 'installation'])('aceita aviso mínimo por %s e deriva canal controlado', (type) => {
    const input = { ...event, resource: { ...resource, type } };
    const parsed = parseDataUpdatedEvent(JSON.stringify(input));
    expect(parsed).toEqual(input);
    expect(dataUpdatedChannel(parsed)).toBe(`vers:v1:realtime:${type}:${resource.id}`);
  });
  it.each([null, [], {}, { ...event, version: 2 }, { ...event, type: 'telemetry.processed' },
    { ...event, resource: { ...resource, type: 'user' } }, { ...event, resource: { ...resource, id: '*' } },
    { ...event, resource: { ...resource, userId: 'private' } }, { ...event, measurements: { voltageV: 4 } },
    { ...event, correlationId: 'private' }, { ...event, occurredAt: '2026-02-30T12:00:00Z' },
    { ...event, occurredAt: '2026-10-14T12:00:00-03:00' }, { ...event, resource: null }])(
    'rejeita formato inválido sem incluir o conteúdo no erro %#', (input) => {
      expect(() => parseDataUpdatedEvent(JSON.stringify(input))).toThrow('REALTIME_INVALID_EVENT');
    });
  it('limita bytes antes do parse e não confunde caracteres multibyte com bytes', () => {
    expect(() => parseDataUpdatedEvent(' '.repeat(1025))).toThrow('REALTIME_INVALID_EVENT');
    expect(() => parseDataUpdatedEvent('á'.repeat(513))).toThrow('REALTIME_INVALID_EVENT');
    expect(() => parseDataUpdatedEvent('not-json-secret')).toThrow('REALTIME_INVALID_EVENT');
    const exact = JSON.stringify(event).padEnd(1024);
    expect(parseDataUpdatedEvent(exact)).toEqual(event);
  });
});
