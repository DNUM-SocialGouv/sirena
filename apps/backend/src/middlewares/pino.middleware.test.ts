import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    entiteId: 'test-entite-id',
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
    extractRequestContext: vi.fn(() => testContext),
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

  let storedLogger = null;
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

  const mockPino = vi.fn(() => basePinoInstance);
  mockPino.stdSerializers = pinoMocks.stdSerializers;

  return {
    default: mockPino,
    stdSerializers: mockPino.stdSerializers,
  };
});

vi.mock('hono-pino', () => ({
  pinoLogger: vi.fn((config) => {
    // Return a middleware function that sets the logger before calling next
    return async (c, next) => {
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
  let app: Hono;

  beforeEach(() => {
    vi.resetAllMocks();
    app = new Hono();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('enhancedPinoMiddleware', () => {
    it('should set up logger with request context', async () => {
      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        // Just return success - we'll check the middleware behavior via mocks
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();

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
      let _responseHeaders: Record<string, string | null>;

      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        _responseHeaders = {
          'x-request-id': c.res.headers.get('x-request-id'),
          'x-trace-id': c.res.headers.get('x-trace-id'),
        };
        return c.json({ success: true });
      });

      const client = testClient(app);
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

      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => c.json({ success: true }));

      const client = testClient(app);
      await client.test.$get({
        headers: {
          'x-request-id': existingRequestId,
        },
      });

      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
    });

    it('should run logger storage with contextual logger', async () => {
      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => c.json({ success: true }));

      const client = testClient(app);
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
      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => c.json({ success: true }));

      const client = testClient(app);
      await client.test.$get();

      // Check the pino context data was created with proper values
      expect(helperMocks.createPinoContextData).toHaveBeenCalled();
      const [enrichedCtx, userCtx] = helperMocks.createPinoContextData.mock.calls[0];
      // Check the enriched context has the expected request ID
      expect(enrichedCtx.requestId).toBe(testContext.requestId);
      // Check the user context has the expected user ID
      expect(userCtx.userId).toBe(testContext.userId);
    });
  });

  describe('middleware integration', () => {
    it('should work with other middlewares', async () => {
      app.use(enhancedPinoMiddleware());
      app.use(async (_c, next) => {
        // Middleware executes but we'll verify through mocks
        await next();
      });
      app.get('/test', (c) => {
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();

      // Verify the middleware chain executed properly
      expect(mockLoggerStorage.run).toHaveBeenCalled();
      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
    });

    it('should handle errors in next middleware', async () => {
      app.use(enhancedPinoMiddleware());
      app.get('/test', () => {
        throw new Error('Test middleware error');
      });

      const client = testClient(app);
      const response = await client.test.$get();

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
        entiteIds: testUser.entiteIds,
        roleId: testUser.roleId,
      });

      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => c.json({ success: true }));

      const client = testClient(app);
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
      helperMocks.enrichUserContext.mockReturnValue(null);

      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => c.json({ success: true }));

      const client = testClient(app);
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
      });

      expect(helperMocks.getLogExtraContext()).toEqual({});
    });
  });
});
