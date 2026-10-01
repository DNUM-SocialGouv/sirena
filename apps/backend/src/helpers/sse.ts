import { EventEmitter } from 'node:events';
import {
  type FileStatusEvent,
  type RequeteMessageEvent,
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
import { connection, sanitizeRedisError } from '../config/redis.js';
import type { AppBindings } from '../helpers/factories/appWithRole.js';
import { createDefaultLogger } from '../helpers/pino.js';
import {
  requireTopEntiteId as requireTopEntiteIdFromContext,
  requireUserId as requireUserIdFromContext,
} from './context.js';

export type SSEContext = Context<AppBindings>;

export type {
  FileStatusEvent,
  RequeteMessageEvent,
  RequeteUpdatedEvent,
  RequeteUpdateField,
  SSEEventType,
  UserListEvent,
  UserStatusEvent,
};

const SSE_REDIS_CHANNEL = 'sse:events';

const USER_STATUS_GUARD_EVENT = 'internal:user-status-guard';

const KNOWN_EVENT_TYPES = new Set<string>(Object.values(SSE_EVENT_TYPES));
const isKnownEventType = (type: unknown): type is SSEEventType =>
  typeof type === 'string' && KNOWN_EVENT_TYPES.has(type);

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
    this.setMaxListeners(0);
  }

  /** Open connections per event type, for the metrics endpoint. */
  getConnectionCounts(): Record<SSEEventType, number> {
    const counts = {} as Record<SSEEventType, number>;
    for (const type of Object.values(SSE_EVENT_TYPES)) {
      counts[type] = this.listenerCount(type);
    }
    return counts;
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
        this.logger.error({ err: sanitizeRedisError(err) }, 'SSE Redis subscriber error');
      });

      // Set up message handler BEFORE subscribing to not miss any messages
      this.subscriber.on('message', (_channel, message) => {
        try {
          const parsed = JSON.parse(message) as Partial<RedisSSEMessage>;
          if (!isKnownEventType(parsed.type)) {
            this.logger.warn({ type: parsed.type }, 'SSE event of unknown type ignored');
            return;
          }
          this.logger.debug({ type: parsed.type }, 'SSE event received from Redis');
          this.dispatch(parsed.type, parsed.payload);
        } catch (err) {
          this.logger.error({ err }, 'Failed to parse SSE Redis message');
        }
      });

      await this.subscriber.subscribe(SSE_REDIS_CHANNEL);
      this.isSubscribed = true;

      this.logger.info('SSE Redis subscriber initialized');
    } catch (err) {
      this.logger.error({ err: sanitizeRedisError(err) }, 'Failed to initialize SSE Redis subscriber');
    }
  }

  private publish(type: SSEEventType, payload: unknown): void {
    const message: RedisSSEMessage = { type, payload };
    connection
      .publish(SSE_REDIS_CHANNEL, JSON.stringify(message))
      .then(() => this.logger.debug({ type }, 'SSE event published to Redis'))
      .catch((err) => {
        this.logger.error({ err: sanitizeRedisError(err), type }, 'Failed to publish SSE event to Redis');
        this.dispatch(type, payload);
      });
  }

  private dispatch(type: SSEEventType, payload: unknown): void {
    this.emit(type, payload);
    if (type === SSE_EVENT_TYPES.USER_STATUS) this.emit(USER_STATUS_GUARD_EVENT, payload);
  }

  onUserStatusGuard(handler: (event: Partial<UserStatusEvent> | null) => void): void {
    this.on(USER_STATUS_GUARD_EVENT, handler);
  }

  offUserStatusGuard(handler: (event: Partial<UserStatusEvent> | null) => void): void {
    this.removeListener(USER_STATUS_GUARD_EVENT, handler);
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

  emitRequeteMessage(event: RequeteMessageEvent): void {
    this.publish(SSE_EVENT_TYPES.REQUETE_MESSAGE, event);
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
  closeOnUserStatusChange?: boolean;
}

const DEFAULT_STREAM_TIMEOUT_MS = 30 * 60 * 1000;

export const createSSEStream = <T>(c: SSEContext, options: SSEStreamOptions<T>) => {
  const {
    eventType,
    filter,
    keepAliveInterval = 30000,
    timeout = DEFAULT_STREAM_TIMEOUT_MS,
    closeOnUserStatusChange = true,
  } = options;
  const logger = c.get('logger');
  const userId = c.get('userId');

  return streamSSE(c, async (stream) => {
    let eventId = 0;
    let running = true;
    let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let release: () => void = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });

    const cleanup = () => {
      running = false;
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      sseEventManager.removeListener(eventType, eventHandler);
      if (closeOnUserStatusChange) sseEventManager.offUserStatusGuard(userStatusGuard);
      release();
    };

    const userStatusGuard = (event: Partial<UserStatusEvent> | null) => {
      if (!running || event?.userId !== userId) return;
      logger.info('SSE stream closed: subscriber status or role changed');
      cleanup();
      stream.close();
    };

    const eventHandler = async (event: T) => {
      if (!running) return;

      try {
        if (filter && !filter(event)) return;
      } catch (error) {
        logger.warn({ error, eventType }, 'SSE event ignored: filter could not read the payload');
        return;
      }

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
    if (closeOnUserStatusChange) sseEventManager.onUserStatusGuard(userStatusGuard);

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

    await released;
  });
};

export const requireTopEntiteId = (c: SSEContext): string =>
  requireTopEntiteIdFromContext(c, 'topEntiteId required for SSE subscription');

export const requireUserId = (c: SSEContext): string =>
  requireUserIdFromContext(c, 'userId required for SSE subscription');

interface SSERouteConfig<T> {
  eventType: SSEEventType;
  getFilter: (c: SSEContext) => ((event: T) => boolean) | undefined;
  validateAccess?: (c: SSEContext) => Promise<void>;
  logContext: Record<string, unknown>;
  closeOnUserStatusChange?: boolean;
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
      closeOnUserStatusChange: config.closeOnUserStatusChange,
    });
  };
};
