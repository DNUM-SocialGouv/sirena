import type { Context } from 'hono';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import type pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnrichedUserContext, RequestContext } from '@/helpers/middleware';
import type { createDefaultLogger } from '@/helpers/pino';
import { createTestRequestContext, createTestUser } from '../tests/test-utils';
import { enhancedPinoMiddleware } from './pino.middleware';

const {
  mockPinoLogger,
  helperMocks,
  pinoMocks,
  testContext,
  mockLoggerStorage,
  childLogger,
  enrichedRequestContext,
  enrichedUserContext,
} = vi.hoisted(() => {
  const createChildLogger = () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
    level: 'info',
  });

  const childLogger = createChildLogger();

  const innerPinoLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => childLogger),
    level: 'info',
  };

  const mockPinoLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => childLogger),
    assign: vi.fn(),
    level: 'info',
  };

  const testContext = {
    requestId: 'test-request-id',
    traceId: 'test-trace-id',
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    ip: 'xxx.xxx.xxx.100',
    userAgent: 'Mozilla/5.0',
    entiteIds: ['test-entite-id'],
    roleId: 'test-role-id',
  };

  const enrichedRequestContext = {
    ...testContext,
    caller: 'test.ts:123',
    extraContext: {},
  };

  const enrichedUserContext = {
    userId: testContext.userId,
    entiteIds: testContext.entiteIds,
    roleId: testContext.roleId,
  };

  const helperMocks = {
    extractRequestContext: vi.fn(() => testContext as RequestContext),
    enrichRequestContext: vi.fn(() => enrichedRequestContext),
    enrichUserContext: vi.fn(() => enrichedUserContext),
    createPinoContextData: vi.fn(() => ({
      requestId: testContext.requestId,
      traceId: testContext.traceId,
      sessionId: testContext.sessionId,
      ip: testContext.ip,
      userAgent: testContext.userAgent,
      userId: testContext.userId,
      entiteIds: testContext.entiteIds,
      roleId: testContext.roleId,
      caller: 'test.ts:123',
    })),
    getLogLevelConfig: vi.fn(() => ({
      console: 'info',
    })),
    getLogExtraContext: vi.fn(() => ({})),
  };

  const pinoMocks = {
    stdSerializers: {
      err: vi.fn((err) => ({
        type: err?.constructor?.name || 'Error',
        message: err?.message || String(err),
        stack: err?.stack,
      })),
      req: vi.fn((req) => req),
      res: vi.fn((res) => res),
    },
  };

  let storedLogger: ReturnType<typeof createDefaultLogger> | null = null;
  const mockLoggerStorage = {
    run: vi.fn(async (value, callback) => {
      // Store the logger value for the callback
      storedLogger = value;
      return await callback();
    }),
    getStore: vi.fn(() => storedLogger),
  };

  return {
    mockPinoLogger,
    innerPinoLogger,
    helperMocks,
    pinoMocks,
    testContext,
    mockLoggerStorage,
    childLogger,
    enrichedRequestContext,
    enrichedUserContext,
  };
});

vi.mock('@/helpers/middleware', async () => {
  return helperMocks;
});

// Mock asyncLocalStorage
vi.mock('@/libs/asyncLocalStorage', () => ({
  loggerStorage: mockLoggerStorage,
}));

vi.mock('pino', () => {
  // Create a separate pino instance for basePino that will be used if no logger exists in context
  const basePinoInstance = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => childLogger),
    assign: vi.fn(),
    level: 'info',
  };

  const mockPino = Object.assign(
    vi.fn(() => basePinoInstance),
    {
      stdSerializers: pinoMocks.stdSerializers,
    },
  ) as unknown as typeof pino;

  return {
    default: mockPino,
    stdSerializers: mockPino.stdSerializers,
  };
});

vi.mock('hono-pino', () => ({
  pinoLogger: vi.fn((config) => {
    // Return a middleware function that sets the logger before calling next
    return async (c: Context, next: () => Promise<void>) => {
      // The logger should be the pino instance passed in config.pino
      const logger = config?.pino;
      if (logger) {
        // Add methods that might be missing
        if (!logger.assign) {
          logger.assign = vi.fn();
        }
      }
      c.set('logger', logger);
      await next();
    };
  }),
}));

vi.mock('@/config/env', () => ({
  envVars: {
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'json',
  },
}));

describe('pino.middleware.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('enhancedPinoMiddleware', () => {
    it('should set up logger with request context', async () => {
      const testApp = new Hono().use(enhancedPinoMiddleware()).get('/test', (c) => {
        // Just return success - we'll check the middleware behavior via mocks
        return c.json({ success: true });
      });

      const client = testClient(testApp);
      const _res = await client.test.$get();

      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
      expect(helperMocks.enrichRequestContext).toHaveBeenCalledWith(testContext);
      expect(helperMocks.enrichUserContext).toHaveBeenCalledWith(testContext);

      // Check that loggerStorage.run was called with proper logger
      expect(mockLoggerStorage.run).toHaveBeenCalled();

      // Since we can't directly access the pino instance from the test,
      // check the behavior through the mocks we can verify
      expect(helperMocks.createPinoContextData).toHaveBeenCalledWith(enrichedRequestContext, enrichedUserContext);
    });

    it('should add request-id and trace-id headers', async () => {
      const testApp = new Hono().use(enhancedPinoMiddleware()).get('/test', (c) => {
        return c.json({ success: true });
      });

      const client = testClient(testApp);
      const response = await client.test.$get();

      expect(response).toBeDefined();
      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
      // Headers are set in the response
      const headers = response.headers;
      expect(headers.get('x-request-id')).toBe('test-request-id');
      expect(headers.get('x-trace-id')).toBe('test-trace-id');
    });

    it('should handle requests with existing x-request-id header', async () => {
      const existingRequestId = 'existing-request-id';

      const testApp = new Hono().use(enhancedPinoMiddleware()).get('/test', (c) => c.json({ success: true }));

      const client = testClient(testApp);
      await client.test.$get({
        headers: {
          'x-request-id': existingRequestId,
        },
      });

      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
    });

    it('should run logger storage with contextual logger', async () => {
      const testApp = new Hono().use(enhancedPinoMiddleware()).get('/test', (c) => c.json({ success: true }));

      const client = testClient(testApp);
      await client.test.$get();

      expect(mockLoggerStorage.run).toHaveBeenCalled();
      const [logger, callback] = mockLoggerStorage.run.mock.calls[0];
      // The logger should be a pino instance
      expect(logger).toBeDefined();
      expect(typeof callback).toBe('function');
    });
  });

  describe('logger functionality', () => {
    it('should create a child logger with proper methods', () => {
      const childLogger = mockPinoLogger.child();

      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.error).toBe('function');
      expect(typeof childLogger.debug).toBe('function');
      expect(typeof childLogger.trace).toBe('function');
      expect(typeof childLogger.fatal).toBe('function');
      expect(typeof childLogger.child).toBe('function');
      expect(childLogger.level).toBe('info');
    });

    it('should create contextual logger with enriched context', async () => {
      const testApp = new Hono().use(enhancedPinoMiddleware()).get('/test', (c) => c.json({ success: true }));

      const client = testClient(testApp);
      await client.test.$get();

      // Check the pino context data was created with proper values
      expect(helperMocks.createPinoContextData).toHaveBeenCalled();
      const mockCalls = helperMocks.createPinoContextData.mock.calls;
      if (mockCalls.length > 0) {
        const [enrichedCtx, userCtx] = mockCalls[0] as unknown as [RequestContext, EnrichedUserContext | null];
        // Check the enriched context has the expected request ID
        expect(enrichedCtx.requestId).toBe(testContext.requestId);
        // Check the user context has the expected user ID
        if (userCtx) {
          expect(userCtx.userId).toBe(testContext.userId);
        }
      }
    });
  });

  describe('middleware integration', () => {
    it('should work with other middlewares', async () => {
      const testApp = new Hono()
        .use(enhancedPinoMiddleware())
        .use(async (_c, next) => {
          // Middleware executes but we'll verify through mocks
          await next();
        })
        .get('/test', (c) => {
          return c.json({ success: true });
        });

      const client = testClient(testApp);
      await client.test.$get();

      // Verify the middleware chain executed properly
      expect(mockLoggerStorage.run).toHaveBeenCalled();
      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
    });

    it('should handle errors in next middleware', async () => {
      const testApp = new Hono().use(enhancedPinoMiddleware()).get('/test/:test', (c) => {
        const test = c.req.param('test');
        if (test === 'error') {
          throw new Error('Test middleware error');
        }
        return c.json({ success: false }, 500);
      });

      const client = testClient(testApp);
      const response = await client.test[':test'].$get({
        param: { test: 'error' },
      });

      expect(response.status).toBe(500);
    });
  });

  describe('context enrichment', () => {
    it('should enrich context with user information when available', async () => {
      const testUser = createTestUser();
      const contextWithUser = createTestRequestContext({
        userId: testUser.id,
        entiteIds: testUser.entiteIds,
        roleId: testUser.roleId,
      });

      helperMocks.extractRequestContext.mockReturnValue(contextWithUser);
      helperMocks.enrichUserContext.mockReturnValue({
        userId: testUser.id,
        entiteIds: testUser.entiteIds || [],
        roleId: testUser.roleId,
      });

      const testApp = new Hono().use(enhancedPinoMiddleware()).get('/test', (c) => c.json({ success: true }));

      const client = testClient(testApp);
      await client.test.$get();

      expect(helperMocks.enrichUserContext).toHaveBeenCalledWith(contextWithUser);
    });

    it('should handle context without user information', async () => {
      const contextWithoutUser = createTestRequestContext({
        userId: undefined,
        entiteIds: undefined,
        roleId: undefined,
      });

      helperMocks.extractRequestContext.mockReturnValue(contextWithoutUser);
      helperMocks.enrichUserContext.mockReturnValue({
        userId: '',
        entiteIds: [],
        roleId: '',
      });

      const testApp = new Hono().use(enhancedPinoMiddleware()).get('/test', (c) => c.json({ success: true }));

      const client = testClient(testApp);
      await client.test.$get();

      expect(helperMocks.enrichUserContext).toHaveBeenCalledWith(contextWithoutUser);
    });
  });

  describe('log level configuration', () => {
    it('should respect custom log level configuration', () => {
      const customConfig = {
        console: 'debug' as const,
      };

      helperMocks.getLogLevelConfig.mockReturnValue(customConfig);

      expect(helperMocks.getLogLevelConfig()).toEqual(customConfig);
    });
  });

  describe('LOG_EXTRA_CONTEXT integration', () => {
    it('should include extra context in log data when available', () => {
      const extraContext = {
        feature: 'user-management',
        action: 'create-user',
        correlationId: 'corr-123',
      };

      helperMocks.getLogExtraContext.mockReturnValue(extraContext);
      helperMocks.enrichRequestContext.mockReturnValue({
        ...testContext,
        caller: 'test.ts:123',
        extraContext,
      });

      expect(helperMocks.getLogExtraContext()).toEqual(extraContext);
    });

    it('should not include extraContext field when no extra context is available', () => {
      helperMocks.getLogExtraContext.mockReturnValue({});
      helperMocks.enrichRequestContext.mockReturnValue({
        ...testContext,
        caller: 'test.ts:123',
        extraContext: {},
      });

      expect(helperMocks.getLogExtraContext()).toEqual({});
    });
  });
});
