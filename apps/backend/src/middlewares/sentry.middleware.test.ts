import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestRequestContext, createTestUser } from '../tests/test-utils';
import type { TestUser } from '../tests/types';
import { sentryMiddleware } from './sentry.middleware';

vi.unmock('@sentry/node');
vi.unmock('@/helpers/middleware');

const { mockScope, mockSpan, sentryMocks, helperMocks, testContext, honoSentryMocks } = vi.hoisted(() => {
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

  const testContext = {
    requestId: 'test-request-id',
    traceId: 'test-trace-id',
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    ip: 'xxx.xxx.xxx.100',
    userAgent: 'Mozilla/5.0',
    entiteId: 'test-entite-id',
    roleId: 'test-role-id',
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

  const sentryMocks = {
    getCurrentScope: vi.fn(() => mockScope),
    startSpan: vi.fn(async (_config, callback) => {
      return await callback(mockSpan);
    }),
    withScope: vi.fn((callback) => callback(mockScope)),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  };

  const honoSentryMocks = {
    sentry: vi.fn((_config) => {
      return async (c, next) => {
        await sentryMocks.startSpan(
          {
            name: `${c.req.method} ${c.req.path}`,
            op: 'http.server',
            attributes: {
              'http.method': c.req.method,
              'http.route': c.req.path,
              'http.url': c.req.url,
            },
          },
          async (_span) => {
            mockScope.setTag('method', c.req.method);
            mockScope.setTag('route', c.req.path);

            await next();

            mockSpan.setAttributes({
              'http.status_code': c.res.status,
            });
          },
        );
      };
    }),
  };

  return { mockScope, mockSpan, sentryMocks, helperMocks, testContext, honoSentryMocks };
});

vi.mock('@sentry/node', () => sentryMocks);
vi.mock('@/helpers/middleware', () => helperMocks);
vi.mock('@hono/sentry', () => honoSentryMocks);

describe('sentry.middleware.ts', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sentryMiddleware', () => {
    it('should set request context in Sentry', async () => {
      app.use(sentryMiddleware());
      app.get('/test', (c) => c.json({ success: true }));

      const client = testClient(app);
      await client.test.$get();

      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
      expect(helperMocks.createSentryRequestContext).toHaveBeenCalled();
      expect(mockScope.setContext).toHaveBeenCalledWith(
        'request',
        expect.objectContaining({
          id: testContext.requestId,
          traceId: testContext.traceId,
          sessionId: testContext.sessionId,
          source: 'backend',
        }),
      );
    });

    it('should set correlation tags', async () => {
      app.use(sentryMiddleware());
      app.get('/test', (c) => c.json({ success: true }));

      const client = testClient(app);
      await client.test.$get();

      expect(helperMocks.setSentryCorrelationTags).toHaveBeenCalledWith(mockScope, testContext);
    });

    it('should set method and route tags', async () => {
      app.use(sentryMiddleware());
      app.get('/api/users/:id', (c) => c.json({ userId: c.req.param('id') }));

      const client = testClient(app);
      await client.api.users[':id'].$get({ param: { id: '123' } });

      expect(mockScope.setTag).toHaveBeenCalledWith('method', 'GET');
      expect(mockScope.setTag).toHaveBeenCalledWith('route', expect.stringContaining('/api/users'));
    });

    it('should create Sentry span with correct attributes', async () => {
      app.use(sentryMiddleware());
      app.get('/test', (c) => c.json({ success: true }));

      const client = testClient(app);
      const response = await client.test.$get();

      expect(sentryMocks.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('GET /test'),
          op: 'http.server',
          attributes: expect.objectContaining({
            'http.method': 'GET',
            'http.url': expect.stringContaining('/test'),
            'http.route': '/test',
          }),
        }),
        expect.any(Function),
      );

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.status_code': response.status,
      });
    });

    it('should handle errors and capture exceptions', async () => {
      const testError = new Error('Test middleware error');

      app.use(sentryMiddleware());
      app.get('/error', () => {
        throw testError;
      });

      const client = testClient(app);

      const response = await client.error.$get();

      expect(response.status).toBe(500);

      expect(sentryMocks.startSpan).toHaveBeenCalled();

      expect(sentryMocks.withScope).not.toHaveBeenCalled();
      expect(sentryMocks.captureException).not.toHaveBeenCalled();
    });

    it('should handle requests with custom headers', async () => {
      const customRequestContext = createTestRequestContext({
        requestId: 'custom-request-123',
        traceId: 'custom-trace-456',
        ip: 'xxx.xxx.xxx.200',
      });

      helperMocks.extractRequestContext.mockReturnValue(customRequestContext);

      app.use(sentryMiddleware());
      app.get('/custom', (c) => c.json({ custom: true }));

      const client = testClient(app);
      await client.custom.$get({
        headers: {
          'x-request-id': 'custom-request-123',
          'x-trace-id': 'custom-trace-456',
          'x-forwarded-for': 'xxx.xxx.xxx.200',
        },
      });

      expect(mockScope.setContext).toHaveBeenCalledWith(
        'request',
        expect.objectContaining({
          id: 'custom-request-123',
          traceId: 'custom-trace-456',
          ip: 'xxx.xxx.xxx.200',
        }),
      );

      helperMocks.extractRequestContext.mockReturnValue(testContext);
    });

    it('should work with different HTTP methods', async () => {
      app.use(sentryMiddleware());
      app.post('/api/data', (c) => c.json({ created: true }));
      app.put('/api/data/:id', (c) => c.json({ updated: true }));
      app.delete('/api/data/:id', (c) => c.json({ deleted: true }));

      const client = testClient(app);

      await client.api.data.$post({ json: { name: 'test' } });
      expect(mockScope.setTag).toHaveBeenCalledWith('method', 'POST');

      await client.api.data[':id'].$put({
        param: { id: '123' },
        json: { name: 'updated' },
      });
      expect(mockScope.setTag).toHaveBeenCalledWith('method', 'PUT');

      await client.api.data[':id'].$delete({ param: { id: '123' } });
      expect(mockScope.setTag).toHaveBeenCalledWith('method', 'DELETE');
    });
  });

  describe('middleware combination', () => {
    it('should work together correctly', async () => {
      const mockUser = createTestUser();

      let capturedUser: TestUser | undefined;

      app.use(sentryMiddleware());
      app.use(async (c, next) => {
        c.set('user', mockUser);
        await next();
      });
      app.get('/combined', (c) => {
        capturedUser = c.get('user');
        return c.json({ combined: true });
      });

      const client = testClient(app);
      await client.combined.$get();

      expect(helperMocks.extractRequestContext).toHaveBeenCalled();
      expect(helperMocks.createSentryRequestContext).toHaveBeenCalled();
      expect(helperMocks.createSentryUserContext).toHaveBeenCalledWith(mockUser, 'xxx.xxx.xxx.100');

      expect(capturedUser).toEqual(mockUser);

      expect(mockScope.setContext).toHaveBeenCalledWith('request', expect.any(Object));
      expect(mockScope.setContext).toHaveBeenCalledWith('business', expect.any(Object));
      expect(mockScope.setUser).toHaveBeenCalled();
    });

    it('should handle errors with user context', async () => {
      const mockUser = createTestUser();
      const testError = new Error('User-related error');

      app.use(sentryMiddleware());
      app.use(async (c, next) => {
        c.set('user', mockUser);
        await next();
      });
      app.get('/user-error', (_c) => {
        throw testError;
      });

      const client = testClient(app);

      const response = await client['user-error'].$get();

      expect(response.status).toBe(500);

      expect(mockScope.setUser).toHaveBeenCalled();
      expect(mockScope.setFingerprint).toHaveBeenCalledWith(['user', mockUser.id]);

      expect(sentryMocks.withScope).not.toHaveBeenCalled();
    });
  });

  describe('IP address handling', () => {
    it('should handle raw IP addresses in user context', async () => {
      const mockUser = createTestUser();
      const rawIp = '192.168.1.100';

      helperMocks.extractClientIp.mockReturnValue(rawIp);

      const contextWithRawIp = createTestRequestContext({
        ip: rawIp,
      });
      helperMocks.extractRequestContext.mockReturnValue(contextWithRawIp);

      app.use(sentryMiddleware());
      app.use(async (c, next) => {
        c.set('user', mockUser);
        await next();
      });
      app.get('/ip-test', (c) => {
        return c.json({ success: true });
      });

      const client = testClient(app);
      await client['ip-test'].$get();

      expect(helperMocks.createSentryUserContext).toHaveBeenCalledWith(mockUser, rawIp);
    });

    it('should handle requests with different IP sources', async () => {
      const testCases = [
        { header: 'x-forwarded-for', ip: '192.168.1.101' },
        { header: 'x-real-ip', ip: '192.168.1.102' },
        { header: 'cf-connecting-ip', ip: '192.168.1.103' },
      ];

      for (const testCase of testCases) {
        const testApp = new Hono();
        helperMocks.extractClientIp.mockReturnValue(testCase.ip);

        const contextWithCustomIp = createTestRequestContext({
          ip: testCase.ip,
        });
        helperMocks.extractRequestContext.mockReturnValue(contextWithCustomIp);

        testApp.use(sentryMiddleware());
        testApp.get(`/ip-${testCase.header}`, (c) => c.json({ success: true }));

        const client = testClient(testApp);
        await client[`ip-${testCase.header}`].$get({
          headers: {
            [testCase.header]: testCase.ip,
          },
        });

        expect(mockScope.setContext).toHaveBeenCalledWith(
          'request',
          expect.objectContaining({
            ip: testCase.ip,
          }),
        );
      }
    });
  });

  describe('error scenarios', () => {
    it('should handle middleware errors gracefully', async () => {
      const middlewareError = new Error('Middleware setup error');

      helperMocks.extractRequestContext.mockImplementation(() => {
        throw middlewareError;
      });

      app.use(sentryMiddleware());
      app.get('/middleware-error', (c) => c.json({ success: true }));

      const client = testClient(app);

      try {
        await client['middleware-error'].$get();
      } catch (error) {
        expect(error).toBe(middlewareError);
      }

      helperMocks.extractRequestContext.mockImplementation(() => testContext);
    });

    it('should handle async errors in route handlers', async () => {
      const asyncError = new Error('Async operation failed');

      app.use(sentryMiddleware());
      app.get('/async-error', async (c) => {
        await Promise.reject(asyncError);
        return c.json({ success: true });
      });

      const client = testClient(app);

      const response = await client['async-error'].$get();

      expect(response.status).toBe(500);

      expect(sentryMocks.startSpan).toHaveBeenCalled();
      expect(sentryMocks.withScope).not.toHaveBeenCalled();
    });
  });

  describe('request context extraction', () => {
    it('should extract context from various header combinations', async () => {
      const testHeaders = [
        {
          name: 'standard headers',
          headers: {
            'x-request-id': 'req-001',
            'x-trace-id': 'trace-001',
            'user-agent': 'Test-Agent/1.0',
          },
          expectedContext: createTestRequestContext({
            requestId: 'req-001',
            traceId: 'trace-001',
            userAgent: 'Test-Agent/1.0',
          }),
        },
        {
          name: 'minimal headers',
          headers: {
            'user-agent': 'Minimal-Agent',
          },
          expectedContext: createTestRequestContext({
            userAgent: 'Minimal-Agent',
          }),
        },
        {
          name: 'custom correlation headers',
          headers: {
            'x-session-id': 'session-123',
            'x-correlation-id': 'correlation-456',
          },
          expectedContext: createTestRequestContext({
            sessionId: 'session-123',
          }),
        },
      ];

      for (const testCase of testHeaders) {
        const testApp = new Hono();
        helperMocks.extractRequestContext.mockReturnValue(testCase.expectedContext);

        testApp.use(sentryMiddleware());
        testApp.get(`/context-${testCase.name}`, (c) => c.json({ success: true }));

        const client = testClient(testApp);
        await client[`context-${testCase.name}`].$get({
          headers: testCase.headers,
        });

        expect(mockScope.setContext).toHaveBeenCalledWith(
          'request',
          expect.objectContaining({
            id: testCase.expectedContext.requestId,
            traceId: testCase.expectedContext.traceId,
            userAgent: testCase.expectedContext.userAgent,
          }),
        );
      }
    });
  });

  describe('response status handling', () => {
    it('should capture response status in span attributes', async () => {
      const testCases = [
        { route: '/success', status: 200 },
        { route: '/created', status: 201 },
        { route: '/bad-request', status: 400 },
        { route: '/not-found', status: 404 },
        { route: '/server-error', status: 500 },
      ];

      for (const testCase of testCases) {
        const testApp = new Hono();
        testApp.use(sentryMiddleware());
        testApp.get(testCase.route, (c) => {
          return c.json({ message: 'test' }, testCase.status);
        });

        const client = testClient(testApp);
        const response = await client[testCase.route.substring(1)].$get();

        expect(response.status).toBe(testCase.status);
        expect(mockSpan.setAttributes).toHaveBeenCalledWith({
          'http.status_code': testCase.status,
        });
      }
    });
  });
});
