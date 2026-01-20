import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import pinoLogger from '../../middlewares/pino.middleware.js';
import RolesController from './roles.controller.js';
import { getRoles } from './roles.service.js';

vi.mock('./roles.service.js', () => ({
  getRoles: vi.fn(),
}));

vi.mock('../../config/env.js', () => ({
  envVars: {},
}));

vi.mock('../../middlewares/auth.middleware.js', () => {
  return {
    default: (_c: Context, next: () => Promise<Next>) => {
      return next();
    },
  };
});

vi.mock('../../middlewares/userStatus.middleware.js', () => {
  return {
    default: (_: Context, next: Next) => {
      return next();
    },
  };
});

describe('Roles endpoints: /roles', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RolesController).onError(errorHandler);
  const client = testClient(app);

  describe('GET /', () => {
    it('should return a list of Roles', async () => {
      const fakeData = [
        {
          id: 'PENDING',
          label: 'pending',
        },
      ];

      vi.mocked(getRoles).mockResolvedValueOnce(fakeData);

      const res = await client.index.$get();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: fakeData });
    });
  });
});
