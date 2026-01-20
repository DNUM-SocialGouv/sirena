import type { Context } from 'hono';
import { expect, vi } from 'vitest';
import type { LogLevel, RequestContext } from '../helpers/middleware.js';
import type { User } from '../libs/prisma.js';

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
  assign: ReturnType<typeof vi.fn>;
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
  entiteIds?: string[];
}

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
  assign: vi.fn(),
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

export const createTestRequestContext = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  requestId: 'test-request-id',
  traceId: 'test-trace-id',
  sessionId: 'test-session-id',
  userId: 'test-user-id',
  ip: 'xxx.xxx.xxx.100',
  userAgent: 'Mozilla/5.0',
  entiteIds: ['test-entite-id'] as string[],
  roleId: 'test-role-id',
  ...overrides,
});

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 'user-123',
  email: 'test@example.com',
  prenom: 'Test',
  nom: 'User',
  uid: 'test-uid',
  sub: 'test-sub',
  createdAt: new Date(),
  updatedAt: new Date(),
  pcData: {},
  roleId: 'role-789',
  statutId: 'statut-123',
  entiteId: 'entite-456',
  entiteIds: ['entite-456'],
  ...overrides,
});

export const createTestError = (message = 'Test error'): Error => {
  return new Error(message);
};

export const setupSentryMocks = (): {
  mockScope: ReturnType<typeof createMockSentryScope>;
  mockSpan: ReturnType<typeof createMockSentrySpan>;
  sentryMocks: {
    getCurrentScope: ReturnType<typeof vi.fn>;
    startSpan: ReturnType<typeof vi.fn>;
    withScope: ReturnType<typeof vi.fn>;
    captureException: ReturnType<typeof vi.fn>;
    captureMessage: ReturnType<typeof vi.fn>;
  };
} => {
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

export const setupMiddlewareHelperMocks = (
  requestContext?: Partial<RequestContext>,
): {
  helperMocks: Record<string, ReturnType<typeof vi.fn> | string>;
  testContext: RequestContext;
} => {
  const testContext = createTestRequestContext(requestContext);

  const middlewareHelpers = {
    extractRequestContext: vi.fn(() => testContext),
    getLogLevelConfig: vi.fn(() => ({
      console: 'info' as LogLevel,
      sentry: 'warn' as LogLevel,
    })),
    shouldSendToSentry: vi.fn((level: LogLevel) => level === 'warn' || level === 'error' || level === 'fatal'),
    getCaller: vi.fn(() => 'test.ts:123'),
    setSentryCorrelationTags: vi.fn(),
    getLogExtraContext: vi.fn(() => ({})),
    extractClientIp: vi.fn(() => 'xxx.xxx.xxx.100'),
    enrichUserContext: vi.fn((context: RequestContext) =>
      context.userId ? { userId: context.userId, roleId: context.roleId, entiteIds: context.entiteIds } : null,
    ),
    enrichRequestContext: vi.fn((context: RequestContext) => ({ ...context, caller: 'test.ts:123' })),
    UNKNOWN_VALUE: 'unknown',
    SOURCE_BACKEND: 'backend',
  };

  const sentryHelpers = {
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

    createSentryUserFromContext: vi.fn(
      (userContext: { userId: string; roleId?: string; entiteIds?: string[] | null }, ip: string) => ({
        id: userContext.userId,
        ...(ip && ip !== 'unknown' && { ip_address: ip }),
        ...(userContext.roleId && { roleId: userContext.roleId }),
        ...(userContext.entiteIds && userContext.entiteIds.length > 0 && { entiteIds: userContext.entiteIds }),
      }),
    ),
  };

  vi.doMock('@/helpers/middleware', () => middlewareHelpers);
  vi.doMock('@/middlewares/sentry.middleware', () => sentryHelpers);

  const helperMocks = { ...middlewareHelpers, ...sentryHelpers };
  return { helperMocks, testContext };
};

export const setupPinoMocks = () => {
  const mockPinoLogger = createMockPinoLogger();

  vi.mock('hono-pino', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
      assign: vi.fn(),
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
  vi.mock('../../config/env.js', () => ({
    envVars: {
      LOG_LEVEL: 'info',
      LOG_LEVEL_SENTRY: 'warn',
      LOG_FORMAT: 'json',
    },
  }));
};

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

  if (data && Object.keys(data).length > 0) {
    enhancedLogger[level](message, data);
  } else {
    enhancedLogger[level](message);
  }

  const expectedData = {
    message,
    ...data,
    requestId: requestContext.requestId,
    traceId: requestContext.traceId,
    sessionId: requestContext.sessionId,
    userId: requestContext.userId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent,
    entiteIds: requestContext.entiteIds,
    caller: 'test.ts:123',
  };

  expectLogMethodCalled(mockPinoLogger, level as keyof MockPinoLogger, expectedData, message);

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

export const resetAllMocks = () => {
  vi.resetAllMocks();
};

export const clearAllMocks = () => {
  vi.clearAllMocks();
};
