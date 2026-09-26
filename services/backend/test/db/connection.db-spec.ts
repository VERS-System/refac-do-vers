// Confirma que os testes de integração alcançam somente o PostgreSQL descartável.

import { PrismaClient } from '@prisma/client';

describe('Banco descartável dos testes', () => {
  const prisma = new PrismaClient();

  // Abre a conexão que valida o banco isolado antes dos testes de domínio.
  beforeAll(async () => {
    await prisma.$connect();
  });

  // Fecha a conexão para que o processo de teste não mantenha recursos abertos.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Impede que a suíte passe se estiver apontando para outro banco PostgreSQL.
  it('usa o banco sintético vers_test', async () => {
    const result = await prisma.$queryRaw<Array<{ database_name: string }>>`
      SELECT current_database() AS database_name
    `;

    expect(result[0]?.database_name).toBe('vers_test');
  });
});
