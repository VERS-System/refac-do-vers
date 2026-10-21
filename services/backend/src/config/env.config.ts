// Configuração e validação de variáveis de ambiente
//
// Usa Joi para garantir que todas as variáveis necessárias estejam
// presentes e com tipos corretos antes da aplicação iniciar.

import * as Joi from 'joi';

/** Aceita apenas endpoint TLS sem credenciais, caminho ou parâmetros que possam alterar o cliente. */
export function parseMqttUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('MQTT_INVALID_CONFIGURATION'); }
  if (url.protocol !== 'mqtts:' || !url.hostname || url.username || url.password ||
    (url.pathname !== '' && url.pathname !== '/') || url.search || url.hash ||
    (url.port && Number(url.port) < 1)) throw new Error('MQTT_INVALID_CONFIGURATION');
  return url;
}

/** Aceita apenas URL http(s) do ai-service, sem credenciais, query ou fragmento. */
export function parseViberUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('VIBER_AI_URL_INVALIDA'); }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname ||
    url.username || url.password || url.search || url.hash) throw new Error('VIBER_AI_URL_INVALIDA');
  return url;
}

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

  // Consumidor MQTT desativado até existir processador de ingestão e ambiente autorizado.
  MQTT_ENABLED: Joi.boolean().default(false),
  MQTT_URL: Joi.string().custom((value: string, helpers) => {
    try { parseMqttUrl(value); } catch { return helpers.error('any.invalid'); }
    return value;
  }).when('MQTT_ENABLED', { is: true, then: Joi.required() }),
  MQTT_USERNAME: Joi.string().min(1).when('MQTT_ENABLED', { is: true, then: Joi.required() }),
  MQTT_PASSWORD: Joi.string().min(1).when('MQTT_ENABLED', { is: true, then: Joi.required() }),
  MQTT_CLIENT_ID: Joi.string().pattern(/^[A-Za-z0-9_-]{1,64}$/)
    .when('MQTT_ENABLED', { is: true, then: Joi.required() }),

  // Viber (assistente): desabilitada por padrão; URL do ai-service e token
  // interno só são exigidos quando habilitada, sem segredos em versionamento.
  VIBER_ENABLED: Joi.boolean().default(false),
  VIBER_AI_URL: Joi.string().custom((value: string, helpers) => {
    try { parseViberUrl(value); } catch { return helpers.error('any.invalid'); }
    return value;
  }).when('VIBER_ENABLED', { is: true, then: Joi.required() }),
  VIBER_INTERNAL_TOKEN: Joi.string().min(16)
    .messages({ 'string.min': 'VIBER_INTERNAL_TOKEN deve ter no mínimo 16 caracteres' })
    .when('VIBER_ENABLED', { is: true, then: Joi.required() }),

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
  JWT_ACCESS_SECRET: Joi.string().min(16).required().messages({
    'string.min': 'JWT_ACCESS_SECRET deve ter no mínimo 16 caracteres',
    'any.required': 'JWT_ACCESS_SECRET é obrigatória',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRATION: Joi.string()
    .trim()
    .pattern(/^[1-9]\d*[smhd]$/)
    .default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string()
    .trim()
    .pattern(/^[1-9]\d*[smhd]$/)
    .default('7d'),

  // Proteção básica contra excesso de requisições
  RATE_LIMIT_TTL_SECONDS: Joi.number().integer().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().positive().default(100),
}).custom((value: Record<string, unknown>, helpers) => {
  if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
    return helpers.error('any.invalid');
  }
  return value;
});
