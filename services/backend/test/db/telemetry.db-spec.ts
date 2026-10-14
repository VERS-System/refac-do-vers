// Verifica deduplicação MQTT e amostras ordenadas em lotes no PostgreSQL isolado.

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

describe('Mensagens MQTT e telemetria', () => {
  const prisma = new PrismaClient();
  const userId = randomUUID();
  const vehicleId = randomUUID();
  const installationId = randomUUID();
  const deviceId = randomUUID();
  const sampleIds: string[] = [];

  // Cria uma origem sintética sem placa ou dados pessoais no payload MQTT.
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
      userId,
      `mqtt-${userId}@example.test`,
      'hash-ficticio',
      'ACTIVE',
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO vehicles (id, license_plate, updated_at) VALUES ($1::uuid, $2, now())',
      vehicleId,
      `MQT${vehicleId.slice(0, 4).toUpperCase()}`,
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO user_vehicles (user_id, vehicle_id, relationship, is_primary, updated_at) VALUES ($1::uuid, $2::uuid, $3::vehicle_relationship, true, now())',
      userId,
      vehicleId,
      'OWNER',
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO vers_installations (id, vehicle_id, system_model, status, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4::installation_status, now())',
      installationId,
      vehicleId,
      'VERS-MOCK',
      'ACTIVE',
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO devices (id, installation_id, vehicle_id, device_uid, status, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::device_status, now())',
      deviceId,
      installationId,
      vehicleId,
      `esp-${deviceId}`,
      'OFFLINE',
    );
  });

  // Remove amostras e entidades sintéticas sem deixar vínculos ativos.
  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'DELETE FROM telemetry_samples WHERE id = ANY($1::uuid[])',
      sampleIds,
    );
    await prisma.$executeRawUnsafe(
      'DELETE FROM user_vehicles WHERE user_id = $1::uuid',
      userId,
    );
    await prisma.$executeRawUnsafe('DELETE FROM vehicles WHERE id = $1::uuid', vehicleId);
    await prisma.$executeRawUnsafe('DELETE FROM users WHERE id = $1::uuid', userId);
    await prisma.$disconnect();
  });

  // Persiste um envelope sintético com a identidade do lote e sua sequência.
  async function createMessage(sequence: number, messageId = randomUUID()): Promise<string> {
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      'INSERT INTO mqtt_messages (id, message_id, device_id, schema_version, topic, payload, sequence, qos, retained, captured_at, received_at, status, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, 1, $4, $5::jsonb, $6::bigint, 1, false, now(), now(), $7::mqtt_processing_status, now())',
      id,
      messageId,
      deviceId,
      'vers/devices/telemetry',
      JSON.stringify({ samples: [{ voltageV: 2.4 }] }),
      sequence,
      'RECEIVED',
    );
    return id;
  }

  // Recusa retransmissões pelo ID global ou sequência do mesmo dispositivo.
  it('deduplica mensagens sem reescrever o payload original', async () => {
    const messageId = randomUUID();
    const rowId = await createMessage(10, messageId);
    await expect(createMessage(11, messageId)).rejects.toThrow();
    await expect(createMessage(10)).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE mqtt_messages SET payload = $1::jsonb WHERE id = $2::uuid',
        JSON.stringify({ samples: [] }),
        rowId,
      ),
    ).rejects.toThrow();
  });

  // Garante várias amostras por mensagem e uma posição única em cada lote.
  it('preserva ordem e ausência de medidas sem converter nulo em zero', async () => {
    const messageRowId = await createMessage(12);
    const firstId = randomUUID();
    const secondId = randomUUID();
    sampleIds.push(firstId, secondId);
    await prisma.$executeRawUnsafe(
      'INSERT INTO telemetry_samples (id, message_id, sample_index, captured_at, voltage_v, current_a, quality) VALUES ($1::uuid, $2::uuid, 0, now(), 0, NULL, $3::telemetry_quality), ($4::uuid, $2::uuid, 1, now() + interval \'1 second\', 2.4, 0.1, $3::telemetry_quality)',
      firstId,
      messageRowId,
      'PARTIAL',
      secondId,
    );
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO telemetry_samples (id, message_id, sample_index, captured_at, quality) VALUES ($1::uuid, $2::uuid, 1, now(), $3::telemetry_quality)',
        randomUUID(),
        messageRowId,
        'VALID',
      ),
    ).rejects.toThrow();

    const rows = await prisma.$queryRawUnsafe<
      Array<{ sample_index: number; voltage_v: number | null; current_a: number | null }>
    >('SELECT sample_index, voltage_v, current_a FROM telemetry_samples WHERE message_id = $1::uuid ORDER BY sample_index', messageRowId);
    expect(rows).toEqual([
      { sample_index: 0, voltage_v: 0, current_a: null },
      { sample_index: 1, voltage_v: 2.4, current_a: 0.1 },
    ]);
  });

  // Apaga o bruto identificável após exclusão física, mas mantém medidas históricas.
  it('preserva amostras normalizadas após remover veículo e bruto MQTT', async () => {
    const messageRowId = await createMessage(13);
    const sampleId = randomUUID();
    sampleIds.push(sampleId);
    await prisma.$executeRawUnsafe(
      'INSERT INTO telemetry_samples (id, message_id, sample_index, device_id, installation_id, captured_at, voltage_v, quality) VALUES ($1::uuid, $2::uuid, 0, $3::uuid, $4::uuid, now(), 2.4, $5::telemetry_quality)',
      sampleId,
      messageRowId,
      deviceId,
      installationId,
      'VALID',
    );
    await prisma.$executeRawUnsafe('DELETE FROM user_vehicles WHERE user_id = $1::uuid', userId);
    await expect(
      prisma.$executeRawUnsafe('DELETE FROM vehicles WHERE id = $1::uuid', vehicleId),
    ).rejects.toThrow();
    await prisma.$executeRawUnsafe('DELETE FROM mqtt_messages WHERE device_id = $1::uuid', deviceId);
    await prisma.$executeRawUnsafe('DELETE FROM vehicles WHERE id = $1::uuid', vehicleId);

    const messages = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT count(*) FROM mqtt_messages WHERE id = $1::uuid',
      messageRowId,
    );
    const samples = await prisma.$queryRawUnsafe<
      Array<{
        message_id: string | null;
        device_id: string | null;
        installation_id: string | null;
        voltage_v: number | null;
      }>
    >('SELECT message_id, device_id, installation_id, voltage_v FROM telemetry_samples WHERE id = $1::uuid', sampleId);

    expect(messages[0]?.count).toBe(0n);
    expect(samples[0]).toMatchObject({
      message_id: null,
      device_id: null,
      installation_id: null,
      voltage_v: 2.4,
    });
  });
});
