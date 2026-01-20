import type { Context } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockScope = {
  setContext: vi.fn(),
};

const mockSentryFunctions = {
  withScope: vi.fn((callback) => callback(mockScope)),
};

vi.mock('@sentry/node', () => mockSentryFunctions);

const mockEnvVars = {
  SENTRY_ENABLED: false,
};

vi.mock('../config/env.js', () => ({
  envVars: mockEnvVars,
}));

// Import the actual implementations instead of mocked ones
vi.unmock('./sentry.middleware.js');
vi.unmock('../helpers/middleware.js');

const sentryModule = await vi.importActual<typeof import('./sentry.middleware.js')>('./sentry.middleware.js');
const { createSentryRequestContext, sentryContextMiddleware } = sentryModule;

const middlewareModule = await vi.importActual<typeof import('../helpers/middleware.js')>('../helpers/middleware.js');
const { UNKNOWN_VALUE, SOURCE_BACKEND } = middlewareModule;

import type { RequestContext } from '../helpers/middleware.js';

const TEST_HEADERS = {
  REQUEST_ID: 'req-123',
  TRACE_ID: 'trace-456',
  SESSION_ID: 'session-789',
  USER_AGENT: 'Mozilla/5.0 (Test Browser)',
} as const;

const TEST_REQUEST = {
  method: 'GET',
  url: 'http://test.com/api/test',
  path: '/api/test',
} as const;

function createTestRequestContext(): RequestContext {
  return {
    requestId: TEST_HEADERS.REQUEST_ID,
    traceId: TEST_HEADERS.TRACE_ID,
    sessionId: TEST_HEADERS.SESSION_ID,
    ip: '192.168.1.100',
    userAgent: TEST_HEADERS.USER_AGENT,
  };
}

function createMockContext(): Context {
  const mockContext = {
    req: {
      method: TEST_REQUEST.method,
      url: TEST_REQUEST.url,
      path: TEST_REQUEST.path,
      raw: {
        headers: new Map([
          ['x-request-id', TEST_HEADERS.REQUEST_ID],
          ['x-trace-id', TEST_HEADERS.TRACE_ID],
          ['x-session-id', TEST_HEADERS.SESSION_ID],
          ['user-agent', TEST_HEADERS.USER_AGENT],
        ]),
      },
    },
    get: vi.fn(),
  };

  return mockContext as unknown as Context;
}

describe('sentry.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockEnvVars.SENTRY_ENABLED = false;
  });

  describe('createSentryRequestContext', () => {
    it('should create complete Sentry request context', () => {
      const context = createMockContext();
      const requestContext = createTestRequestContext();

      const sentryContext = createSentryRequestContext(context, requestContext);

      expect(sentryContext).toEqual({
        id: TEST_HEADERS.REQUEST_ID,
        traceId: TEST_HEADERS.TRACE_ID,
        sessionId: TEST_HEADERS.SESSION_ID,
        method: TEST_REQUEST.method,
        url: TEST_REQUEST.url,
        path: TEST_REQUEST.path,
        headers: expect.any(Object),
        ip: '192.168.1.100',
        userAgent: TEST_HEADERS.USER_AGENT,
        source: SOURCE_BACKEND,
      });
    });

    it('should include IP even if unknown', () => {
      const context = createMockContext();
      const requestContext: RequestContext = {
        ...createTestRequestContext(),
        ip: UNKNOWN_VALUE,
      };

      const sentryContext = createSentryRequestContext(context, requestContext);

      expect(sentryContext.ip).toBe(UNKNOWN_VALUE);
    });
  });

  describe('sentryContextMiddleware', () => {
    it('should skip when sentry is not available', async () => {
      // Set SENTRY_ENABLED to false
      mockEnvVars.SENTRY_ENABLED = false;

      const context = createMockContext();
      const next = vi.fn();

      const middleware = sentryContextMiddleware();
      await middleware(context, next);

      expect(next).toHaveBeenCalled();
      expect(mockSentryFunctions.withScope).not.toHaveBeenCalled();
    });

    it('should set Sentry context when available', async () => {
      // Enable Sentry
      mockEnvVars.SENTRY_ENABLED = true;

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

      const middleware = sentryContextMiddleware();
      await middleware(context, next);

      expect(mockScope.setContext).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();

      // Cleanup spies
      extractRequestContextSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      mockEnvVars.SENTRY_ENABLED = true;

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
