import { EventEmitter } from 'node:events';
import { throwHTTPException400BadRequest } from '@sirena/backend-utils/helpers';
import {
  type FileStatusEvent,
  type RequeteUpdatedEvent,
  type RequeteUpdateField,
  SSE_EVENT_TYPES,
  type SSEEventType,
  type UserListEvent,
  type UserStatusEvent,
} from '@sirena/common/constants';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Redis } from 'ioredis';
import { connection } from '../config/redis.js';
import type { AppBindings } from '../helpers/factories/appWithRole.js';
import { createDefaultLogger } from '../helpers/pino.js';

export type SSEContext = Context<AppBindings>;

export type { FileStatusEvent, RequeteUpdateField, RequeteUpdatedEvent, SSEEventType, UserListEvent, UserStatusEvent };

const SSE_REDIS_CHANNEL = 'sse:events';

interface RedisSSEMessage {
  type: SSEEventType;
  payload: unknown;
}

class SSEEventManager extends EventEmitter {
  private static instance: SSEEventManager;
  private subscriber: Redis | null = null;
  private isSubscribed = false;
  private logger = createDefaultLogger().child({ context: 'sse-event-manager' });

  private constructor() {
    super();
    this.setMaxListeners(1000);
  }

  static getInstance(): SSEEventManager {
    if (!SSEEventManager.instance) {
      SSEEventManager.instance = new SSEEventManager();
    }
    return SSEEventManager.instance;
  }

  async initSubscriber(): Promise<void> {
    if (this.isSubscribed) return;

    try {
      // Create a duplicate connection for subscribing (Redis requires separate connections for pub/sub)
      this.subscriber = connection.duplicate();

      this.subscriber.on('error', (err) => {
        this.logger.error({ err }, 'SSE Redis subscriber error');
      });

      // Set up message handler BEFORE subscribing to not miss any messages
      this.subscriber.on('message', (_channel, message) => {
        try {
          const parsed = JSON.parse(message) as RedisSSEMessage;
          this.logger.debug({ type: parsed.type }, 'SSE event received from Redis');
          this.emit(parsed.type, parsed.payload);
        } catch (err) {
          this.logger.error({ err, message }, 'Failed to parse SSE Redis message');
        }
      });

      await this.subscriber.subscribe(SSE_REDIS_CHANNEL);
      this.isSubscribed = true;

      this.logger.info('SSE Redis subscriber initialized');
    } catch (err) {
      this.logger.error({ err }, 'Failed to initialize SSE Redis subscriber');
    }
  }

  private publish(type: SSEEventType, payload: unknown): void {
    const message: RedisSSEMessage = { type, payload };
    connection.publish(SSE_REDIS_CHANNEL, JSON.stringify(message)).catch((err) => {
      this.logger.error({ err, type }, 'Failed to publish SSE event to Redis');
      // Fallback to local emit for single-instance deployments
      this.emit(type, payload);
    });
    this.logger.debug({ type, payload }, 'SSE event published to Redis');
  }

  emitFileStatus(event: FileStatusEvent): void {
    this.publish(SSE_EVENT_TYPES.FILE_STATUS, event);
  }

  emitUserStatus(event: UserStatusEvent): void {
    this.publish(SSE_EVENT_TYPES.USER_STATUS, event);
  }

  emitUserList(event: UserListEvent): void {
    this.publish(SSE_EVENT_TYPES.USER_LIST, event);
  }

  emitRequeteUpdated(event: RequeteUpdatedEvent): void {
    this.publish(SSE_EVENT_TYPES.REQUETE_UPDATED, event);
  }

  async cleanup(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(SSE_REDIS_CHANNEL);
      await this.subscriber.quit();
      this.subscriber = null;
      this.isSubscribed = false;
    }
  }
}

export const sseEventManager = SSEEventManager.getInstance();

interface SSEStreamOptions<T> {
  eventType: SSEEventType;
  filter?: (event: T) => boolean;
  keepAliveInterval?: number;
  timeout?: number;
}

export const createSSEStream = <T>(c: SSEContext, options: SSEStreamOptions<T>) => {
  const { eventType, filter, keepAliveInterval = 30000, timeout = 300000 } = options;
  const logger = c.get('logger');

  return streamSSE(c, async (stream) => {
    let eventId = 0;
    let running = true;
    let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      running = false;
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      sseEventManager.removeListener(eventType, eventHandler);
    };

    const eventHandler = async (event: T) => {
      if (!running) return;
      if (filter && !filter(event)) return;

      try {
        await stream.writeSSE({
          data: JSON.stringify(event),
          event: eventType,
          id: String(eventId++),
        });
      } catch (error) {
        logger.error({ error }, 'Failed to write SSE event');
        cleanup();
        stream.close();
      }
    };

    stream.onAbort(() => {
      logger.info('SSE client disconnected');
      cleanup();
    });

    sseEventManager.on(eventType, eventHandler);

    keepAliveTimer = setInterval(async () => {
      if (!running) return;
      try {
        await stream.writeSSE({
          data: '',
          event: 'keep-alive',
          id: String(eventId++),
        });
      } catch {
        cleanup();
        stream.close();
      }
    }, keepAliveInterval);

    timeoutTimer = setTimeout(() => {
      logger.info('SSE stream timeout reached');
      cleanup();
      stream.close();
    }, timeout);

    while (running) {
      await stream.sleep(1000);
    }
  });
};

export const requireTopEntiteId = (c: SSEContext): string => {
  const topEntiteId = c.get('topEntiteId');
  if (!topEntiteId) {
    throwHTTPException400BadRequest('topEntiteId required for SSE subscription', { res: c.res });
  }
  return topEntiteId;
};

export const requireUserId = (c: SSEContext): string => {
  const userId = c.get('userId');
  if (!userId) {
    throwHTTPException400BadRequest('userId required for SSE subscription', { res: c.res });
  }
  return userId;
};

interface SSERouteConfig<T> {
  eventType: SSEEventType;
  getFilter: (c: SSEContext) => ((event: T) => boolean) | undefined;
  validateAccess?: (c: SSEContext) => Promise<void>;
  logContext: Record<string, unknown>;
}

export const createSSEHandler = <T>(config: SSERouteConfig<T>) => {
  return async (c: SSEContext) => {
    const logger = c.get('logger');

    if (config.validateAccess) {
      await config.validateAccess(c);
    }

    logger.info(config.logContext, 'SSE: Client subscribed');

    return createSSEStream<T>(c, {
      eventType: config.eventType,
      filter: config.getFilter(c),
    });
  };
};
