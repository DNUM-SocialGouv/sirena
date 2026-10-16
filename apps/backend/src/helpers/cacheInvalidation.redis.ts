import type { Redis } from 'ioredis';
import { connection, sanitizeRedisError } from '../config/redis.js';
import { type CacheInvalidationScope, cacheInvalidationBus, isCacheInvalidationScope } from './cacheInvalidation.js';
import { createDefaultLogger } from './pino.js';

export const CACHE_INVALIDATION_CHANNEL = 'cache:invalidation';

const SHUTDOWN_TIMEOUT_MS = 2_000;

interface CacheInvalidationMessage {
  scope: CacheInvalidationScope;
}

const logger = createDefaultLogger().child({ context: 'cache-invalidation' });

let subscriber: Redis | null = null;

const publish = (scope: CacheInvalidationScope): void => {
  const message: CacheInvalidationMessage = { scope };
  connection
    .publish(CACHE_INVALIDATION_CHANNEL, JSON.stringify(message))
    .then(() => logger.debug({ scope }, 'Cache invalidation published'))
    .catch((err) => {
      // The local cache is already cleared; the other instances keep theirs until their TTL expires.
      logger.error({ err: sanitizeRedisError(err), scope }, 'Failed to publish cache invalidation');
    });
};

const handleMessage = (_channel: string, message: string): void => {
  try {
    const { scope } = JSON.parse(message) as Partial<CacheInvalidationMessage>;
    if (!isCacheInvalidationScope(scope)) {
      logger.warn({ scope }, 'Cache invalidation of unknown scope ignored');
      return;
    }
    logger.debug({ scope }, 'Cache invalidation received');
    cacheInvalidationBus.receive(scope);
  } catch (err) {
    logger.error({ err }, 'Failed to parse cache invalidation message');
  }
};

export const startCacheInvalidationSubscriber = async (): Promise<void> => {
  if (subscriber) return;

  // Redis requires a dedicated connection for subscriptions.
  const client = connection.duplicate();
  client.on('error', (err) => logger.error({ err: sanitizeRedisError(err) }, 'Cache invalidation subscriber error'));
  client.on('message', handleMessage);

  subscriber = client;
  cacheInvalidationBus.setPublisher(publish);

  try {
    await client.subscribe(CACHE_INVALIDATION_CHANNEL);
    logger.info('Cache invalidation subscriber initialized');
  } catch (err) {
    logger.error({ err: sanitizeRedisError(err) }, 'Failed to initialize cache invalidation subscriber');
  }
};

const closeGracefully = async (client: Redis): Promise<void> => {
  await client.unsubscribe(CACHE_INVALIDATION_CHANNEL);
  await client.quit();
};

export const stopCacheInvalidationSubscriber = async (): Promise<void> => {
  cacheInvalidationBus.setPublisher(null);
  if (!subscriber) return;

  const client = subscriber;
  subscriber = null;

  let timer: NodeJS.Timeout | undefined;
  try {
    // The subscriber inherits `maxRetriesPerRequest: null`, so a command issued on a
    // down connection never settles. Bound the graceful close: the rest of the
    // shutdown must not hang on an unreachable Redis.
    await Promise.race([
      closeGracefully(client),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Cache invalidation subscriber did not close within ${SHUTDOWN_TIMEOUT_MS}ms`)),
          SHUTDOWN_TIMEOUT_MS,
        );
        timer.unref();
      }),
    ]);
  } catch (err) {
    logger.error({ err: sanitizeRedisError(err) }, 'Failed to close cache invalidation subscriber');
  } finally {
    clearTimeout(timer);
    // Drops the socket without waiting for a reply; a no-op once the connection is closed.
    client.disconnect();
  }
};
