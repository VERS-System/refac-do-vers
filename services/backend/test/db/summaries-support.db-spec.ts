// Verifica resumos decimais, suporte e auditoria no PostgreSQL descartável.

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

describe('Resumos, suporte e auditoria', () => {
  const prisma = new PrismaClient();
  const userId = randomUUID();
  const vehicleId = randomUUID();
  const installationId = randomUUID();
  const summaryId = randomUUID();
  const supportId = randomUUID();
  const auditId = randomUUID();

  // Cria o contexto sintético necessário para as FKs destes três domínios.
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
      userId,
      `summary-${userId}@example.test`,
      'hash-ficticio',
      'ACTIVE',
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO vehicles (id, license_plate, updated_at) VALUES ($1::uuid, $2, now())',
      vehicleId,
      `SUM${vehicleId.slice(0, 4).toUpperCase()}`,
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
  });

  // Limpa somente os registros sintéticos criados por esta suíte.
  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM audit_events WHERE id = $1::uuid', auditId);
    await prisma.$executeRawUnsafe('DELETE FROM support_requests WHERE id = $1::uuid', supportId);
    await prisma.$executeRawUnsafe('DELETE FROM energy_summaries WHERE id = $1::uuid', summaryId);
    await prisma.$executeRawUnsafe('DELETE FROM user_vehicles WHERE user_id = $1::uuid', userId);
    await prisma.$executeRawUnsafe('DELETE FROM vehicles WHERE id = $1::uuid', vehicleId);
    await prisma.$executeRawUnsafe('DELETE FROM users WHERE id = $1::uuid', userId);
    await prisma.$disconnect();
  });

  // Conserva a precisão financeira e rejeita outro resumo do mesmo período.
  it('guarda decimais exatos e um resumo por período e versão', async () => {
    await prisma.$executeRawUnsafe(
      'INSERT INTO energy_summaries (id, installation_id, period_type, period_start, period_end, recovered_energy_wh, vehicle_energy_used_wh, money_saved, currency_code, energy_tariff_per_kwh, sample_count, quality, calculation_version, calculated_at) VALUES ($1::uuid, $2::uuid, $3::summary_period, $4::timestamptz, $5::timestamptz, 15.5, NULL, $6::numeric, $7, $8::numeric, 2, $9::summary_quality, 1, now())',
      summaryId,
      installationId,
      'HOUR',
      '2026-09-22T10:00:00Z',
      '2026-09-22T11:00:00Z',
      '0.123456',
      'BRL',
      '0.12345678',
      'PARTIAL',
    );
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO energy_summaries (id, installation_id, period_type, period_start, period_end, recovered_energy_wh, sample_count, quality, calculation_version, calculated_at) VALUES ($1::uuid, $2::uuid, $3::summary_period, $4::timestamptz, $5::timestamptz, 15.5, 2, $6::summary_quality, 1, now())',
        randomUUID(),
        installationId,
        'HOUR',
        '2026-09-22T10:00:00Z',
        '2026-09-22T11:00:00Z',
        'PARTIAL',
      ),
    ).rejects.toThrow();

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        money_saved: string;
        energy_tariff_per_kwh: string;
        vehicle_energy_used_wh: number | null;
      }>
    >('SELECT money_saved::text, energy_tariff_per_kwh::text, vehicle_energy_used_wh FROM energy_summaries WHERE id = $1::uuid', summaryId);
    expect(rows[0]).toEqual({
      money_saved: '0.123456',
      energy_tariff_per_kwh: '0.12345678',
      vehicle_energy_used_wh: null,
    });
  });

  // Registra somente os campos mínimos do evento, com recurso opaco.
  it('registra evento de auditoria sem payload ou placa', async () => {
    await prisma.$executeRawUnsafe(
      'INSERT INTO audit_events (id, actor_id, action, resource_type, resource_id, result, request_id) VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::audit_result, $7)',
      auditId,
      userId,
      'VEHICLE_LINKED',
      'VEHICLE',
      vehicleId,
      'SUCCESS',
      'request-sintetico',
    );
    const rows = await prisma.$queryRawUnsafe<Array<{ resource_id: string | null }>>(
      'SELECT resource_id FROM audit_events WHERE id = $1::uuid',
      auditId,
    );
    expect(rows[0]?.resource_id).toBe(vehicleId);
  });

  // Preserva solicitações, resumos e eventos sem vínculo com o veículo removido.
  it('desvincula suporte e auditoria após a exclusão física', async () => {
    await prisma.$executeRawUnsafe(
      'INSERT INTO support_requests (id, requester_id, vehicle_id, installation_id, reason, status, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6::support_status, now())',
      supportId,
      userId,
      vehicleId,
      installationId,
      'Revisar montagem sintética',
      'OPEN',
    );
    await prisma.$executeRawUnsafe('DELETE FROM user_vehicles WHERE user_id = $1::uuid', userId);
    await prisma.$executeRawUnsafe('DELETE FROM vehicles WHERE id = $1::uuid', vehicleId);
    await prisma.$executeRawUnsafe('DELETE FROM users WHERE id = $1::uuid', userId);

    const support = await prisma.$queryRawUnsafe<
      Array<{ requester_id: string | null; vehicle_id: string | null; installation_id: string | null }>
    >('SELECT requester_id, vehicle_id, installation_id FROM support_requests WHERE id = $1::uuid', supportId);
    const summary = await prisma.$queryRawUnsafe<Array<{ installation_id: string | null }>>(
      'SELECT installation_id FROM energy_summaries WHERE id = $1::uuid',
      summaryId,
    );
    const audit = await prisma.$queryRawUnsafe<
      Array<{ actor_id: string | null; resource_id: string | null }>
    >('SELECT actor_id, resource_id FROM audit_events WHERE id = $1::uuid', auditId);

    expect(support[0]).toEqual({ requester_id: null, vehicle_id: null, installation_id: null });
    expect(summary[0]?.installation_id).toBeNull();
    expect(audit[0]).toEqual({ actor_id: null, resource_id: null });
  });
});
