// Configuração e validação de variáveis de ambiente
//
// Usa Joi para garantir que todas as variáveis necessárias estejam
// presentes e com tipos corretos antes da aplicação iniciar.

import * as Joi from 'joi';

const defaultCorsOrigins = [
  'http://localhost:3001',
  'http://localhost:3050',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8081',
  'http://localhost:8080',
].join(',');

export const envValidationSchema = Joi.object({
  // Banco de dados (Neon)
  DATABASE_URL: Joi.string()
    .pattern(/^postgresql:\/\//)
    .required()
    .messages({
      'string.pattern.base': 'DATABASE_URL deve ser uma string PostgreSQL',
      'any.required': 'DATABASE_URL é obrigatória',
    }),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),

  // Aplicação
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_PREFIX: Joi.string()
    .trim()
    .pattern(
      /^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*(?:\/[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*)*$/,
    )
    .default('api/v1'),

  // Clientes autorizados a acessar a API no navegador
  CORS_ORIGINS: Joi.string().trim().min(1).default(defaultCorsOrigins),

  // JWT
  JWT_SECRET: Joi.string().min(16).required().messages({
    'string.min': 'JWT_SECRET deve ter no mínimo 16 caracteres',
    'any.required': 'JWT_SECRET é obrigatória',
  }),
  JWT_EXPIRATION: Joi.string()
    .trim()
    .pattern(/^\d+[smhd]$/)
    .default('7d'),

  // Proteção básica contra excesso de requisições
  RATE_LIMIT_TTL_SECONDS: Joi.number().integer().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().positive().default(100),
});
