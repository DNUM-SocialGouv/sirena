import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import pinoLogger from '../../middlewares/pino.middleware.js';
import SirecMigrationController from './sirecMigration.controller.js';

vi.mock('../../config/env.js', () => ({ envVars: {} }));

vi.mock('../../jobs/queues/sirecMigration.queue.js', () => ({
  addSirecIdsToQueue: addSirecIdsToQueueSpy,
}));

vi.mock('./sirecMigration.repository.js', () => ({
  fetchExistingSirecIds: fetchExistingSirecIdsSpy,
  fetchSirecIdsByServiceIds: fetchSirecIdsByServiceIdsSpy,
}));

vi.mock('../../middlewares/auth.middleware.js', () => ({
  default: async (c: Context, next: Next) => {
    c.set('userId', 'user-1');
    return next();
  },
}));

vi.mock('../../middlewares/userStatus.middleware.js', () => ({
  default: (_: Context, next: Next) => next(),
}));

const { addSirecIdsToQueueSpy, fetchExistingSirecIdsSpy, fetchSirecIdsByServiceIdsSpy, currentRole } = vi.hoisted(
  () => ({
    addSirecIdsToQueueSpy: vi.fn(),
    fetchExistingSirecIdsSpy: vi.fn(),
    fetchSirecIdsByServiceIdsSpy: vi.fn(),
    currentRole: { value: 'SUPER_ADMIN' as string },
  }),
);

vi.mock('../../middlewares/role.middleware.js', () => ({
  default: (roles: string[]) => async (c: Context, next: Next) => {
    if (!roles.includes(currentRole.value)) return c.json({ message: 'Forbidden' }, 403);
    return next();
  },
}));

describe('SirecMigration controller', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', SirecMigrationController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    currentRole.value = 'SUPER_ADMIN';
  });

  describe('POST /by-reclamations', () => {
    it('should return 403 without SUPER_ADMIN role', async () => {
      currentRole.value = 'WRITER';
      const res = await client['by-reclamations'].$post({ json: { sirecIds: [1, 2, 3] } });
      expect(res.status).toBe(403);
      expect(addSirecIdsToQueueSpy).not.toHaveBeenCalled();
    });

    it('should push ids to queue and return queued count when all ids exist', async () => {
      fetchExistingSirecIdsSpy.mockResolvedValue([1, 2, 3]);
      addSirecIdsToQueueSpy.mockResolvedValue(3);
      const res = await client['by-reclamations'].$post({ json: { sirecIds: [1, 2, 3] } });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ queued: 3 });
      expect(addSirecIdsToQueueSpy).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should return 422 with unknown ids when some do not exist in SIREC', async () => {
      fetchExistingSirecIdsSpy.mockResolvedValue([1, 3]);
      const res = await client['by-reclamations'].$post({ json: { sirecIds: [1, 2, 3] } });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body).toEqual({ unknownIds: [2] });
      expect(addSirecIdsToQueueSpy).not.toHaveBeenCalled();
    });

    it('should return 422 with all ids when none exist in SIREC', async () => {
      fetchExistingSirecIdsSpy.mockResolvedValue([]);
      const res = await client['by-reclamations'].$post({ json: { sirecIds: [99, 100] } });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body).toEqual({ unknownIds: [99, 100] });
      expect(addSirecIdsToQueueSpy).not.toHaveBeenCalled();
    });

    it('should return 400 with invalid body (empty array)', async () => {
      const res = await client['by-reclamations'].$post({ json: { sirecIds: [] } });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /by-services', () => {
    it('should return 403 without SUPER_ADMIN role', async () => {
      currentRole.value = 'ENTITY_ADMIN';
      const res = await client['by-services'].$post({ json: { serviceIds: [10] } });
      expect(res.status).toBe(403);
    });

    it('should fetch ids from services, push to queue and return counts', async () => {
      fetchSirecIdsByServiceIdsSpy.mockResolvedValue([100, 101, 102]);
      addSirecIdsToQueueSpy.mockResolvedValue(3);

      const res = await client['by-services'].$post({ json: { serviceIds: [10, 20] } });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ queued: 3, found: 3 });
      expect(fetchSirecIdsByServiceIdsSpy).toHaveBeenCalledWith([10, 20]);
      expect(addSirecIdsToQueueSpy).toHaveBeenCalledWith([100, 101, 102]);
    });

    it('should return 400 with invalid body (empty array)', async () => {
      const res = await client['by-services'].$post({ json: { serviceIds: [] } });
      expect(res.status).toBe(400);
    });
  });
});
