import { Redis } from 'ioredis';
import { createDefaultLogger } from '@/helpers/pino';
import { envVars } from './env';

const logger = createDefaultLogger();

export const connection = new Redis({
  host: envVars.REDIS_HOST,
  port: envVars.REDIS_PORT,
  ...(envVars.REDIS_USERNAME && { username: envVars.REDIS_USERNAME }),
  ...(envVars.REDIS_PASSWORD && { password: envVars.REDIS_PASSWORD }),
  keepAlive: 10,
  maxRetriesPerRequest: null,
  retryStrategy: (t) => Math.min(200 * t, 2000),
});

connection.on('error', (e) => logger.error({ err: e }, '[Redis] error'));
connection.on('connect', () => logger.info('[Redis] connect'));
connection.on('ready', () => logger.info('[Redis] ready'));
connection.on('reconnecting', () => logger.warn('[Redis] reconnecting'));
