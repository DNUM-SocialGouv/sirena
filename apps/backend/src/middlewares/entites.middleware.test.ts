import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { entiteAscendanteInfoCache } from '../features/entites/entites.cache.js';
import { getUserEntiteContext } from '../features/users/users.service.js';
import { errorHandler } from '../helpers/errors.js';
import appWithAuth from '../helpers/factories/appWithAuth.js';
import appWithLogs from '../helpers/factories/appWithLogs.js';
import { prisma } from '../libs/prisma.js';
import entitesMiddleware from './entites.middleware.js';

vi.mock('../features/users/users.service.js', () => ({
  getUserEntiteContext: vi.fn(),
}));

vi.mock('../libs/prisma.js', () => ({
  prisma: {
    entite: {
      findUnique: vi.fn(),
    },
  },
}));

const mockEntiteMeres = (entiteMereIds: Record<string, string | null>) => {
  vi.mocked(prisma.entite.findUnique).mockImplementation((async (args: { where: { id: string } }) =>
    args.where.id in entiteMereIds ? { entiteMereId: entiteMereIds[args.where.id] } : null) as never);
};

describe('entite.middleware.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    entiteAscendanteInfoCache.clear();
  });

  it('should fetch and attach entiteIds to context', async () => {
    const mockUserId = 'user-123';
    const mockEntiteIds = ['e1', 'e2'];

    vi.mocked(getUserEntiteContext).mockResolvedValueOnce({ assignedEntiteId: 'e1', entiteIds: mockEntiteIds });
    mockEntiteMeres({ e1: null });

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

    vi.mocked(getUserEntiteContext).mockResolvedValueOnce({ assignedEntiteId: 'e1', entiteIds: ['e1'] });
    mockEntiteMeres({ e1: null });

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

  it('should attach assignedEntiteId from the user entity context', async () => {
    const mockUserId = 'user-123';

    vi.mocked(getUserEntiteContext).mockResolvedValueOnce({
      assignedEntiteId: 'dir-autonomie',
      entiteIds: ['dir-autonomie', 'service-pa'],
    });
    mockEntiteMeres({ 'dir-autonomie': 'root-ars', 'root-ars': null });

    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('userId', mockUserId);
        return next();
      })
      .use(entitesMiddleware)
      .get('/', (c) => {
        const assignedEntiteId = c.get('assignedEntiteId');
        const entiteIds = c.get('entiteIds');
        return c.json({ assignedEntiteId, entiteIds });
      });

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);
    const client = testClient(app);

    const res = await client.test.$get();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ assignedEntiteId: 'dir-autonomie', entiteIds: ['dir-autonomie', 'service-pa'] });
    expect(getUserEntiteContext).toHaveBeenCalledWith(mockUserId);
  });

  it('should keep entiteIds as null for super admins (not default to empty array)', async () => {
    const mockUserId = 'super-admin-123';

    vi.mocked(getUserEntiteContext).mockResolvedValueOnce({ assignedEntiteId: null, entiteIds: null });

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

  it("ne remonte la hiérarchie qu'une seule fois pour deux requêtes successives du même agent", async () => {
    vi.mocked(getUserEntiteContext).mockResolvedValue({
      assignedEntiteId: 'service-pa',
      entiteIds: ['service-pa'],
    });
    mockEntiteMeres({ 'service-pa': 'dir-autonomie', 'dir-autonomie': 'root-ars', 'root-ars': null });

    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('userId', 'user-123');
        return next();
      })
      .use(entitesMiddleware)
      .get('/', (c) => c.json({ topEntiteId: c.get('topEntiteId'), entiteIdLevel: c.get('entiteIdLevel') }));

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);
    const client = testClient(app);

    const first = await client.test.$get();
    const second = await client.test.$get();

    const expected = { topEntiteId: 'root-ars', entiteIdLevel: 3 };
    expect(await first.json()).toEqual(expected);
    expect(await second.json()).toEqual(expected);
    expect(prisma.entite.findUnique).toHaveBeenCalledTimes(3);
  });
});
