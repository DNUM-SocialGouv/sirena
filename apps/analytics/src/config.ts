import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  ANALYTICS_DATABASE_URL: z.string(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  INCREMENTAL_INTERVAL_MS: z.coerce.number().default(5 * 60 * 1000),
  RECONCILIATION_CRON: z.string().default('0 3 * * *'),
  DRIFT_THRESHOLD_PERCENT: z.coerce.number().default(5),
  MONITORING_PORT: z.coerce.number().default(9090),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
