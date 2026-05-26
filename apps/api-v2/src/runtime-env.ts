import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3101),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16).default('development-only-secret'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_DRY_RUN: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  WEB_APP_URL: z.string().optional(),
  SLOW_REQUEST_MS: z.coerce.number().int().positive().default(500),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  MONGO_URL: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  ALLOWED_ORIGINS: parsed.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean),
};
