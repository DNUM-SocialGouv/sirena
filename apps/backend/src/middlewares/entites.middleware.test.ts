import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { getUserEntities } from '@/features/users/users.service';
import { errorHandler } from '@/helpers/errors';
import appWithAuth from '@/helpers/factories/appWithAuth';
import appWithLogs from '@/helpers/factories/appWithLogs';
import entitesMiddleware from '@/middlewares/entites.middleware';

vi.mock('@/features/users/users.service', () => ({
  getUserEntities: vi.fn(),
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
});
