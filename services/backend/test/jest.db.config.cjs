// Executa apenas os testes que precisam do PostgreSQL descartável.
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/test/db/**/*.db-spec.ts'],
  setupFiles: ['<rootDir>/test/db/setup.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
};
