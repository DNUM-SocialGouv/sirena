import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccessLog } from '../../features/accessLog/accessLog.service.js';
import { AccessLogAction } from '../../features/accessLog/accessLog.type.js';
import appWithAuth from '../../helpers/factories/appWithAuth.js';
import createAccessLogMiddleware from './accessLog.middleware.js';

vi.mock('../../features/accessLog/accessLog.service.js', () => ({
  createAccessLog: vi.fn(),
}));

describe('accessLog.middleware.ts', () => {
  const mockCreateAccessLog = vi.mocked(createAccessLog);
  const mockLoggerWarn = vi.fn();
  const mockLoggerError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createTestApp = ({ withUser = true, handlerStatus = 200 } = {}) => {
    const accessLogMiddleware = createAccessLogMiddleware({
      entity: 'Requete',
      action: AccessLogAction.EXPORT_ENTITY_PDF,
    });

    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = {
          warn: mockLoggerWarn,
          error: mockLoggerError,
        };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        if (withUser) {
          c.set('userId', 'user123');
        }
        return next();
      })
      .get('/:id/export-pdf', accessLogMiddleware, async (c) => {
        c.header('x-request-id', 'request-123');
        if (handlerStatus !== 200) {
          return c.json({ message: 'Not found' }, 404);
        }
        c.set('accessLogDataKeys', ['declarant.identite.nom']);
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  it('should create an access log on successful access', async () => {
    const app = createTestApp();
    const response = await app[':id']['export-pdf'].$get({ param: { id: 'requete-1' } });

    expect(response.status).toBe(200);
    expect(mockCreateAccessLog).toHaveBeenCalledWith({
      entity: 'Requete',
      entityId: 'requete-1',
      action: AccessLogAction.EXPORT_ENTITY_PDF,
      userId: 'user123',
      requestId: 'request-123',
      path: '/:id/export-pdf',
      dataKeys: ['declarant.identite.nom'],
    });
  });

  it('should not create an access log when the request fails', async () => {
    const app = createTestApp({ handlerStatus: 404 });
    const response = await app[':id']['export-pdf'].$get({ param: { id: 'requete-1' } });

    expect(response.status).toBe(404);
    expect(mockCreateAccessLog).not.toHaveBeenCalled();
  });

  it('should not fail the request when the access log insert fails', async () => {
    mockCreateAccessLog.mockRejectedValueOnce(new Error('db down'));

    const app = createTestApp();
    const response = await app[':id']['export-pdf'].$get({ param: { id: 'requete-1' } });

    expect(response.status).toBe(200);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('should log the access with a null userId when no user is set', async () => {
    const app = createTestApp({ withUser: false });
    const response = await app[':id']['export-pdf'].$get({ param: { id: 'requete-1' } });

    expect(response.status).toBe(200);
    expect(mockCreateAccessLog).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
    expect(mockLoggerWarn).toHaveBeenCalled();
  });

  it('should log an empty dataKeys list when the handler does not provide any', async () => {
    const accessLogMiddleware = createAccessLogMiddleware({
      entity: 'Requete',
      action: AccessLogAction.EXPORT_ENTITY_PDF,
    });

    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('logger', { warn: mockLoggerWarn, error: mockLoggerError } as unknown as PinoLogger);
        c.set('userId', 'user123');
        return next();
      })
      .get('/:id/export-pdf', accessLogMiddleware, async (c) => c.json({ ok: true }));

    const app = testClient(route);
    const response = await app[':id']['export-pdf'].$get({ param: { id: 'requete-1' } });

    expect(response.status).toBe(200);
    expect(mockCreateAccessLog).toHaveBeenCalledWith(expect.objectContaining({ dataKeys: [] }));
  });

  it('should warn and skip when no entity ID is resolved', async () => {
    const accessLogMiddleware = createAccessLogMiddleware({
      entity: 'Requete',
      action: AccessLogAction.EXPORT_ENTITY_PDF,
      getEntityId: () => null,
    });

    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('logger', { warn: mockLoggerWarn, error: mockLoggerError } as unknown as PinoLogger);
        c.set('userId', 'user123');
        return next();
      })
      .get('/:id/export-pdf', accessLogMiddleware, async (c) => c.json({ ok: true }));

    const app = testClient(route);
    const response = await app[':id']['export-pdf'].$get({ param: { id: 'requete-1' } });

    expect(response.status).toBe(200);
    expect(mockLoggerWarn).toHaveBeenCalled();
    expect(mockCreateAccessLog).not.toHaveBeenCalled();
  });
});
