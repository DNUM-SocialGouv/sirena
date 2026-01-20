import { ROLES } from '@sirena/common/constants';
import { testClient } from 'hono/testing';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../helpers/errors.js';
import appWithAuth from '../helpers/factories/appWithAuth.js';
import appWithLogs from '../helpers/factories/appWithLogs.js';
import roleMiddleware from './role.middleware.js';

describe('role.middleware.ts', () => {
  it('should handle role verification logic', async () => {
    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('roleId', ROLES.SUPER_ADMIN);
        return next();
      })
      .use(roleMiddleware([ROLES.SUPER_ADMIN]))
      .get('/', async (c) => c.json({ ok: true }));

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);

    const client = testClient(app);

    const res = await client.test.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('should handle role verification failure not the good role', async () => {
    const route = appWithAuth
      .createApp()
      .use((c, next) => {
        c.set('roleId', ROLES.PENDING);
        return next();
      })
      .use(roleMiddleware([ROLES.SUPER_ADMIN]))
      .get('/', async (c) => c.json({ ok: true }));

    const app = appWithLogs.createApp().route('/test', route).onError(errorHandler);

    const client = testClient(app);

    const res = await client.test.$get();
    expect(res.status).toBe(403);

    const body = await res.json();

    if ('message' in body) {
      expect(body.message).toBe('Forbidden, you do not have the required role to access this resource');
    } else {
      throw new Error('Expected error message in response');
    }
  });
});
