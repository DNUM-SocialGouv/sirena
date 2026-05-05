import { Redis } from 'ioredis';
import { createDefaultLogger } from '../helpers/pino.js';
import { envVars } from './env.js';

export const sanitizeRedisError = (err: unknown): unknown => {
  if (err && typeof err === 'object' && 'command' in err) {
    const e = err as { command?: { name?: string; args?: unknown[] } };
    if (e.command?.args && Array.isArray(e.command.args)) {
      e.command = { ...e.command, args: e.command.args.map(() => '****') };
    }
  }
  return err;
};

const logger = createDefaultLogger();

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
  retryStrategy: (t) => Math.min(2 ** t * 100, 30_000) + Math.floor(Math.random() * 1_000),
});

connection.on('error', (e) => logger.error({ err: sanitizeRedisError(e) }, '[Redis] error'));
connection.on('connect', () => logger.info('[Redis] connect'));
connection.on('ready', () => logger.info('[Redis] ready'));
connection.on('reconnecting', () => logger.warn('[Redis] reconnecting'));
