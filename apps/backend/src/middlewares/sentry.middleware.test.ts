import type { Context } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/libs/prisma';

// Import the actual implementations instead of mocked ones
vi.unmock('./sentry.middleware');
vi.unmock('@/helpers/middleware');

const sentryModule = await vi.importActual<typeof import('./sentry.middleware')>('./sentry.middleware');
const { createSentryRequestContext, createSentryUserFromContext, sentryContextMiddleware } = sentryModule;

const middlewareModule = await vi.importActual<typeof import('@/helpers/middleware')>('@/helpers/middleware');
const { UNKNOWN_VALUE, SOURCE_BACKEND } = middlewareModule;

import type { EnrichedUserContext, RequestContext } from '@/helpers/middleware';
import type { SentryHub } from './sentry.middleware';

interface TestUser extends User {
  id: string;
  email?: string;
}

interface TestRequestContext extends RequestContext {
  requestId: string;
  traceId: string;
  sessionId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  entiteIds?: string[] | null;
  roleId?: string;
}

const TEST_HEADERS = {
  REQUEST_ID: 'req-123',
  TRACE_ID: 'trace-456',
  SESSION_ID: 'session-789',
  USER_AGENT: 'Mozilla/5.0 (Test Browser)',
} as const;

const TEST_USER: TestUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  uid: 'test-uid',
  sub: 'test-sub',
  createdAt: new Date(),
  active: true,
  pcData: {},
  roleId: 'role-789',
  statutId: 'statut-123',
  entiteId: 'entite-456',
} as const;

function createTestRequestContext(overrides: Partial<TestRequestContext> = {}): TestRequestContext {
  return {
    requestId: TEST_HEADERS.REQUEST_ID,
    traceId: TEST_HEADERS.TRACE_ID,
    sessionId: TEST_HEADERS.SESSION_ID,
    ip: '192.168.1.100',
    userAgent: TEST_HEADERS.USER_AGENT,
    userId: TEST_USER.id,
    entiteIds: ['entite-456'],
    roleId: 'role-789',
    ...overrides,
  };
}

function createMockContext(): Context {
  const headers = new Headers([['content-type', 'application/json']]);

  const mockContext = {
    req: {
      header: vi.fn((name: string) => headers.get(name)),
      method: 'GET',
      url: 'https://example.com/test',
      path: '/test',
      raw: {
        headers,
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

  return mockContext as unknown as Context;
}

function createMockSentryHub(): SentryHub {
  return {
    setContext: vi.fn(),
    setTag: vi.fn(),
    setUser: vi.fn(),
    captureException: vi.fn(),
  };
}

describe('sentry.middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createSentryRequestContext', () => {
    it('should create complete Sentry request context', () => {
      const context = createMockContext();
      context.req.method = 'POST';
      context.req.url = 'https://example.com/api/test';
      context.req.path = '/api/test';

      const requestContext = createTestRequestContext();
      const sentryContext = createSentryRequestContext(context, requestContext);

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

    it('should include IP even if unknown', () => {
      const context = createMockContext();
      const requestContext = createTestRequestContext({ ip: UNKNOWN_VALUE });
      const sentryContext = createSentryRequestContext(context, requestContext);

      expect(sentryContext).toHaveProperty('ip', UNKNOWN_VALUE);
    });
  });

  describe('createSentryUserFromContext', () => {
    it('should create user from context with IP and all fields', () => {
      const userContext: EnrichedUserContext = {
        userId: TEST_USER.id,
        roleId: 'role-789',
        entiteIds: ['entite-456'],
      };

      const sentryUser = createSentryUserFromContext(userContext, '192.168.1.100');

      expect(sentryUser).toEqual({
        id: TEST_USER.id,
        ip_address: '192.168.1.100',
        roleId: 'role-789',
        entiteIds: ['entite-456'],
      });
    });

    it('should exclude IP when unknown', () => {
      const userContext: EnrichedUserContext = {
        userId: TEST_USER.id,
        roleId: 'role-789',
        entiteIds: ['entite-456'],
      };

      const sentryUser = createSentryUserFromContext(userContext, UNKNOWN_VALUE);

      expect(sentryUser).toEqual({
        id: TEST_USER.id,
        roleId: 'role-789',
        entiteIds: ['entite-456'],
      });
    });

    it('should handle partial context data', () => {
      const userContext: EnrichedUserContext = {
        userId: TEST_USER.id,
      };

      const sentryUser = createSentryUserFromContext(userContext, '192.168.1.100');

      expect(sentryUser).toEqual({
        id: TEST_USER.id,
        ip_address: '192.168.1.100',
      });
    });

    it('should exclude entiteIds when empty array', () => {
      const userContext: EnrichedUserContext = {
        userId: TEST_USER.id,
        roleId: 'role-789',
        entiteIds: [],
      };

      const sentryUser = createSentryUserFromContext(userContext, '192.168.1.100');

      expect(sentryUser).toEqual({
        id: TEST_USER.id,
        ip_address: '192.168.1.100',
        roleId: 'role-789',
      });
    });

    it('should include entiteIds when present and not empty', () => {
      const userContext: EnrichedUserContext = {
        userId: TEST_USER.id,
        entiteIds: ['entite-1', 'entite-2'],
      };

      const sentryUser = createSentryUserFromContext(userContext, '192.168.1.100');

      expect(sentryUser).toEqual({
        id: TEST_USER.id,
        ip_address: '192.168.1.100',
        entiteIds: ['entite-1', 'entite-2'],
      });
    });

    it('should handle all fields being absent except userId', () => {
      const userContext: EnrichedUserContext = {
        userId: TEST_USER.id,
      };

      const sentryUser = createSentryUserFromContext(userContext, UNKNOWN_VALUE);

      expect(sentryUser).toEqual({
        id: TEST_USER.id,
      });
    });
  });

  describe('sentryContextMiddleware', () => {
    it('should skip when sentry is not available', async () => {
      const context = createMockContext();
      const next = vi.fn();

      const middleware = sentryContextMiddleware();
      await middleware(context, next);

      expect(next).toHaveBeenCalled();
    });

    it('should set Sentry context when available', async () => {
      const mockSentry = createMockSentryHub();
      const context = createMockContext();
      const next = vi.fn();
      const testContext = createTestRequestContext();

      // Mock the middleware helpers using spies
      const extractRequestContextSpy = vi
        .spyOn(
          middlewareModule as { extractRequestContext: typeof middlewareModule.extractRequestContext },
          'extractRequestContext',
        )
        .mockReturnValue(testContext);
      const enrichUserContextSpy = vi
        .spyOn(
          middlewareModule as { enrichUserContext: typeof middlewareModule.enrichUserContext },
          'enrichUserContext',
        )
        .mockReturnValue({
          userId: TEST_USER.id,
          roleId: 'role-789',
          entiteIds: ['entite-456'],
        });

      context.get = vi.fn((key: string) => {
        if (key === 'sentry') return mockSentry;
        return undefined;
      });

      const middleware = sentryContextMiddleware();
      await middleware(context, next);

      expect(mockSentry.setContext).toHaveBeenCalled();
      expect(mockSentry.setUser).toHaveBeenCalled();
      expect(mockSentry.setTag).toHaveBeenCalledWith('roleId', 'role-789');
      expect(mockSentry.setTag).toHaveBeenCalledWith('entiteIds', 'entite-456');
      expect(next).toHaveBeenCalled();

      // Cleanup spies
      extractRequestContextSpy.mockRestore();
      enrichUserContextSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const mockSentry = createMockSentryHub();
      const mockLogger = {
        warn: vi.fn(),
      };
      const context = createMockContext();
      const next = vi.fn();

      // Mock extractRequestContext to throw an error
      const extractRequestContextSpy = vi
        .spyOn(
          middlewareModule as { extractRequestContext: typeof middlewareModule.extractRequestContext },
          'extractRequestContext',
        )
        .mockImplementation(() => {
          throw new Error('Test error');
        });

      context.get = vi.fn((key: string) => {
        if (key === 'sentry') return mockSentry;
        if (key === 'logger') return mockLogger;
        return undefined;
      });

      const middleware = sentryContextMiddleware();
      await middleware(context, next);

      expect(mockLogger.warn).toHaveBeenCalledWith({ error: 'Test error' }, 'Failed to set Sentry context');
      expect(next).toHaveBeenCalled();

      // Cleanup spy
      extractRequestContextSpy.mockRestore();
    });
  });
});
