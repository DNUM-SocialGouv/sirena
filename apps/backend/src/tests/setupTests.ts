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

vi.mock('../helpers/middleware.js', () => ({
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
  getLogLevelConfig: vi.fn(() => ({
    console: 'info',
    sentry: 'warn',
  })),
  getLogExtraContext: vi.fn(() => ({})),
  shouldSendToSentry: vi.fn(() => false), // Default to not send to Sentry in tests
  getCaller: vi.fn(() => 'test.ts:123'),
  setSentryCorrelationTags: vi.fn(),
  extractClientIp: vi.fn(() => 'xxx.xxx.xxx.100'),
  getRawIpAddress: vi.fn((ip) => ip || 'unknown'),
  enrichUserContext: vi.fn((context) =>
    context.userId ? { userId: context.userId, roleId: context.roleId, entiteIds: context.entiteIds } : null,
  ),
  enrichRequestContext: vi.fn((context) => ({ ...context, caller: 'test.ts:123' })),
  createPinoContextData: vi.fn((requestContext, userContext) => ({
    requestId: requestContext.requestId,
    traceId: requestContext.traceId,
    sessionId: requestContext.sessionId,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent,
    ...(userContext && {
      userId: userContext.userId,
      roleId: userContext.roleId,
      entiteIds: userContext.entiteIds,
    }),
    ...(requestContext.caller && { caller: requestContext.caller }),
    ...(requestContext.extraContext && { extraContext: requestContext.extraContext }),
  })),
  UNKNOWN_VALUE: 'unknown',
  SOURCE_BACKEND: 'backend',
}));

vi.mock('../middlewares/sentry.middleware.js', () => ({
  createSentryRequestContext: vi.fn(() => ({})),
  createSentryUserFromContext: vi.fn(() => ({})),
}));

const mockPinoMiddleware = vi.fn(async (c: Context, next: () => Promise<void>) => {
  c.set('logger', fakeLogger);
  return next();
});

vi.mock('hono-pino', () => ({
  pinoLogger: vi.fn(() => mockPinoMiddleware),
}));

const mockPino = Object.assign(
  vi.fn(() => fakeLogger),
  {
    stdSerializers: {} as Record<string, unknown>,
  },
);

vi.mock('pino', () => {
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

Object.assign(process.env, {
  // PC
  PC_DOMAIN: 'https://example.com',
  PC_CLIENT_ID: 'test-client-id',
  PC_CLIENT_SECRET: 'test-client-secret',
  PC_ID_TOKEN_SIGNED_RESPONSE_ALG: 'RS256',
  PC_USERINFO_SIGNED_RESPONSE_ALG: 'RS256',
  PC_REDIRECT_URI: 'http://localhost:3000/callback',
  // Auth
  AUTH_TOKEN_NAME: 'auth_token',
  REFRESH_TOKEN_NAME: 'test-refresh-token',
  IS_LOGGED_TOKEN_NAME: 'test-logged-token',
  AUTH_TOKEN_EXPIRATION: '3600',
  REFRESH_TOKEN_EXPIRATION: '86400',
  AUTH_TOKEN_SECRET_KEY: 'test-auth-secret',
  REFRESH_TOKEN_SECRET_KEY: 'test-refresh-secret',
  // Frontend
  FRONTEND_URI: 'http://localhost:3001',
  FRONTEND_REDIRECT_URI: 'http://localhost:3001/auth/callback',
  FRONTEND_REDIRECT_LOGIN_URI: 'http://localhost:3001/login',
  // DematSocial
  DEMAT_SOCIAL_API_URL: 'http://localhost:3002',
  DEMAT_SOCIAL_API_TOKEN: 'test-api-token',
  DEMAT_SOCIAL_API_DIRECTORY: '123',
  DEMAT_SOCIAL_INSTRUCTEUR_ID: 'instructeur-123',
  // Esante
  ANNUAIRE_SANTE_API_KEY: 'test-annuairesante-key',
  ANNUAIRE_SANTE_API_URL: 'http://localhost:3004',
  // Internal
  LOG_FORMAT: 'json',
  LOG_LEVEL: 'info',
  TRUSTED_IP_HEADERS: 'x-forwarded-for',
  LOG_EXTRA_CONTEXT: '',
  SUPER_ADMIN_LIST_EMAIL: 'admin@test.com',
  // Sentry
  SENTRY_ENABLED: 'false',
  SENTRY_DSN_BACKEND: '',
  SENTRY_ENVIRONMENT: 'test',
  // Minio
  S3_BUCKET_ACCESS_KEY: 'minio-access-key',
  S3_BUCKET_SECRET_KEY: 'minio-secret-key',
  S3_BUCKET_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET_NAME: 'test-bucket',
  S3_BUCKET_REGION: 'eu-west-1',
  S3_BUCKET_ROOT_DIR: 'root',
  S3_BUCKET_PORT: '9000',
  S3_ENCRYPTION_KEY: 'a'.repeat(64),
  CLAMAV_HOST: 'localhost',
  CLAMAV_PORT: '3310',
  // Tipimail
  TIPIMAIL_API_URL: 'http://localhost:3003',
  TIPIMAIL_API_KEY: 'test-api-key',
  TIPIMAIL_USER_ID: 'test-user-id',
  TIPIMAIL_FROM_ADDRESS: 'test@example.com',
  TIPIMAIL_FROM_PERSONAL_NAME: 'Test User',
  // Cron
  CRON_DEMAT_SOCIAL: '0 0 * * *',
  CRON_RETRY_AFFECTATION: '3600',
  CRON_RETRY_IMPORT_REQUETES: '3600',
  CRON_QUEUE_UNPROCESSED_FILES: '3600',
  // Redis
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_TLS: 'false',
  REDIS_USERNAME: 'redis-username',
  REDIS_PASSWORD: 'redis-password',
});
