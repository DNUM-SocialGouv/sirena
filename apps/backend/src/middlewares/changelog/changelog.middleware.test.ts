import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '../../features/changelog/changelog.service.js';
import { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import appWithAuth from '../../helpers/factories/appWithAuth.js';
import createChangelogMiddleware from './changelog.middleware.js';

vi.mock('../../features/changelog/changelog.service.js', () => ({
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

  const createEntityTestApp = (action: ChangeLogAction, trackedFields?: string[]) => {
    const changelogMiddleware = createChangelogMiddleware({
      action,
      entity: 'TestEntity',
      getEntityById: () => mockGetEntityById(),
      getEntityId: (c) => c.req.param('id'),
      trackedFields,
    });

    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = {
          warn: vi.fn(),
        };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        c.set('userId', 'user123');
        return next();
      })
      .patch('/:id', changelogMiddleware, async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  describe('createChangelogMiddleware', () => {
    it('should track changes to tracked fields (UPDATED)', async () => {
      const updatedEntity = { ...testEntity, name: 'Updated Name', value: 150 };
      mockGetEntityById.mockResolvedValueOnce(testEntity).mockResolvedValueOnce(updatedEntity);

      const app = createEntityTestApp(ChangeLogAction.UPDATED, ['name', 'value', 'active']);
      const response = await app[':id'].$patch({ param: { id: '1' } });

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

    it('should track changes (UPDATED)', async () => {
      const updatedEntity = { ...testEntity, name: 'Updated Name', value: 150 };
      mockGetEntityById.mockResolvedValueOnce(testEntity).mockResolvedValueOnce(updatedEntity);

      const app = createEntityTestApp(ChangeLogAction.UPDATED);
      const response = await app[':id'].$patch({ param: { id: '1' } });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.UPDATED,
        entity: 'TestEntity',
        entityId: '1',
        changedById: 'user123',
        before: {
          id: testEntity.id,
          name: testEntity.name,
          value: testEntity.value,
          active: testEntity.active,
        },
        after: {
          id: updatedEntity.id,
          name: updatedEntity.name,
          value: updatedEntity.value,
          active: updatedEntity.active,
        },
      });
    });

    it('should track changes to tracked fields (DELETED)', async () => {
      const updatedEntity = { ...testEntity, name: 'Updated Name', value: 150 };
      mockGetEntityById.mockResolvedValueOnce(testEntity).mockResolvedValueOnce(updatedEntity);

      const app = createEntityTestApp(ChangeLogAction.DELETED, ['name', 'value', 'active']);
      const response = await app[':id'].$patch({ param: { id: '1' } });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.DELETED,
        entity: 'TestEntity',
        entityId: '1',
        changedById: 'user123',
        before: {
          id: '1',
          name: testEntity.name,
          value: testEntity.value,
          active: testEntity.active,
        },
        after: null,
      });
    });

    it('should track changes to tracked fields (CREATED)', async () => {
      const updatedEntity = { ...testEntity, name: 'Updated Name', value: 150 };
      mockGetEntityById.mockResolvedValueOnce(testEntity).mockResolvedValueOnce(updatedEntity);

      const app = createEntityTestApp(ChangeLogAction.CREATED, ['name', 'value', 'active']);
      const response = await app[':id'].$patch({ param: { id: '1' } });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.CREATED,
        entity: 'TestEntity',
        entityId: '1',
        changedById: 'user123',
        after: {
          id: '1',
          name: testEntity.name,
          value: testEntity.value,
          active: testEntity.active,
        },
        before: null,
      });
    });

    it('should not create changelog when no changes detected', async () => {
      mockGetEntityById.mockResolvedValueOnce(testEntity);

      const app = createEntityTestApp(ChangeLogAction.UPDATED);
      const response = await app[':id'].$patch({ param: { id: '1' } });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });

    it('should not create changelog when userId is missing', async () => {
      const changelogMiddleware = createChangelogMiddleware({
        action: ChangeLogAction.UPDATED,
        entity: 'TestEntity',
        getEntityById: () => mockGetEntityById(),
        getEntityId: (c) => c.req.param('id'),
        trackedFields: ['name', 'value', 'active'],
      });

      const route = appWithAuth
        .createApp()
        .use((c, next) => {
          const logger = {
            warn: vi.fn(),
          };
          c.set('logger', logger as unknown as PinoLogger);
          return next();
        })
        .patch('/:id', changelogMiddleware, async (c) => {
          return c.json({ ok: true });
        });

      const app = testClient(route);

      const updatedEntity = { ...testEntity, name: 'Updated Name' };
      mockGetEntityById.mockResolvedValueOnce(testEntity).mockResolvedValueOnce(updatedEntity);

      const response = await app[':id'].$patch({ param: { id: '1' } });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });

    it('should not create changelog when entity not found', async () => {
      mockGetEntityById.mockResolvedValue(null);

      const app = createEntityTestApp(ChangeLogAction.UPDATED);
      const response = await app[':id'].$patch({ param: { id: '199' } });

      expect(response.status).toBe(200);
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });
  });
});
