// Executa somente o ensaio TLS local, com URL de banco fixa e prazo limitado por cenário.
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/test/mqtt/**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/db/setup.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  testTimeout: 45000,
};
