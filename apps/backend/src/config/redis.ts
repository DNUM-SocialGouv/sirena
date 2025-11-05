import { Redis } from 'ioredis';
import { createDefaultLogger } from '@/helpers/pino';
import { envVars } from './env';

const logger = createDefaultLogger();

// TODO: Debug - Log minimal à retirer (sans le mot de passe)
logger.info(
  {
    REDIS_HOST: envVars.REDIS_HOST ?? '(absent)',
    REDIS_PORT: envVars.REDIS_PORT ?? '(absent)',
    REDIS_USERNAME: envVars.REDIS_USERNAME ?? '(absent)',
    REDIS_PASSWORD: envVars.REDIS_PASSWORD ? `(present, ${envVars.REDIS_PASSWORD.length} chars)` : '(absent)',
    REDIS_TLS: envVars.REDIS_TLS ?? '(absent)',
  },
  '[Redis] init config',
);

const useTLS = envVars.REDIS_TLS === 'true';

export const connection = new Redis({
  host: envVars.REDIS_HOST,
  port: envVars.REDIS_PORT,
  ...(envVars.REDIS_USERNAME && { username: envVars.REDIS_USERNAME }),
  ...(envVars.REDIS_PASSWORD && { password: envVars.REDIS_PASSWORD }),
  ...(useTLS
    ? {
        tls: {
          servername: envVars.REDIS_HOST,
        },
      }
    : {}),
  enableReadyCheck: false,
  keepAlive: 10,
  maxRetriesPerRequest: null,
  retryStrategy: (t) => Math.min(200 * t, 2000),
});

connection.on('error', (e) => logger.error({ err: e }, '[Redis] error'));
connection.on('connect', () => logger.info('[Redis] connect'));
connection.on('ready', () => logger.info('[Redis] ready'));
connection.on('reconnecting', () => logger.warn('[Redis] reconnecting'));
