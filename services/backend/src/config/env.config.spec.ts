// Testes unitários da validação das variáveis de ambiente do backend VERS.

import { envValidationSchema } from './env.config';

const requiredEnvironment = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/vers',
  JWT_ACCESS_SECRET: 'segredo-access-com-mais-de-16-caracteres',
  JWT_REFRESH_SECRET: 'segredo-refresh-com-mais-de-16-caracteres',
};

describe('envValidationSchema', () => {
  it('aplica os valores padrão da configuração do core', () => {
    const { error, value } = envValidationSchema.validate(requiredEnvironment);

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      API_PREFIX: 'api/v1',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      JWT_ACCESS_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      CORS_ORIGINS:
        'http://localhost:3001,http://localhost:3050,http://localhost:5173,http://localhost:5174,http://localhost:8081,http://localhost:8080',
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_MAX_REQUESTS: 100,
    });
  });

  it('aceita valores válidos fornecidos pelo ambiente', () => {
    const { error, value } = envValidationSchema.validate({
      ...requiredEnvironment,
      NODE_ENV: 'production',
      PORT: 8080,
      API_PREFIX: 'api/v1',
      REDIS_PORT: 6380,
      JWT_ACCESS_EXPIRATION: '20m',
      JWT_REFRESH_EXPIRATION: '8d',
      CORS_ORIGINS: 'https://app.vers.dev',
      RATE_LIMIT_TTL_SECONDS: 30,
      RATE_LIMIT_MAX_REQUESTS: 50,
    });

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      NODE_ENV: 'production',
      PORT: 8080,
      API_PREFIX: 'api/v1',
      REDIS_PORT: 6380,
      JWT_ACCESS_EXPIRATION: '20m',
      JWT_REFRESH_EXPIRATION: '8d',
      CORS_ORIGINS: 'https://app.vers.dev',
      RATE_LIMIT_TTL_SECONDS: 30,
      RATE_LIMIT_MAX_REQUESTS: 50,
    });
  });

  it('rejeita valores fora dos limites do core', () => {
    const { error } = envValidationSchema.validate(
      {
        ...requiredEnvironment,
        PORT: 70000,
        API_PREFIX: '/api/',
        REDIS_PORT: 0,
        JWT_ACCESS_EXPIRATION: 'amanhã',
        JWT_REFRESH_EXPIRATION: '0d',
        CORS_ORIGINS: '',
        RATE_LIMIT_TTL_SECONDS: 0,
        RATE_LIMIT_MAX_REQUESTS: -1,
      },
      { abortEarly: false },
    );

    expect(error?.details.map((detail) => detail.path[0])).toEqual(
      expect.arrayContaining([
        'PORT',
        'API_PREFIX',
        'REDIS_PORT',
        'JWT_ACCESS_EXPIRATION',
        'JWT_REFRESH_EXPIRATION',
        'CORS_ORIGINS',
        'RATE_LIMIT_TTL_SECONDS',
        'RATE_LIMIT_MAX_REQUESTS',
      ]),
    );
  });

  it('exige a URL do PostgreSQL e um segredo JWT forte o suficiente', () => {
    const { error } = envValidationSchema.validate(
      {
        DATABASE_URL: 'mysql://localhost/vers',
        JWT_ACCESS_SECRET: 'curto',
        JWT_REFRESH_SECRET: 'curto',
      },
      { abortEarly: false },
    );

    expect(error?.details.map((detail) => detail.path[0])).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']),
    );
  });

  it('rejeita segredos iguais para access e refresh', () => {
    const { error } = envValidationSchema.validate({
      ...requiredEnvironment,
      JWT_REFRESH_SECRET: requiredEnvironment.JWT_ACCESS_SECRET,
    });
    expect(error).toBeDefined();
  });
});
