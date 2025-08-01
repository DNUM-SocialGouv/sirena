import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import pinoLogger from '@/middlewares/pino.middleware';
import RolesController from './roles.controller';
import { getRoles } from './roles.service';

vi.mock('./roles.service', () => ({
  getRoles: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  envVars: {},
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (_c: Context, next: () => Promise<Next>) => {
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
