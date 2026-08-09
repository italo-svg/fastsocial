import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().default(3333),
  APP_BASE_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().uri({ scheme: ["postgresql", "postgres"] }).required(),
  DIRECT_DATABASE_URL: Joi.string().uri({ scheme: ["postgresql", "postgres"] }).optional(),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_JWT_SECRET: Joi.string().required(),
}).unknown(true);
