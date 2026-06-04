/**
 * Validación de variables de entorno con Joi.
 * ---------------------------------------------------------------------------
 * Si alguna variable crítica falta o tiene un formato inválido, la aplicación
 * aborta su arranque, evitando errores silenciosos en runtime ("fail fast").
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Configuración y validación de entorno
 * Descripción académica: La validación temprana de la configuración es una
 *   buena práctica derivada de la metodología The Twelve-Factor App, que
 *   recomienda externalizar la configuración respecto del código.
 */

import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  APP_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string().required(),
  MAIL_PASSWORD: Joi.string().required(),
  MAIL_FROM: Joi.string().required(),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
});
