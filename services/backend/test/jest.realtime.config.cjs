// Executa somente o ensaio Socket.IO/Redis/PostgreSQL autorizado separadamente.
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/test/realtime/**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/realtime/setup.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  testTimeout: 30000,
};
