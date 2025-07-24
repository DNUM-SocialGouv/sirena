import type { Context } from 'hono';
import { expect, vi } from 'vitest';
import type { LogLevel, RequestContext, User } from '@/helpers/middleware';

// ===== TYPE DEFINITIONS =====

export interface MockSentryScope {
  setContext: ReturnType<typeof vi.fn>;
  setTag: ReturnType<typeof vi.fn>;
  setUser: ReturnType<typeof vi.fn>;
  setFingerprint: ReturnType<typeof vi.fn>;
  setLevel: ReturnType<typeof vi.fn>;
}

export interface MockSentrySpan {
  setAttributes: ReturnType<typeof vi.fn>;
}

export interface MockPinoLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  trace: ReturnType<typeof vi.fn>;
  fatal: ReturnType<typeof vi.fn>;
  child: ReturnType<typeof vi.fn>;
  level: string;
}

export interface MockContext {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  header: ReturnType<typeof vi.fn>;
  req: {
    header: ReturnType<typeof vi.fn>;
    method: string;
    url: string;
    path: string;
    raw: Request;
  };
}

export interface TestUser extends User {
  email: string;
}

// ===== MOCK FACTORIES =====

export const createMockSentryScope = (): MockSentryScope => ({
  setContext: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
  setFingerprint: vi.fn(),
  setLevel: vi.fn(),
});

export const createMockSentrySpan = (): MockSentrySpan => ({
  setAttributes: vi.fn(),
});

export const createMockPinoLogger = (): MockPinoLogger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn().mockReturnThis(),
  level: 'info',
});

export const createMockContext = (overrides: Partial<MockContext> = {}): MockContext => {
  const headersInit = new Headers({
    'x-request-id': 'test-request-id',
    'x-trace-id': 'test-trace-id',
    'user-agent': 'Mozilla/5.0',
  });

  const mockRequest = new Request('http://localhost:3000/test', {
    method: 'GET',
    headers: headersInit,
  });

  return {
    get: vi.fn((key: string) => {
      if (key === 'logger') return createMockPinoLogger();
      return undefined;
    }),
    set: vi.fn(),
    header: vi.fn(),
    req: {
      header: vi.fn((name: string) => headersInit.get(name.toLowerCase())),
      method: 'GET',
      url: 'http://localhost:3000/test',
      path: '/test',
      raw: mockRequest,
    },
    ...overrides,
  };
};

// ===== TEST DATA FACTORIES =====

export const createTestRequestContext = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  requestId: 'test-request-id',
  traceId: 'test-trace-id',
  sessionId: 'test-session-id',
  userId: 'test-user-id',
  ip: 'xxx.xxx.xxx.100',
  userAgent: 'Mozilla/5.0',
  entiteId: 'test-entite-id',
  roleId: 'test-role-id',
  ...overrides,
});

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 'user-123',
  email: 'test@example.com',
  entiteId: 'entite-456',
  roleId: 'role-789',
  ...overrides,
});

export const createTestError = (message = 'Test error'): Error => {
  return new Error(message);
};

// ===== MOCK SETUP UTILITIES =====

export const setupSentryMocks = () => {
  const mockScope = createMockSentryScope();
  const mockSpan = createMockSentrySpan();

  const sentryMocks = {
    getCurrentScope: vi.fn(() => mockScope),
    startSpan: vi.fn(async (_config, callback) => {
      return await callback(mockSpan);
    }),
    withScope: vi.fn((callback) => callback(mockScope)),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  };

  vi.doMock('@sentry/node', () => sentryMocks);

  return { mockScope, mockSpan, sentryMocks };
};

export const setupMiddlewareHelperMocks = (requestContext?: Partial<RequestContext>) => {
  const testContext = createTestRequestContext(requestContext);

  const helperMocks = {
    extractRequestContext: vi.fn(() => testContext),
    generateUUID: vi.fn(() => 'test-uuid'),
    getLogLevelConfig: vi.fn(() => ({
      console: 'info' as LogLevel,
      sentry: 'warn' as LogLevel,
    })),
    shouldSendToSentry: vi.fn((level: LogLevel) => level === 'warn' || level === 'error' || level === 'fatal'),
    getCaller: vi.fn(() => 'test.ts:123'),
    setSentryCorrelationTags: vi.fn(),
    getLogExtraContext: vi.fn(() => ({})),
    createSentryRequestContext: vi.fn((c: Context, context: RequestContext) => ({
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
    createSentryBusinessContext: vi.fn((context: RequestContext) => ({
      source: 'backend',
      userId: context.userId,
      entiteId: context.entiteId,
      roleId: context.roleId,
    })),
    createSentryUserContext: vi.fn((user: User, ip: string) => ({
      id: user.id,
      email: user.email,
      username: user.email,
      ip_address: ip,
    })),
    extractClientIp: vi.fn(() => 'xxx.xxx.xxx.100'),
    UNKNOWN_VALUE: 'unknown',
    SOURCE_BACKEND: 'backend',
  };

  vi.doMock('@/helpers/middleware', () => helperMocks);

  return { helperMocks, testContext };
};

export const setupPinoMocks = () => {
  const mockPinoLogger = createMockPinoLogger();

  vi.mock('hono-pino', () => {
    // Create logger instance inside the mock callback to avoid reference errors
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
      level: 'info',
    };

    return {
      pinoLogger: vi.fn(() => (c: Context, next: () => Promise<void>) => {
        c.set('logger', mockLogger);
        return next();
      }),
    };
  });

  vi.mock('pino', () => {
    // Create a fresh mock logger inside the mock callback
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

    const mockPino = Object.assign(
      vi.fn(() => innerMockLogger),
      {
        stdSerializers: {} as Record<string, unknown>,
      },
    );
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

  vi.mock('pino-pretty', () => ({
    default: vi.fn(),
  }));

  const mockPinoMiddleware = vi.fn((c: Context, next: () => Promise<void>) => {
    c.set('logger', mockPinoLogger);
    return next();
  });

  return { mockPinoLogger, mockPinoMiddleware };
};

export const setupEnvironmentMocks = () => {
  vi.mock('@/config/env', () => ({
    envVars: {
      LOG_LEVEL: 'info',
      LOG_LEVEL_SENTRY: 'warn',
      LOG_FORMAT: 'json',
    },
  }));
};

// ===== TEST ASSERTION HELPERS =====

export const expectLogMethodCalled = (
  mockLogger: MockPinoLogger,
  level: keyof MockPinoLogger,
  expectedData: Record<string, unknown>,
  expectedMessage: string,
) => {
  const logMethod = mockLogger[level];
  if (typeof logMethod === 'function') {
    expect(logMethod).toHaveBeenCalledWith(expect.objectContaining(expectedData), expectedMessage);
  }
};

export const expectSentryContextSet = (
  mockScope: MockSentryScope,
  contextName: string,
  expectedContext: Record<string, unknown>,
) => {
  expect(mockScope.setContext).toHaveBeenCalledWith(contextName, expect.objectContaining(expectedContext));
};

export const expectSentryTagsSet = (mockScope: MockSentryScope, expectedTags: Record<string, string>) => {
  Object.entries(expectedTags).forEach(([key, value]) => {
    expect(mockScope.setTag).toHaveBeenCalledWith(key, value);
  });
};

// ===== LOGGING TEST UTILITIES =====

export interface LogTestCase {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  shouldSendToSentry: boolean;
  sentryLevel?: 'warning' | 'error';
  expectSentryException?: boolean;
}

export const createLogTestCases = (): LogTestCase[] => [
  {
    level: 'info',
    message: 'Test info message',
    data: { extra: 'data' },
    shouldSendToSentry: false,
  },
  {
    level: 'debug',
    message: 'Debug information',
    data: { query: 'SELECT * FROM users' },
    shouldSendToSentry: false,
  },
  {
    level: 'trace',
    message: 'Function entry',
    data: { function: 'processUser' },
    shouldSendToSentry: false,
  },
  {
    level: 'warn',
    message: 'Test warning',
    data: { code: 'WARN_001' },
    shouldSendToSentry: true,
    sentryLevel: 'warning',
  },
  {
    level: 'error',
    message: 'Database error',
    data: { err: createTestError('Test error'), retries: 3 },
    shouldSendToSentry: true,
    sentryLevel: 'error',
    expectSentryException: true,
  },
  {
    level: 'fatal',
    message: 'Critical system error',
    data: { err: createTestError('System failure') },
    shouldSendToSentry: true,
    sentryLevel: 'error',
    expectSentryException: true,
  },
];

export const runLogLevelTest = (
  enhancedLogger: Record<string, (...args: unknown[]) => void>,
  mockPinoLogger: MockPinoLogger,
  testCase: LogTestCase,
  requestContext: RequestContext,
) => {
  const { level, message, data = {}, shouldSendToSentry, sentryLevel, expectSentryException } = testCase;

  // Execute the log call
  if (data && Object.keys(data).length > 0) {
    enhancedLogger[level](message, data);
  } else {
    enhancedLogger[level](message);
  }

  // Verify pino logger was called
  const expectedData = {
    message,
    ...data,
    requestId: requestContext.requestId,
    traceId: requestContext.traceId,
    sessionId: requestContext.sessionId,
    userId: requestContext.userId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent,
    entiteId: requestContext.entiteId,
    caller: 'test.ts:123',
  };

  expectLogMethodCalled(mockPinoLogger, level as keyof MockPinoLogger, expectedData, message);

  // Verify Sentry integration
  if (shouldSendToSentry) {
    expect(vi.mocked(require('@sentry/node')).withScope).toHaveBeenCalled();

    if (expectSentryException && data.err) {
      expect(vi.mocked(require('@sentry/node')).captureException).toHaveBeenCalledWith(data.err);
    } else {
      expect(vi.mocked(require('@sentry/node')).captureMessage).toHaveBeenCalledWith(message, sentryLevel);
    }
  } else {
    expect(vi.mocked(require('@sentry/node')).captureMessage).not.toHaveBeenCalled();
    expect(vi.mocked(require('@sentry/node')).captureException).not.toHaveBeenCalled();
  }
};

// ===== CLEANUP UTILITIES =====

export const resetAllMocks = () => {
  vi.resetAllMocks();
};

export const clearAllMocks = () => {
  vi.clearAllMocks();
};

// ===== APP SETUP UTILITIES =====

import { Hono } from 'hono';
import { testClient } from 'hono/testing';

export const createTestApp = (middlewares: Array<(c: Context, next: () => Promise<void>) => Promise<void>> = []) => {
  const app = new Hono();
  middlewares.forEach((middleware) => app.use(middleware));
  return app;
};

export const createHonoTestClient = (app: Hono) => {
  return testClient(app);
};
