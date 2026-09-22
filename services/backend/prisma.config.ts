// Configuração do Prisma CLI sem carregamento implícito de arquivos .env.

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
});
