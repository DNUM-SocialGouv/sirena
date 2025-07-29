import type { Context } from 'hono';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestRequestContext, createTestUser } from '../tests/test-utils';
import type { EnhancedLogger, MockedContext } from '../tests/types';
import { enhancedPinoMiddleware } from './pino.middleware';

vi.unmock('@sentry/node');
vi.unmock('@/helpers/middleware');
vi.unmock('pino');
vi.unmock('hono-pino');

const { sentryMocks, mockPinoLogger, helperMocks, testContext } = vi.hoisted(() => {
  const mockScope = {
    setContext: vi.fn(),
    setTag: vi.fn(),
    setUser: vi.fn(),
    setFingerprint: vi.fn(),
    setLevel: vi.fn(),
  };

  const mockSpan = {
    setAttributes: vi.fn(),
  };

  const sentryMocks = {
    getCurrentScope: vi.fn(() => mockScope),
    startSpan: vi.fn(async (_config, callback) => {
      return await callback(mockSpan);
    }),
    withScope: vi.fn((callback) => callback(mockScope)),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  };

  const mockPinoLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
      level: 'info',
    }),
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
  };

  const helperMocks = {
    extractRequestContext: vi.fn(() => testContext),
    getLogLevelConfig: vi.fn(() => ({
      console: 'info',
      sentry: 'warn',
    })),
    shouldSendToSentry: vi.fn((level) => level === 'warn' || level === 'error' || level === 'fatal'),
    getCaller: vi.fn(() => 'test.ts:123'),
    setSentryCorrelationTags: vi.fn(),
    getLogExtraContext: vi.fn(() => ({})),
    createSentryRequestContext: vi.fn((c, context) => ({
      id: context.requestId,
      traceId: context.traceId,
      sessionId: context.sessionId,
      method: c.req.method,
      url: c.req.url,
      path: c.req.path,
      headers: Object.fromEntries([...c.req.raw.headers]),
      ip: context.ip,
      userAgent: context.userAgent,
      source: 'backend',
    })),
    createSentryBusinessContext: vi.fn((context) => ({
      source: 'backend',
      userId: context.userId,
      entiteId: context.entiteId,
      roleId: context.roleId,
    })),
    createSentryUserContext: vi.fn((user, ip) => ({
      id: user.id,
      email: user.email,
      username: user.email,
      ip_address: ip,
    })),
    extractClientIp: vi.fn(() => 'xxx.xxx.xxx.100'),
    UNKNOWN_VALUE: 'unknown',
    SOURCE_BACKEND: 'backend',
  };

  return { sentryMocks, mockPinoLogger, helperMocks, testContext };
});

vi.mock('@sentry/node', () => sentryMocks);
vi.mock('@/helpers/middleware', () => helperMocks);

vi.mock('pino', () => {
  const innerMockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: 'info',
  };

  const mockPino = vi.fn(() => innerMockLogger);
  mockPino.stdSerializers = {
    err: vi.fn((err) => ({
      type: err?.constructor?.name || 'Error',
      message: err?.message || String(err),
      stack: err?.stack,
    })),
    req: vi.fn((req) => req),
    res: vi.fn((res) => res),
  };

  return {
    default: mockPino,
    stdSerializers: mockPino.stdSerializers,
  };
});

vi.mock('hono-pino', () => ({
  pinoLogger: vi.fn(() => (c, next) => {
    c.set('logger', mockPinoLogger);
    return next();
  }),
}));

vi.mock('@/config/env', () => ({
  envVars: {
    LOG_LEVEL: 'info',
    LOG_LEVEL_SENTRY: 'warn',
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
    it('should set up enhanced logger with request context', async () => {
      let enhancedLogger: EnhancedLogger;

      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        enhancedLogger = c.get('logger') as EnhancedLogger;
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();

      expect(enhancedLogger).toBeDefined();
      expect(typeof enhancedLogger?.info).toBe('function');
      expect(typeof enhancedLogger?.warn).toBe('function');
      expect(typeof enhancedLogger?.error).toBe('function');
    });

    it('should add request-id and trace-id headers', async () => {
      let _context: Context;

      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        _context = c;
        return c.json({ success: true });
      });

      const client = testClient(app);
      const response = await client.test.$get();

      expect(response).toBeDefined();
      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
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
  });

  describe('enhanced logger methods', () => {
    let _mockContext: MockedContext;
    let enhancedLogger: EnhancedLogger;

    beforeEach(async () => {
      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        _mockContext = c as MockedContext;
        enhancedLogger = c.get('logger') as EnhancedLogger;
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();
    });

    describe('comprehensive logging tests', () => {
      it('should handle info level logging correctly', () => {
        const infoSpy = vi.spyOn(enhancedLogger, 'info');

        enhancedLogger.info('Test info message', { extra: 'data' });

        expect(infoSpy).toHaveBeenCalledWith('Test info message', { extra: 'data' });

        expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
        expect(sentryMocks.captureException).not.toHaveBeenCalled();
      });

      it('should handle warn level logging correctly', () => {
        const warnSpy = vi.spyOn(enhancedLogger, 'warn');

        enhancedLogger.warn('Test warning', { code: 'WARN_001' });

        expect(warnSpy).toHaveBeenCalledWith('Test warning', { code: 'WARN_001' });

        expect(sentryMocks.withScope).toHaveBeenCalled();
        expect(sentryMocks.captureMessage).toHaveBeenCalled();
      });

      it('should handle error level logging correctly', () => {
        const errorSpy = vi.spyOn(enhancedLogger, 'error');
        const testError = new Error('Test error');

        enhancedLogger.error('Database error', { err: testError, retries: 3 });

        expect(errorSpy).toHaveBeenCalledWith('Database error', { err: testError, retries: 3 });

        expect(sentryMocks.withScope).toHaveBeenCalled();
        expect(helperMocks.shouldSendToSentry).toHaveBeenCalledWith('error', expect.any(Object));
        expect(
          sentryMocks.captureException.mock.calls.length + sentryMocks.captureMessage.mock.calls.length,
        ).toBeGreaterThan(0);
      });
    });

    describe('string-only messages', () => {
      it('should handle string-only info messages', () => {
        const infoSpy = vi.spyOn(enhancedLogger, 'info');

        enhancedLogger.info('Simple info message');

        expect(infoSpy).toHaveBeenCalledWith('Simple info message');
        expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
      });

      it('should handle string-only error messages', () => {
        const errorSpy = vi.spyOn(enhancedLogger, 'error');

        enhancedLogger.error('Simple error message');

        expect(errorSpy).toHaveBeenCalledWith('Simple error message');
        expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Simple error message', 'error');
      });
    });

    describe('error logging without error object', () => {
      it('should handle error logging without error object', () => {
        const errorSpy = vi.spyOn(enhancedLogger, 'error');

        enhancedLogger.error('General error message');

        expect(errorSpy).toHaveBeenCalledWith('General error message');
        expect(sentryMocks.captureMessage).toHaveBeenCalledWith('General error message', 'error');
      });
    });
  });

  describe('Sentry integration', () => {
    let enhancedLogger: EnhancedLogger;

    beforeEach(async () => {
      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        enhancedLogger = c.get('logger') as EnhancedLogger;
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();
    });

    it('should set correct Sentry level for warnings', () => {
      enhancedLogger.warn('Test warning');
      expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Test warning', 'warning');
    });

    it('should set correct Sentry level for errors', () => {
      enhancedLogger.error('Test error');
      expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Test error', 'error');
    });

    it('should set correct Sentry level for fatal', () => {
      enhancedLogger.fatal('Fatal error');
      expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Fatal error', 'error');
    });

    it('should set correlation tags', () => {
      enhancedLogger.warn('Test warning with correlation');

      expect(sentryMocks.withScope).toHaveBeenCalled();
      expect(helperMocks.setSentryCorrelationTags).toHaveBeenCalledWith(expect.any(Object), testContext);
    });

    it('should set caller tag', () => {
      enhancedLogger.error('Test error with caller');

      expect(helperMocks.getCaller).toHaveBeenCalled();
      expect(sentryMocks.withScope).toHaveBeenCalled();
    });

    it('should set request context', () => {
      enhancedLogger.warn('Test warning with context');

      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
      expect(sentryMocks.withScope).toHaveBeenCalled();
    });

    it('should set business context when business data available', () => {
      const testUser = createTestUser();
      const contextWithBusiness = createTestRequestContext({
        userId: testUser.id,
        entiteId: testUser.entiteId,
        roleId: testUser.roleId,
      });

      helperMocks.extractRequestContext.mockReturnValue(contextWithBusiness);

      enhancedLogger.error('Business error');

      expect(sentryMocks.withScope).toHaveBeenCalled();
    });

    it('should set logging context', () => {
      const extraContext = { feature: 'auth', action: 'login' };
      helperMocks.getLogExtraContext.mockReturnValue(extraContext);

      enhancedLogger.warn('Context warning');

      expect(helperMocks.getLogExtraContext).toHaveBeenCalled();
    });

    it('should set user context if user ID available', () => {
      const contextWithUser = createTestRequestContext({
        userId: 'test-user-123',
      });
      helperMocks.extractRequestContext.mockReturnValue(contextWithUser);

      enhancedLogger.error('User error');

      expect(sentryMocks.withScope).toHaveBeenCalled();
    });
  });

  describe('log level configuration', () => {
    it('should respect custom log level configuration', () => {
      const customConfig = {
        console: 'debug' as const,
        sentry: 'error' as const,
      };

      helperMocks.getLogLevelConfig.mockReturnValue(customConfig);
      helperMocks.shouldSendToSentry.mockImplementation((level) => level === 'error' || level === 'fatal');

      expect(helperMocks.getLogLevelConfig()).toEqual(customConfig);
      expect(helperMocks.shouldSendToSentry('warn')).toBe(false);
      expect(helperMocks.shouldSendToSentry('error')).toBe(true);
    });
  });

  describe('message extraction', () => {
    let enhancedLogger: EnhancedLogger;

    beforeEach(async () => {
      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        enhancedLogger = c.get('logger') as EnhancedLogger;
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();
    });

    it('should extract message from object', () => {
      const infoSpy = vi.spyOn(enhancedLogger, 'info');
      const logData = { message: 'Custom message', extra: 'data' };

      enhancedLogger.info(logData);

      expect(infoSpy).toHaveBeenCalledWith(logData);
    });

    it('should use default message when object has no message property', () => {
      const warnSpy = vi.spyOn(enhancedLogger, 'warn');
      const logData = { extra: 'data', code: 'ERR001' };

      enhancedLogger.warn(logData);

      expect(warnSpy).toHaveBeenCalledWith(logData);
    });

    it('should handle custom message parameter', () => {
      const errorSpy = vi.spyOn(enhancedLogger, 'error');
      const logData = { code: 'ERR001', retry: 3 };
      const customMessage = 'Custom operation failed';

      enhancedLogger.error(logData, customMessage);

      expect(errorSpy).toHaveBeenCalledWith(logData, customMessage);
    });
  });

  describe('logger properties', () => {
    let enhancedLogger: EnhancedLogger;

    beforeEach(async () => {
      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        enhancedLogger = c.get('logger') as EnhancedLogger;
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();
    });

    it('should have all required logger methods', () => {
      expect(typeof enhancedLogger.info).toBe('function');
      expect(typeof enhancedLogger.warn).toBe('function');
      expect(typeof enhancedLogger.error).toBe('function');
      expect(typeof enhancedLogger.debug).toBe('function');
      expect(typeof enhancedLogger.trace).toBe('function');
      expect(typeof enhancedLogger.fatal).toBe('function');
      expect(typeof enhancedLogger.child).toBe('function');
    });

    it('should have level property', () => {
      expect(enhancedLogger.level).toBeDefined();
    });

    it('should support child logger creation', () => {
      expect(typeof enhancedLogger.child).toBe('function');

      expect(enhancedLogger.child).toBeDefined();
    });
  });

  describe('middleware integration', () => {
    it('should work with other middlewares', async () => {
      let loggerFromContext: EnhancedLogger;

      app.use(enhancedPinoMiddleware());
      app.use(async (c, next) => {
        const logger = c.get('logger') as EnhancedLogger;
        logger.info('Middleware chain info');
        await next();
      });
      app.get('/test', (c) => {
        loggerFromContext = c.get('logger') as EnhancedLogger;
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();

      expect(loggerFromContext).toBeDefined();
      expect(typeof loggerFromContext?.info).toBe('function');
      expect(typeof loggerFromContext?.warn).toBe('function');
      expect(typeof loggerFromContext?.error).toBe('function');
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

  describe('LOG_EXTRA_CONTEXT integration', () => {
    let enhancedLogger: EnhancedLogger;

    beforeEach(async () => {
      app.use(enhancedPinoMiddleware());
      app.get('/test', (c) => {
        enhancedLogger = c.get('logger') as EnhancedLogger;
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client.test.$get();
    });

    it('should include extra context in log data when available', () => {
      const infoSpy = vi.spyOn(enhancedLogger, 'info');
      const extraContext = {
        feature: 'user-management',
        action: 'create-user',
        correlationId: 'corr-123',
      };

      helperMocks.getLogExtraContext.mockReturnValue(extraContext);

      enhancedLogger.info('User creation attempt', { userId: 'new-user-id' });

      expect(infoSpy).toHaveBeenCalledWith('User creation attempt', { userId: 'new-user-id' });
      expect(helperMocks.getLogExtraContext).toHaveBeenCalled();
    });

    it('should not include extraContext field when no extra context is available', () => {
      const warnSpy = vi.spyOn(enhancedLogger, 'warn');
      helperMocks.getLogExtraContext.mockReturnValue({});

      enhancedLogger.warn('Standard warning message');

      expect(warnSpy).toHaveBeenCalledWith('Standard warning message');
      expect(helperMocks.getLogExtraContext).toHaveBeenCalled();
    });
  });
});
