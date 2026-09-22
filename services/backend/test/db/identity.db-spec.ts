// Verifica as garantias de identidade, papéis e sessões no PostgreSQL isolado.

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

describe('Identidade e sessões', () => {
  const prisma = new PrismaClient();
  const userIds: string[] = [];

  // Abre a conexão com o banco sintético preparado para esta suíte.
  beforeAll(async () => {
    await prisma.$connect();
  });

  // Remove os usuários sintéticos e fecha a conexão ao terminar a suíte.
  afterAll(async () => {
    if (userIds.length > 0) {
      await prisma.$executeRawUnsafe(
        'DELETE FROM users WHERE id = ANY($1::uuid[])',
        userIds,
      );
    }
    await prisma.$disconnect();
  });

  // Garante unicidade de email sem distinção de maiúsculas e minúsculas.
  it('recusa o mesmo email com caixa diferente', async () => {
    const firstId = randomUUID();
    const secondId = randomUUID();
    userIds.push(firstId);
    const email = `identity-${firstId}@example.test`;

    await prisma.$executeRawUnsafe(
      'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
      firstId,
      email,
      'hash-ficticio-1',
      'ACTIVE',
    );

    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
        secondId,
        email.toUpperCase(),
        'hash-ficticio-2',
        'ACTIVE',
      ),
    ).rejects.toThrow();
  });

  // Permite USER e ADMIN juntos, mas impede duplicar um papel do mesmo usuário.
  it('associa dois papéis diferentes sem duplicar o mesmo papel', async () => {
    const userId = randomUUID();
    userIds.push(userId);
    await prisma.$executeRawUnsafe(
      'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
      userId,
      `roles-${userId}@example.test`,
      'hash-ficticio',
      'ACTIVE',
    );

    await prisma.$executeRawUnsafe(
      'INSERT INTO user_role_assignments (user_id, role) VALUES ($1::uuid, $2::user_role), ($1::uuid, $3::user_role)',
      userId,
      'USER',
      'ADMIN',
    );

    await expect(
      prisma.$executeRawUnsafe(
        'INSERT INTO user_role_assignments (user_id, role) VALUES ($1::uuid, $2::user_role)',
        userId,
        'USER',
      ),
    ).rejects.toThrow();
  });

  // Preserva somente hashes e permite marcar a revogação e a sessão substituta.
  it('registra rotação e revogação de refresh session', async () => {
    const userId = randomUUID();
    const oldId = randomUUID();
    const newId = randomUUID();
    userIds.push(userId);
    await prisma.$executeRawUnsafe(
      'INSERT INTO users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, $2, $3, $4::user_status, now())',
      userId,
      `session-${userId}@example.test`,
      'hash-ficticio',
      'ACTIVE',
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO refresh_sessions (id, user_id, token_hash, expires_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, now() + interval \'1 day\', now()), ($4::uuid, $2::uuid, $5, now() + interval \'1 day\', now())',
      oldId,
      userId,
      'hash-antigo',
      newId,
      'hash-novo',
    );

    await prisma.$executeRawUnsafe(
      'UPDATE refresh_sessions SET revoked_at = now(), replaced_by_session_id = $1::uuid WHERE id = $2::uuid',
      newId,
      oldId,
    );
    const rows = await prisma.$queryRawUnsafe<
      Array<{ revoked_at: Date | null; replaced_by_session_id: string | null }>
    >('SELECT revoked_at, replaced_by_session_id FROM refresh_sessions WHERE id = $1::uuid', oldId);

    expect(rows[0]?.revoked_at).toBeInstanceOf(Date);
    expect(rows[0]?.replaced_by_session_id).toBe(newId);
  });
});
