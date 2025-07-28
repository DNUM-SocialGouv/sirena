import type { Context } from 'hono';
import { vi } from 'vitest';

const fakeLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: () => fakeLogger,
  level: 'info',
};

// Mock Sentry
vi.mock('@sentry/node', () => ({
  getCurrentScope: vi.fn(() => ({
    setContext: vi.fn(),
    setTag: vi.fn(),
    setUser: vi.fn(),
    setFingerprint: vi.fn(),
    setLevel: vi.fn(),
  })),
  startSpan: vi.fn((_config, callback) =>
    callback({
      setAttributes: vi.fn(),
    }),
  ),
  withScope: vi.fn((callback) =>
    callback({
      setContext: vi.fn(),
      setTag: vi.fn(),
      setUser: vi.fn(),
      setLevel: vi.fn(),
    }),
  ),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock middleware utilities
vi.mock('@/helpers/middleware', () => ({
  extractRequestContext: vi.fn(() => ({
    requestId: 'test-request-id',
    traceId: 'test-trace-id',
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    ip: 'xxx.xxx.xxx.100',
    userAgent: 'Test-Agent/1.0',
    entiteId: 'test-entite-id',
    roleId: 'test-role-id',
  })),
  generateUUID: vi.fn(() => 'test-uuid'),
  getLogLevelConfig: vi.fn(() => ({
    console: 'info',
    sentry: 'warn',
  })),
  shouldSendToSentry: vi.fn(() => false), // Default to not send to Sentry in tests
  getCaller: vi.fn(() => 'test.ts:123'),
  setSentryCorrelationTags: vi.fn(),
  extractClientIp: vi.fn(() => 'xxx.xxx.xxx.100'),
  createSentryRequestContext: vi.fn(() => ({})),
  createSentryBusinessContext: vi.fn(() => ({})),
  createSentryUserContext: vi.fn(() => ({})),
  getRawIpAddress: vi.fn((ip) => ip || 'unknown'),
  UNKNOWN_VALUE: 'unknown',
  SOURCE_BACKEND: 'backend',
}));

// Mock pino and hono-pino
const mockPinoMiddleware = vi.fn(async (c: Context, next: () => Promise<void>) => {
  c.set('logger', fakeLogger);
  return next();
});

vi.mock('hono-pino', () => ({
  pinoLogger: vi.fn(() => mockPinoMiddleware),
}));

// Create a mock pino with stdSerializers
const mockPino = Object.assign(
  vi.fn(() => fakeLogger),
  {
    stdSerializers: {} as Record<string, unknown>,
  },
);

vi.mock('pino', () => {
  // Attach stdSerializers to the function itself (like real pino)
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

// Mock environment variables
vi.mock('@/config/env', () => ({
  envVars: {
    // PC
    PC_DOMAIN: 'https://example.com', // Use the same value as env.test.ts expects
    PC_CLIENT_ID: 'test-client-id',
    PC_CLIENT_SECRET: 'test-client-secret',
    PC_ID_TOKEN_SIGNED_RESPONSE_ALG: 'RS256',
    PC_USERINFO_SIGNED_RESPONSE_ALG: 'RS256',
    PC_REDIRECT_URI: 'http://localhost:3000/callback',
    // Auth
    AUTH_TOKEN_NAME: 'auth_token', // Use the same value as env.test.ts expects
    REFRESH_TOKEN_NAME: 'test-refresh-token',
    IS_LOGGED_TOKEN_NAME: 'test-logged-token',
    AUTH_TOKEN_EXPIRATION: '1h',
    REFRESH_TOKEN_EXPIRATION: '7d',
    AUTH_TOKEN_SECRET_KEY: 'test-auth-secret',
    REFRESH_TOKEN_SECRET_KEY: 'test-refresh-secret',
    // Frontend
    FRONTEND_URI: 'http://localhost:3001',
    FRONTEND_REDIRECT_URI: 'http://localhost:3001/auth/callback',
    FRONTEND_REDIRECT_LOGIN_URI: 'http://localhost:3001/login',
    // DematSocial
    DEMAT_SOCIAL_API_URL: 'http://localhost:3002',
    DEMAT_SOCIAL_API_TOKEN: 'test-api-token',
    DEMAT_SOCIAL_API_DIRECTORY: 'test-directory',
    // Internal
    LOG_FORMAT: 'json',
    LOG_LEVEL: 'info',
    LOG_LEVEL_SENTRY: 'warn',
    TRUSTED_IP_HEADERS: 'x-forwarded-for',
    LOG_EXTRA_CONTEXT: '',
    SUPER_ADMIN_LIST_EMAIL: 'admin@test.com',
  },
}));

// Don't mock the middlewares globally - let individual tests handle their own mocks
