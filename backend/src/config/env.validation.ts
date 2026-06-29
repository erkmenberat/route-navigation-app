import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  PORT: Joi.number().default(4001),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  CORS_ORIGINS: Joi.string().optional().allow(''),
});
