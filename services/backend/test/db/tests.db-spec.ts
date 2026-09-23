// Verifica snapshots e referências históricas dos testes no PostgreSQL isolado.

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

describe('Testes experimentais e histórico', () => {
  const prisma = new PrismaClient();
  const userIds: string[] = [];
  const vehicleIds: string[] = [];
  const testIds: string[] = [];

  // Monta entidades sintéticas ligadas para exercitar o snapshot do teste.
  async function createScenario(): Promise<{
    userId: string;
    vehicleId: string;
    installationId: string;
    configurationId: string;
  }> {
    const userId = randomUUID();
    const vehicleId = randomUUID();
    const installationId = randomUUID();
    const configurationId = randomUUID();
    userIds.push(userId);
    vehicleIds.push(vehicleId);
    await prisma.$executeRawUnsafe(
      'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
      userId,
      `test-${userId}@example.test`,
      'hash-ficticio',
      'ACTIVE',
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO vehicles (id, license_plate, model, updated_at) VALUES ($1::uuid, $2, $3, now())',
      vehicleId,
      `TST${vehicleId.slice(0, 4).toUpperCase()}`,
      'Modelo de ensaio',
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
      'INSERT INTO configurations (id, installation_id, name, version, active_piezo_count, piezo_association, installation_point, storage_type) VALUES ($1::uuid, $2::uuid, $3, 1, 4, $4::piezo_association, $5, $6::storage_type)',
      configurationId,
      installationId,
      'Montagem inicial',
      'PARALLEL',
      'Eixo traseiro',
      'CAPACITOR',
    );
    return { userId, vehicleId, installationId, configurationId };
  }

  // Cria um teste com o contexto experimental copiado para colunas históricas.
  async function createTest(scenario: Awaited<ReturnType<typeof createScenario>>): Promise<string> {
    const id = randomUUID();
    testIds.push(id);
    await prisma.$executeRawUnsafe(
      'INSERT INTO tests (id, vehicle_id, installation_id, configuration_id, created_by_id, name, status, terrain, snapshot_vehicle_model, snapshot_test_location, snapshot_active_piezo_count, snapshot_configuration_version, vehicle_weight_kg, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7::test_status, $8::terrain_type, $9, $10, $11, $12, $13, now())',
      id,
      scenario.vehicleId,
      scenario.installationId,
      scenario.configurationId,
      scenario.userId,
      'Ensaio sintético',
      'PLANNED',
      'CITY',
      'Modelo de ensaio',
      'Pista de testes',
      4,
      1,
      1250,
    );
    return id;
  }

  // Abre a conexão de teste antes de gerar as fixtures.
  beforeAll(async () => {
    await prisma.$connect();
  });

  // Remove as fixtures na ordem que preserva as FKs ainda existentes.
  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM tests WHERE id = ANY($1::uuid[])', testIds);
    await prisma.$executeRawUnsafe(
      'DELETE FROM user_vehicles WHERE user_id = ANY($1::uuid[])',
      userIds,
    );
    await prisma.$executeRawUnsafe(
      'DELETE FROM vehicles WHERE id = ANY($1::uuid[])',
      vehicleIds,
    );
    await prisma.$executeRawUnsafe('DELETE FROM users WHERE id = ANY($1::uuid[])', userIds);
    await prisma.$disconnect();
  });

  // Mantém condições e snapshot sem placa mesmo após a exclusão física do veículo.
  it('preserva o teste após o último vínculo e a remoção do veículo', async () => {
    const scenario = await createScenario();
    const testId = await createTest(scenario);
    await prisma.$executeRawUnsafe(
      'DELETE FROM user_vehicles WHERE user_id = $1::uuid AND vehicle_id = $2::uuid',
      scenario.userId,
      scenario.vehicleId,
    );
    await prisma.$executeRawUnsafe(
      'DELETE FROM vehicles WHERE id = $1::uuid',
      scenario.vehicleId,
    );
    await prisma.$executeRawUnsafe('DELETE FROM users WHERE id = $1::uuid', scenario.userId);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        vehicle_id: string | null;
        installation_id: string | null;
        configuration_id: string | null;
        created_by_id: string | null;
        snapshot_vehicle_model: string;
        snapshot_test_location: string;
        snapshot_active_piezo_count: number;
        snapshot_configuration_version: number;
        vehicle_weight_kg: number;
      }>
    >('SELECT vehicle_id, installation_id, configuration_id, created_by_id, snapshot_vehicle_model, snapshot_test_location, snapshot_active_piezo_count, snapshot_configuration_version, vehicle_weight_kg FROM tests WHERE id = $1::uuid', testId);

    expect(rows[0]).toMatchObject({
      vehicle_id: null,
      installation_id: null,
      configuration_id: null,
      created_by_id: null,
      snapshot_vehicle_model: 'Modelo de ensaio',
      snapshot_test_location: 'Pista de testes',
      snapshot_active_piezo_count: 4,
      snapshot_configuration_version: 1,
      vehicle_weight_kg: 1250,
    });
  });

  // Rejeita uma configuração ligada a outra instalação, preservando a origem do teste.
  it('recusa configuração incompatível com a instalação', async () => {
    const first = await createScenario();
    const second = await createScenario();
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO tests (id, vehicle_id, installation_id, configuration_id, created_by_id, name, status, terrain, snapshot_vehicle_model, snapshot_test_location, snapshot_active_piezo_count, snapshot_configuration_version, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7::test_status, $8::terrain_type, $9, $10, $11, $12, now())',
        randomUUID(),
        first.vehicleId,
        first.installationId,
        second.configurationId,
        first.userId,
        'Ensaio incompatível',
        'PLANNED',
        'CITY',
        'Modelo de ensaio',
        'Pista de testes',
        4,
        1,
      ),
    ).rejects.toThrow();
  });

  // Protege os valores históricos e rejeita peso fisicamente inválido.
  it('mantém o snapshot imutável e o peso positivo', async () => {
    const scenario = await createScenario();
    const testId = await createTest(scenario);

    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE tests SET snapshot_vehicle_model = $1 WHERE id = $2::uuid',
        'Outro modelo',
        testId,
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE tests SET vehicle_weight_kg = $1 WHERE id = $2::uuid',
        -10,
        testId,
      ),
    ).rejects.toThrow();
  });
});
