import type { Redis } from 'ioredis';
import { connection, sanitizeRedisError } from '../config/redis.js';
import { type CacheInvalidationScope, cacheInvalidationBus, isCacheInvalidationScope } from './cacheInvalidation.js';
import { createDefaultLogger } from './pino.js';

export const CACHE_INVALIDATION_CHANNEL = 'cache:invalidation';

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

export const stopCacheInvalidationSubscriber = async (): Promise<void> => {
  cacheInvalidationBus.setPublisher(null);
  if (!subscriber) return;

  const client = subscriber;
  subscriber = null;
  try {
    await client.unsubscribe(CACHE_INVALIDATION_CHANNEL);
    await client.quit();
  } catch (err) {
    logger.error({ err: sanitizeRedisError(err) }, 'Failed to close cache invalidation subscriber');
  }
};
