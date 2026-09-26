// Confirma versões de montagem e identidade de dispositivos no PostgreSQL isolado.

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

describe('Instalações, dispositivos e configurações', () => {
  const prisma = new PrismaClient();
  const userId = randomUUID();
  const vehicleId = randomUUID();

  // Cria uma conta e um veículo sintéticos para manter os testes independentes.
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
      userId,
      `install-${userId}@example.test`,
      'hash-ficticio',
      'ACTIVE',
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO vehicles (id, license_plate, updated_at) VALUES ($1::uuid, $2, now())',
      vehicleId,
      `XYZ${vehicleId.slice(0, 4).toUpperCase()}`,
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO user_vehicles (user_id, vehicle_id, relationship, is_primary, updated_at) VALUES ($1::uuid, $2::uuid, $3::vehicle_relationship, true, now())',
      userId,
      vehicleId,
      'OWNER',
    );
  });

  // Remove as fixtures e seus dependentes após os testes.
  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'DELETE FROM user_vehicles WHERE user_id = $1::uuid',
      userId,
    );
    await prisma.$executeRawUnsafe('DELETE FROM vehicles WHERE id = $1::uuid', vehicleId);
    await prisma.$executeRawUnsafe('DELETE FROM users WHERE id = $1::uuid', userId);
    await prisma.$disconnect();
  });

  // Cria uma instalação para testar versões e dispositivos sem usar a API futura.
  async function createInstallation(): Promise<string> {
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      'INSERT INTO vers_installations (id, vehicle_id, system_model, status, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4::installation_status, now())',
      id,
      vehicleId,
      'VERS-MOCK',
      'ACTIVE',
    );
    return id;
  }

  // Restringe a numeração da montagem e impede alterar um snapshot já salvo.
  it('mantém versões únicas e imutáveis por instalação', async () => {
    const installationId = await createInstallation();
    const firstId = randomUUID();
    await prisma.$executeRawUnsafe(
      'INSERT INTO configurations (id, installation_id, name, version, active_piezo_count, piezo_association, installation_point, storage_type) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::piezo_association, $7, $8::storage_type)',
      firstId,
      installationId,
      'Montagem inicial',
      1,
      4,
      'PARALLEL',
      'Eixo traseiro',
      'CAPACITOR',
    );

    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO configurations (id, installation_id, name, version, active_piezo_count, piezo_association, installation_point, storage_type) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::piezo_association, $7, $8::storage_type)',
        randomUUID(),
        installationId,
        'Outra montagem',
        1,
        6,
        'SERIES',
        'Eixo dianteiro',
        'BATTERY',
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE configurations SET active_piezo_count = 8 WHERE id = $1::uuid',
        firstId,
      ),
    ).rejects.toThrow();
  });

  // Impede que a mesma identidade física do ESP32 seja registrada duas vezes.
  it('exige deviceUid único', async () => {
    const installationId = await createInstallation();
    const deviceUid = `esp-${randomUUID()}`;
    await prisma.$executeRawUnsafe(
      'INSERT INTO devices (id, installation_id, vehicle_id, device_uid, status, revoked_at, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::device_status, now(), now())',
      randomUUID(),
      installationId,
      vehicleId,
      deviceUid,
      'REVOKED',
    );
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO devices (id, installation_id, vehicle_id, device_uid, status, revoked_at, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::device_status, now(), now())',
        randomUUID(),
        installationId,
        vehicleId,
        deviceUid,
        'REVOKED',
      ),
    ).rejects.toThrow();
  });

  // Mantém a vaga ocupada mesmo offline e libera a substituição após revogação.
  it('permite um ESP32 não revogado por veículo', async () => {
    const firstInstallation = await createInstallation();
    const secondInstallation = await createInstallation();
    const firstDevice = randomUUID();
    await prisma.$executeRawUnsafe(
      'INSERT INTO devices (id, installation_id, vehicle_id, device_uid, status, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::device_status, now())',
      firstDevice,
      firstInstallation,
      vehicleId,
      `esp-${firstDevice}`,
      'OFFLINE',
    );
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO devices (id, installation_id, vehicle_id, device_uid, status, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::device_status, now())',
        randomUUID(),
        secondInstallation,
        vehicleId,
        `esp-${randomUUID()}`,
        'PROVISIONING',
      ),
    ).rejects.toThrow();

    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE devices SET status = $1::device_status WHERE id = $2::uuid',
        'REVOKED',
        firstDevice,
      ),
    ).rejects.toThrow();

    await prisma.$executeRawUnsafe(
      'UPDATE devices SET status = $1::device_status, revoked_at = now() WHERE id = $2::uuid',
      'REVOKED',
      firstDevice,
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO devices (id, installation_id, vehicle_id, device_uid, status, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::device_status, now())',
      randomUUID(),
      secondInstallation,
      vehicleId,
      `esp-${randomUUID()}`,
      'PROVISIONING',
    );
  });
});
