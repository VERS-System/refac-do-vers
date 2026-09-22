// Prepara somente o PostgreSQL sintético local antes dos testes de integração.
const { spawnSync } = require('node:child_process');

const databaseUrl =
  'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public';
const prismaCli = require.resolve('prisma/build/index.js');

// Executa um comando Prisma sem shell e falha caso a preparação não termine.
function runPrisma(args, input) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: databaseUrl },
    input,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Falha ao preparar banco local');
  }
  return result.stdout;
}

// Habilita citext e aplica somente o delta calculado para o banco de testes.
function prepareDatabase() {
  runPrisma(
    ['db', 'execute', '--url', databaseUrl, '--stdin'],
    'CREATE EXTENSION IF NOT EXISTS citext;',
  );
  const sql = runPrisma([
    'migrate',
    'diff',
    '--from-url',
    databaseUrl,
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--script',
  ]);
  if (sql.trim()) {
    runPrisma(['db', 'execute', '--url', databaseUrl, '--stdin'], sql);
  }
}

prepareDatabase();
