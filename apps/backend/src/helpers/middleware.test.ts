import type { Context } from 'hono';
import { beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import type { Env } from '@/config/env.schema';

const originalMiddleware = await vi.importActual<typeof import('./middleware')>('./middleware');
const {
  getRawIpAddress,
  createSentryBusinessContext,
  createSentryRequestContext,
  createSentryUserContext,
  extractClientIp,
  extractRequestContext,
  extractRequestHeaders,
  getCaller,
  getLogExtraContext,
  getLogLevelConfig,
  getTrustedIpHeaders,
  SOURCE_BACKEND,
  setSentryCorrelationTags,
  shouldSendToSentry,
  UNKNOWN_VALUE,
} = originalMiddleware;

import type { LogLevel, LogLevelConfig, RequestContext, User } from './middleware';

interface MockRequest {
  header: MockedFunction<(name: string) => string | undefined>;
  method: string;
  url: string;
  path: string;
  raw: {
    headers: Headers;
  };
}

interface MockContext {
  req: MockRequest;
  res: {
    status: number;
  };
  get: MockedFunction<(key: string) => unknown>;
  set: MockedFunction<(key: string, value: unknown) => void>;
  header: MockedFunction<(name: string, value?: string) => void>;
  env: Record<string, unknown>;
}

interface MockSentryScope {
  setTag: MockedFunction<(key: string, value: string) => void>;
}

interface TestUser extends User {
  id: string;
  email?: string;
  entiteId?: string;
  roleId?: string;
}

interface TestRequestContext extends RequestContext {
  requestId: string;
  traceId: string;
  sessionId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  entiteId?: string;
  roleId?: string;
}

interface HeaderMap {
  [key: string]: string | undefined;
}

interface MockEnvVars extends Partial<Env> {
  LOG_LEVEL: LogLevel;
  LOG_LEVEL_SENTRY: LogLevel;
  TRUSTED_IP_HEADERS: string[];
  LOG_EXTRA_CONTEXT?: Record<string, string>;
}

const TEST_IPS = {
  IPV4_PUBLIC: '203.0.113.1',
  IPV4_PRIVATE: '192.168.1.100',
  IPV4_LOCALHOST: '127.0.0.1',
  IPV4_PRIVATE_10: '10.0.0.1',
  IPV4_PRIVATE_172: '172.16.0.1',
  IPV6_PUBLIC: '2001:db8::1',
  IPV6_FULL: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
  IPV6_LOCALHOST: '::1',
  IPV6_COMPRESSED: '2001:db8::1234:5678',
  IPV6_MIXED: '::ffff:192.0.2.1',
  INVALID: 'not-an-ip',
} as const;

const TEST_HEADERS = {
  REQUEST_ID: 'req-123',
  TRACE_ID: 'trace-456',
  SESSION_ID: 'session-789',
  USER_AGENT: 'Mozilla/5.0 (Test Browser)',
} as const;

const TEST_USER: TestUser = {
  id: 'user-123',
  email: 'test@example.com',
  entiteId: 'entite-456',
  roleId: 'role-789',
} as const;

const TRUSTED_HEADERS = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'] as const;

const DEFAULT_ENV_VARS: MockEnvVars = {
  LOG_LEVEL: 'info',
  LOG_LEVEL_SENTRY: 'warn',
  TRUSTED_IP_HEADERS: [],
} as const;

function createMockEnvVars(overrides: Partial<MockEnvVars> = {}): MockEnvVars {
  return { ...DEFAULT_ENV_VARS, ...overrides };
}

function createMockHeaders(headerMap: HeaderMap = {}): MockedFunction<(name: string) => string | undefined> {
  return vi.fn((name: string) => headerMap[name.toLowerCase()]);
}

function createMockContext(overrides: Partial<MockContext> = {}): MockContext {
  const defaultContext: MockContext = {
    req: {
      header: createMockHeaders(),
      method: 'GET',
      url: 'https://example.com/test',
      path: '/test',
      raw: {
        headers: new Headers(),
      },
    },
    res: {
      status: 200,
    },
    get: vi.fn(),
    set: vi.fn(),
    header: vi.fn(),
    env: {},
  };

  return {
    ...defaultContext,
    ...overrides,
    req: {
      ...defaultContext.req,
      ...overrides.req,
    },
    res: {
      ...defaultContext.res,
      ...overrides.res,
    },
    env: {
      ...defaultContext.env,
      ...overrides.env,
    },
  };
}

function createMockSentryScope(): MockSentryScope {
  return {
    setTag: vi.fn(),
  };
}

function mockEnvironment(envVars: Partial<MockEnvVars>): void {
  vi.resetModules();
  vi.doMock('@/config/env', () => ({
    envVars: createMockEnvVars(envVars),
  }));
}

function createTestRequestContext(overrides: Partial<TestRequestContext> = {}): TestRequestContext {
  return {
    requestId: TEST_HEADERS.REQUEST_ID,
    traceId: TEST_HEADERS.TRACE_ID,
    sessionId: TEST_HEADERS.SESSION_ID,
    ip: '192.168.1.100',
    userAgent: TEST_HEADERS.USER_AGENT,
    userId: TEST_USER.id,
    entiteId: TEST_USER.entiteId,
    roleId: TEST_USER.roleId,
    ...overrides,
  };
}

function createContextWithHeaders(headers: HeaderMap): MockContext {
  return createMockContext({
    req: {
      header: createMockHeaders(headers),
      method: 'GET',
      url: 'https://example.com/test',
      path: '/test',
      raw: {
        headers: new Headers(),
      },
    },
  });
}

vi.mock('@/config/env', () => ({
  envVars: {
    LOG_LEVEL: 'info',
    LOG_LEVEL_SENTRY: 'warn',
    TRUSTED_IP_HEADERS: [],
  },
}));

describe('middleware utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe('getRawIpAddress', () => {
    const testCases: Array<[string, string | undefined, string]> = [
      ['null IP', undefined, UNKNOWN_VALUE],
      ['empty IP', '', UNKNOWN_VALUE],
      ['unknown value', UNKNOWN_VALUE, UNKNOWN_VALUE],
      ['IPv4 public', TEST_IPS.IPV4_PUBLIC, TEST_IPS.IPV4_PUBLIC],
      ['IPv4 private', TEST_IPS.IPV4_PRIVATE, TEST_IPS.IPV4_PRIVATE],
      ['IPv6 compressed', TEST_IPS.IPV6_COMPRESSED, TEST_IPS.IPV6_COMPRESSED],
    ];

    testCases.forEach(([description, input, expected]) => {
      it(`should handle ${description}`, () => {
        expect(getRawIpAddress(input)).toBe(expected);
      });
    });
  });

  describe('getTrustedIpHeaders', () => {
    it('should return empty array from environment configuration by default', () => {
      const headers = getTrustedIpHeaders();
      expect(headers).toEqual([]);
    });

    it('should return configured trusted headers', async () => {
      mockEnvironment({ TRUSTED_IP_HEADERS: [...TRUSTED_HEADERS] });
      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const headers = middleware.getTrustedIpHeaders();
      expect(headers).toEqual(TRUSTED_HEADERS);
    });
  });

  describe('extractClientIp', () => {
    beforeEach(() => {
      mockEnvironment({ TRUSTED_IP_HEADERS: [] });
    });

    it('should return unknown when no headers are trusted by default', () => {
      const context = createContextWithHeaders({
        'x-forwarded-for': TEST_IPS.IPV4_PRIVATE,
      });

      expect(extractClientIp(context as unknown as Context)).toBe(UNKNOWN_VALUE);
    });

    it('should extract IP from x-forwarded-for header when trusted', async () => {
      mockEnvironment({ TRUSTED_IP_HEADERS: ['x-forwarded-for'] });

      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const context = createContextWithHeaders({
        'x-forwarded-for': TEST_IPS.IPV4_PRIVATE,
      });

      expect(middleware.extractClientIp(context as unknown as Context)).toBe(TEST_IPS.IPV4_PRIVATE);
    });

    it('should handle comma-separated IPs in x-forwarded-for header when trusted', async () => {
      mockEnvironment({ TRUSTED_IP_HEADERS: ['x-forwarded-for'] });

      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const context = createContextWithHeaders({
        'x-forwarded-for': `${TEST_IPS.IPV4_PUBLIC}, ${TEST_IPS.IPV4_PRIVATE}`,
      });

      expect(middleware.extractClientIp(context as unknown as Context)).toBe(TEST_IPS.IPV4_PUBLIC);
    });

    it('should reject invalid IP formats for security when trusted', async () => {
      mockEnvironment({ TRUSTED_IP_HEADERS: ['x-forwarded-for'] });

      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const context = createContextWithHeaders({
        'x-forwarded-for': `${TEST_IPS.INVALID}, script-injection, ${TEST_IPS.IPV4_PUBLIC}`,
      });

      expect(middleware.extractClientIp(context as unknown as Context)).toBe(TEST_IPS.IPV4_PUBLIC);
    });

    it('should handle IPv6 addresses correctly when trusted', async () => {
      mockEnvironment({ TRUSTED_IP_HEADERS: ['x-forwarded-for'] });

      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const context = createContextWithHeaders({
        'x-forwarded-for': TEST_IPS.IPV6_PUBLIC,
      });

      expect(middleware.extractClientIp(context as unknown as Context)).toBe(TEST_IPS.IPV6_PUBLIC);
    });

    it('should extract IP from x-real-ip header if x-forwarded-for not available when trusted', async () => {
      mockEnvironment({ TRUSTED_IP_HEADERS: ['x-forwarded-for', 'x-real-ip'] });

      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const context = createContextWithHeaders({
        'x-real-ip': TEST_IPS.IPV4_PRIVATE_10,
      });

      expect(middleware.extractClientIp(context as unknown as Context)).toBe(TEST_IPS.IPV4_PRIVATE_10);
    });

    it('should respect trusted headers order', async () => {
      mockEnvironment({
        TRUSTED_IP_HEADERS: ['cf-connecting-ip', 'x-forwarded-for'],
      });

      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const context = createContextWithHeaders({
        'cf-connecting-ip': TEST_IPS.IPV4_PUBLIC,
        'x-forwarded-for': '198.51.100.1',
      });

      expect(middleware.extractClientIp(context as unknown as Context)).toBe(TEST_IPS.IPV4_PUBLIC);
    });

    it('should only trust configured headers', async () => {
      mockEnvironment({ TRUSTED_IP_HEADERS: ['x-real-ip'] });

      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const context = createContextWithHeaders({
        'x-forwarded-for': TEST_IPS.IPV4_PUBLIC,
        'x-real-ip': '198.51.100.1',
      });

      expect(middleware.extractClientIp(context as unknown as Context)).toBe('198.51.100.1');
    });

    it('should handle fallback IP sources and validation', () => {
      expect(
        extractClientIp(
          createMockContext({
            env: { remoteAddress: TEST_IPS.IPV4_PRIVATE_172 },
          }) as unknown as Context,
        ),
      ).toBe(TEST_IPS.IPV4_PRIVATE_172);

      expect(
        extractClientIp(
          createMockContext({
            env: { remoteAddress: TEST_IPS.INVALID },
          }) as unknown as Context,
        ),
      ).toBe(UNKNOWN_VALUE);

      expect(extractClientIp(createMockContext() as unknown as Context)).toBe(UNKNOWN_VALUE);
    });
  });

  describe('extractRequestHeaders', () => {
    it('should extract headers with proper fallback handling', () => {
      const headerMap: HeaderMap = {
        'x-request-id': TEST_HEADERS.REQUEST_ID,
        'x-trace-id': TEST_HEADERS.TRACE_ID,
        'x-session-id': TEST_HEADERS.SESSION_ID,
        'x-forwarded-for': TEST_IPS.IPV4_PRIVATE,
        'x-real-ip': TEST_IPS.IPV4_PRIVATE_10,
        'user-agent': TEST_HEADERS.USER_AGENT,
      };

      expect(extractRequestHeaders(createContextWithHeaders(headerMap) as unknown as Context)).toEqual(headerMap);
      expect(extractRequestHeaders(createMockContext() as unknown as Context)).toEqual({
        'x-request-id': undefined,
        'x-trace-id': undefined,
        'x-session-id': undefined,
        'x-forwarded-for': undefined,
        'x-real-ip': undefined,
        'user-agent': undefined,
      });
    });
  });

  describe('extractRequestContext', () => {
    it('should extract complete request context with user', () => {
      const headerMap: HeaderMap = {
        'x-request-id': TEST_HEADERS.REQUEST_ID,
        'x-trace-id': TEST_HEADERS.TRACE_ID,
        'x-session-id': TEST_HEADERS.SESSION_ID,
        'x-forwarded-for': TEST_IPS.IPV4_PRIVATE,
        'user-agent': TEST_HEADERS.USER_AGENT,
      };

      const context = createContextWithHeaders(headerMap);
      context.get.mockImplementation((key: string) => {
        if (key === 'user') return TEST_USER;
        return undefined;
      });

      const requestContext = extractRequestContext(context as unknown as Context);

      const expectedContext: TestRequestContext = {
        requestId: TEST_HEADERS.REQUEST_ID,
        traceId: TEST_HEADERS.TRACE_ID,
        sessionId: TEST_HEADERS.SESSION_ID,
        userId: TEST_USER.id,
        ip: 'unknown', // The extractClientIp function returns "unknown" by default in test environment
        userAgent: TEST_HEADERS.USER_AGENT,
        entiteId: TEST_USER.entiteId,
        roleId: TEST_USER.roleId,
      };

      expect(requestContext).toEqual(expectedContext);
    });

    it('should generate UUIDs for missing request and trace IDs', () => {
      const context = createMockContext();
      const requestContext = extractRequestContext(context as unknown as Context);

      expect(requestContext.requestId).toBeDefined();
      expect(requestContext.traceId).toBeDefined();
      expect(requestContext.sessionId).toBe(UNKNOWN_VALUE);
      expect(requestContext.userId).toBeUndefined();
      expect(requestContext.entiteId).toBeUndefined();
      expect(requestContext.roleId).toBeUndefined();
    });
  });

  describe('createSentryUserContext', () => {
    it('should create Sentry user context with raw IP', () => {
      const userContext = createSentryUserContext(TEST_USER, '192.168.1.100');

      expect(userContext).toEqual({
        id: TEST_USER.id,
        email: TEST_USER.email,
        username: TEST_USER.email,
        ip_address: '192.168.1.100',
      });
    });

    it('should handle edge cases in user context creation', () => {
      expect(createSentryUserContext(TEST_USER, UNKNOWN_VALUE)).toEqual({
        id: TEST_USER.id,
        email: TEST_USER.email,
        username: TEST_USER.email,
      });

      const userWithoutEmail: TestUser = { id: TEST_USER.id };
      expect(createSentryUserContext(userWithoutEmail, '192.168.1.100')).toEqual({
        id: TEST_USER.id,
        email: undefined,
        username: undefined,
        ip_address: '192.168.1.100',
      });
    });
  });

  describe('createSentryRequestContext', () => {
    it('should create complete Sentry request context', () => {
      const context = createMockContext({
        req: {
          header: createMockHeaders(),
          method: 'POST',
          url: 'https://example.com/api/test',
          path: '/api/test',
          raw: {
            headers: new Headers([['content-type', 'application/json']]),
          },
        },
      });

      const requestContext = createTestRequestContext();
      const sentryContext = createSentryRequestContext(context as unknown as Context, requestContext);

      expect(sentryContext).toMatchObject({
        id: TEST_HEADERS.REQUEST_ID,
        traceId: TEST_HEADERS.TRACE_ID,
        sessionId: TEST_HEADERS.SESSION_ID,
        method: 'POST',
        url: 'https://example.com/api/test',
        path: '/api/test',
        ip: '192.168.1.100',
        userAgent: TEST_HEADERS.USER_AGENT,
        source: SOURCE_BACKEND,
      });
    });

    it('should not include IP if unknown', () => {
      const context = createMockContext();
      const requestContext = createTestRequestContext({ ip: UNKNOWN_VALUE });
      const sentryContext = createSentryRequestContext(context as unknown as Context, requestContext);

      expect(sentryContext).not.toHaveProperty('ip');
    });
  });

  describe('createSentryBusinessContext', () => {
    it('should create business context with all fields', () => {
      const requestContext = createTestRequestContext();
      const businessContext = createSentryBusinessContext(requestContext);

      expect(businessContext).toEqual({
        source: SOURCE_BACKEND,
        userId: TEST_USER.id,
        entiteId: TEST_USER.entiteId,
        roleId: TEST_USER.roleId,
      });
    });

    it('should handle partial and empty business context data', () => {
      expect(
        createSentryBusinessContext(
          createTestRequestContext({
            userId: undefined,
            entiteId: undefined,
            roleId: undefined,
          }),
        ),
      ).toBeUndefined();

      expect(
        createSentryBusinessContext(
          createTestRequestContext({
            entiteId: undefined,
            roleId: undefined,
          }),
        ),
      ).toEqual({
        source: SOURCE_BACKEND,
        userId: TEST_USER.id,
      });
    });
  });

  describe('setSentryCorrelationTags', () => {
    it('should set all correlation tags', () => {
      const mockScope = createMockSentryScope();
      const requestContext = createTestRequestContext();

      setSentryCorrelationTags(mockScope, requestContext);

      const expectedCalls: Array<[string, string]> = [
        ['requestId', TEST_HEADERS.REQUEST_ID],
        ['traceId', TEST_HEADERS.TRACE_ID],
        ['sessionId', TEST_HEADERS.SESSION_ID],
        ['source', SOURCE_BACKEND],
        ['userId', TEST_USER.id],
        ['entiteId', TEST_USER.entiteId as string],
        ['roleId', TEST_USER.roleId as string],
      ];

      expectedCalls.forEach(([key, value]) => {
        expect(mockScope.setTag).toHaveBeenCalledWith(key, value);
      });
    });

    it('should not set undefined tags', () => {
      const mockScope = createMockSentryScope();
      const requestContext = createTestRequestContext({
        userId: undefined,
        entiteId: undefined,
        roleId: undefined,
      });

      setSentryCorrelationTags(mockScope, requestContext);

      expect(mockScope.setTag).toHaveBeenCalledWith('requestId', TEST_HEADERS.REQUEST_ID);
      expect(mockScope.setTag).toHaveBeenCalledWith('traceId', TEST_HEADERS.TRACE_ID);
      expect(mockScope.setTag).toHaveBeenCalledWith('sessionId', TEST_HEADERS.SESSION_ID);
      expect(mockScope.setTag).toHaveBeenCalledWith('source', SOURCE_BACKEND);

      expect(mockScope.setTag).not.toHaveBeenCalledWith('userId', expect.anything());
      expect(mockScope.setTag).not.toHaveBeenCalledWith('entiteId', expect.anything());
      expect(mockScope.setTag).not.toHaveBeenCalledWith('roleId', expect.anything());
    });
  });

  describe('getCaller', () => {
    it('should extract caller information from stack trace', () => {
      const caller = getCaller();
      expect(caller === 'unknown' || /\.ts:\d+/.test(caller)).toBe(true);
    });

    it('should return unknown if stack trace unavailable', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(Error.prototype, 'stack');

      Object.defineProperty(Error.prototype, 'stack', {
        get: () => undefined,
        configurable: true,
      });

      const caller = getCaller();
      expect(caller).toBe(UNKNOWN_VALUE);

      if (originalDescriptor) {
        Object.defineProperty(Error.prototype, 'stack', originalDescriptor);
      }
    });
  });

  describe('getLogLevelConfig', () => {
    it('should return configuration from environment', () => {
      const config = getLogLevelConfig();

      const expectedConfig: LogLevelConfig = {
        console: 'info',
        sentry: 'warn',
      };

      expect(config).toEqual(expectedConfig);
    });

    it('should use custom log levels from environment', async () => {
      mockEnvironment({
        LOG_LEVEL: 'debug',
        LOG_LEVEL_SENTRY: 'error',
      });

      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const config = middleware.getLogLevelConfig();

      expect(config).toEqual({
        console: 'debug',
        sentry: 'error',
      });
    });
  });

  describe('shouldSendToSentry', () => {
    it('should determine Sentry eligibility based on log level configuration', () => {
      const config: LogLevelConfig = { console: 'debug', sentry: 'error' };
      expect(shouldSendToSentry('error', config)).toBe(true);
      expect(shouldSendToSentry('warn', config)).toBe(false);

      expect(shouldSendToSentry('warn')).toBe(true);
      expect(shouldSendToSentry('info')).toBe(false);
    });
  });

  describe('getLogExtraContext', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should return empty object when LOG_EXTRA_CONTEXT is not set or undefined', () => {
      mockEnvironment({ LOG_EXTRA_CONTEXT: {} });
      expect(getLogExtraContext()).toEqual({});

      mockEnvironment({ LOG_EXTRA_CONTEXT: undefined });
      expect(getLogExtraContext()).toEqual({});
    });

    it('should return parsed context when LOG_EXTRA_CONTEXT is set', async () => {
      const extraContext = {
        env: 'production',
        service: 'api',
        version: '1.2.3',
      };

      mockEnvironment({ LOG_EXTRA_CONTEXT: extraContext });
      const middleware = await vi.importActual<typeof import('./middleware')>('./middleware');
      const result = middleware.getLogExtraContext();
      expect(result).toEqual(extraContext);
    });
  });
});
