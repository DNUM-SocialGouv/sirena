import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { getEntiteAscendanteInfo } from '../features/entites/entites.service.js';
import { getUserEntities } from '../features/users/users.service.js';
import { errorHandler } from '../helpers/errors.js';
import appWithAuth from '../helpers/factories/appWithAuth.js';
import appWithLogs from '../helpers/factories/appWithLogs.js';
import entitesMiddleware from './entites.middleware.js';

vi.mock('../features/users/users.service.js', () => ({
  getUserEntities: vi.fn(),
}));

vi.mock('../features/entites/entites.service.js', () => ({
  getEntiteAscendanteInfo: vi.fn(),
}));

describe('entite.middleware.ts', () => {
  it('should fetch and attach entiteIds to context', async () => {
    const mockUserId = 'user-123';
    const mockEntiteIds = ['e1', 'e2'];

    vi.mocked(getUserEntities).mockResolvedValueOnce(mockEntiteIds);

    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('userId', mockUserId);
        return next();
      })
      .use(entitesMiddleware)
      .get('/', (c) => {
        const entiteIds = c.get('entiteIds');
        return c.json({ entiteIds });
      });

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);
    const client = testClient(app);

    const res = await client.test.$get();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entiteIds).toEqual(mockEntiteIds);
  });

  it('should fetch and attach topEntiteId to context', async () => {
    const mockUserId = 'user-123';
    const mockTopEntiteId = 'e1';

    vi.mocked(getUserEntities).mockResolvedValueOnce(['e1']);
    vi.mocked(getEntiteAscendanteInfo).mockResolvedValueOnce({ entiteId: 'e1', level: 1 });

    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('userId', mockUserId);
        return next();
      })
      .use(entitesMiddleware)
      .get('/', (c) => {
        const topEntiteId = c.get('topEntiteId');
        return c.json({ topEntiteId });
      });

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);
    const client = testClient(app);

    const res = await client.test.$get();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.topEntiteId).toEqual(mockTopEntiteId);
  });

  it('should keep entiteIds as null for super admins (not default to empty array)', async () => {
    const mockUserId = 'super-admin-123';

    vi.mocked(getUserEntities).mockResolvedValueOnce(null);

    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('userId', mockUserId);
        return next();
      })
      .use(entitesMiddleware)
      .get('/', (c) => {
        const entiteIds = c.get('entiteIds');
        return c.json({ entiteIds, isNull: entiteIds === null });
      });

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);
    const client = testClient(app);

    const res = await client.test.$get();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entiteIds).toBeNull();
    expect(json.isNull).toBe(true);
  });
});
