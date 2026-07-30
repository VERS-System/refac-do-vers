// Configuração e validação de variáveis de ambiente
//
// Usa Joi para garantir que todas as variáveis necessárias estejam
// presentes e com tipos corretos antes da aplicação iniciar.

import * as Joi from 'joi';

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
  REDIS_PORT: Joi.number().default(6379),

  // Aplicação
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // JWT
  JWT_SECRET: Joi.string().min(16).required().messages({
    'string.min': 'JWT_SECRET deve ter no mínimo 16 caracteres',
    'any.required': 'JWT_SECRET é obrigatória',
  }),
  JWT_EXPIRATION: Joi.string().default('7d'),
});
