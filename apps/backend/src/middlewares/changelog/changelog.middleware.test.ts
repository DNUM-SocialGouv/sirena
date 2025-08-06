import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import createChangelogMiddleware from '@/middlewares/changelog/changelog.middleware';
import { createTestApp } from '@/tests/test-utils';

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

describe('changelog.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetEntityById = vi.fn();

  const testEntity = {
    id: '1',
    name: 'Test Entity',
    value: 100,
    active: true,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createEntityTestApp = () => {
    const changelogMiddleware = createChangelogMiddleware({
      entity: 'TestEntity',
      getEntityById: () => mockGetEntityById(),
      getEntityId: (c) => c.req.param('id'),
      trackedFields: ['name', 'value', 'active'],
    });

    return createTestApp([
      async (c, next) => {
        c.set('userId', 'user123');
        await next();
      },
    ]).patch('/entities/:id', changelogMiddleware, async (c) => {
      return c.json({ success: true });
    });
  };

  describe('createChangelogMiddleware', () => {
    it('should track changes to tracked fields', async () => {
      const updatedEntity = { ...testEntity, name: 'Updated Name', value: 150 };
      mockGetEntityById.mockResolvedValueOnce(testEntity).mockResolvedValueOnce(updatedEntity);

      const app = createEntityTestApp();
      const response = await app.request('/entities/1', { method: 'PATCH' });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.UPDATED,
        entity: 'TestEntity',
        entityId: '1',
        changedById: 'user123',
        before: {
          name: testEntity.name,
          value: testEntity.value,
          active: testEntity.active,
        },
        after: {
          name: updatedEntity.name,
          value: updatedEntity.value,
          active: updatedEntity.active,
        },
      });
    });

    it('should not create changelog when no changes detected', async () => {
      mockGetEntityById.mockResolvedValue(testEntity);

      const app = createEntityTestApp();
      const response = await app.request('/entities/1', { method: 'PATCH' });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });

    it('should not create changelog when userId is missing', async () => {
      const changelogMiddleware = createChangelogMiddleware({
        entity: 'TestEntity',
        getEntityById: () => mockGetEntityById(),
        getEntityId: (c) => c.req.param('id'),
        trackedFields: ['name', 'value', 'active'],
      });

      const app = createTestApp().patch('/entities/:id', changelogMiddleware, async (c) => {
        return c.json({ success: true });
      });

      const updatedEntity = { ...testEntity, name: 'Updated Name' };
      mockGetEntityById.mockResolvedValueOnce(testEntity).mockResolvedValueOnce(updatedEntity);

      const response = await app.request('/entities/1', { method: 'PATCH' });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });

    it('should not create changelog when entity not found', async () => {
      mockGetEntityById.mockResolvedValue(null);

      const app = createEntityTestApp();
      const response = await app.request('/entities/999', { method: 'PATCH' });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });
  });
});
