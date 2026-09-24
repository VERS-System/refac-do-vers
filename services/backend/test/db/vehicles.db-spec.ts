// Confirma vínculos compartilhados e constraints de veículo no PostgreSQL isolado.

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

describe('Veículos e vínculos', () => {
  const prisma = new PrismaClient();
  const userIds: string[] = [];
  const vehicleIds: string[] = [];

  // Cria um usuário sintético para cada cenário de vínculo.
  async function createUser(): Promise<string> {
    const id = randomUUID();
    userIds.push(id);
    await prisma.$executeRawUnsafe(
      'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
      id,
      `vehicle-${id}@example.test`,
      'hash-ficticio',
      'ACTIVE',
    );
    return id;
  }

  // Cria uma placa sintética diferente para cada veículo do teste.
  async function createVehicle(): Promise<{ id: string; plate: string }> {
    const id = randomUUID();
    const plate = `ABC${id.slice(0, 4).toUpperCase()}`;
    vehicleIds.push(id);
    await prisma.$executeRawUnsafe(
      'INSERT INTO vehicles (id, license_plate, updated_at) VALUES ($1::uuid, $2, now())',
      id,
      plate,
    );
    return { id, plate };
  }

  // Vincula uma conta ao veículo com o papel e a preferência indicados.
  async function linkVehicle(
    userId: string,
    vehicleId: string,
    primary: boolean,
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      'INSERT INTO user_vehicles (user_id, vehicle_id, relationship, is_primary, updated_at) VALUES ($1::uuid, $2::uuid, $3::vehicle_relationship, $4, now())',
      userId,
      vehicleId,
      'OWNER',
      primary,
    );
  }

  // Abre a conexão sintética para os cenários deste arquivo.
  beforeAll(async () => {
    await prisma.$connect();
  });

  // Remove vínculos, veículos e contas fictícias na ordem das FKs.
  afterAll(async () => {
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

  // Mantém o veículo enquanto outra conta estiver vinculada e permite removê-lo depois.
  it('desvincula uma conta sem apagar o veículo compartilhado', async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const vehicle = await createVehicle();
    await linkVehicle(firstUser, vehicle.id, true);
    await linkVehicle(secondUser, vehicle.id, true);

    await prisma.$executeRawUnsafe(
      'DELETE FROM user_vehicles WHERE user_id = $1::uuid AND vehicle_id = $2::uuid',
      firstUser,
      vehicle.id,
    );
    await expect(
      prisma.$executeRawUnsafe('DELETE FROM vehicles WHERE id = $1::uuid', vehicle.id),
    ).rejects.toThrow();

    await prisma.$executeRawUnsafe(
      'DELETE FROM user_vehicles WHERE user_id = $1::uuid AND vehicle_id = $2::uuid',
      secondUser,
      vehicle.id,
    );
    await prisma.$executeRawUnsafe('DELETE FROM vehicles WHERE id = $1::uuid', vehicle.id);
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT count(*) FROM vehicles WHERE id = $1::uuid',
      vehicle.id,
    );
    expect(rows[0]?.count).toBe(0n);
  });

  // Impede que duas operações concorrentes escolham dois principais da mesma conta.
  it('aceita no máximo um veículo principal por usuário', async () => {
    const userId = await createUser();
    const first = await createVehicle();
    const second = await createVehicle();
    await linkVehicle(userId, first.id, false);
    await linkVehicle(userId, second.id, false);

    const updates = await Promise.allSettled([
      prisma.$executeRawUnsafe(
        'UPDATE user_vehicles SET is_primary = true WHERE user_id = $1::uuid AND vehicle_id = $2::uuid',
        userId,
        first.id,
      ),
      prisma.$executeRawUnsafe(
        'UPDATE user_vehicles SET is_primary = true WHERE user_id = $1::uuid AND vehicle_id = $2::uuid',
        userId,
        second.id,
      ),
    ]);

    expect(updates.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  // Recusa placa duplicada mesmo com outra caixa e preserva a placa após criação.
  it('mantém a placa única e imutável', async () => {
    const vehicle = await createVehicle();
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO vehicles (id, license_plate, updated_at) VALUES ($1::uuid, $2, now())',
        randomUUID(),
        vehicle.plate.toLowerCase(),
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO vehicles (id, license_plate, updated_at) VALUES ($1::uuid, $2, now())',
        randomUUID(),
        'def5678',
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(
        'UPDATE vehicles SET license_plate = $1 WHERE id = $2::uuid',
        'XYZ1234',
        vehicle.id,
      ),
    ).rejects.toThrow();
  });

  // Evita que a exclusão direta de uma conta deixe um veículo sem vínculo.
  it('recusa apagar conta que ainda possui vínculo', async () => {
    const userId = await createUser();
    const vehicle = await createVehicle();
    await linkVehicle(userId, vehicle.id, true);

    await expect(
      prisma.$executeRawUnsafe('DELETE FROM users WHERE id = $1::uuid', userId),
    ).rejects.toThrow();
  });
});
