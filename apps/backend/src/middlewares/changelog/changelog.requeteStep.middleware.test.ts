import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getRequeteStateById } from '@/features/requeteStates/requeteStates.service';
import appWithAuth from '@/helpers/factories/appWithAuth';
import requeteStatesChangelogMiddleware from './changelog.requeteStep.middleware';

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('@/features/requeteStates/requeteStates.service', () => ({
  getRequeteStateById: vi.fn(),
}));

describe('changelog.requeteStates.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetRequeteStateById = vi.mocked(getRequeteStateById);

  const testRequeteState = {
    id: 'rs-1',
    requeteEntiteId: 'requete-1',
    stepName: 'Initial Step',
    statutId: 'EN_ATTENTE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createRequeteStateTestAppWithParams = () => {
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
      .patch('/:id', requeteStatesChangelogMiddleware({ action: ChangeLogAction.UPDATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createRequeteStateTestAppWithContext = () => {
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
      .patch('/', requeteStatesChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        c.set('changelogId', 'rs-2');
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createRequeteStateTestWithNoId = () => {
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
      .patch('/', requeteStatesChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  describe('requeteStatesChangelogMiddleware', () => {
    it('should track changes to RequeteState fields with params', async () => {
      const updatedRequeteState = { ...testRequeteState, stepName: 'Updated Step', statutId: 'EN_COURS' };

      mockGetRequeteStateById.mockResolvedValueOnce(testRequeteState).mockResolvedValueOnce(updatedRequeteState);

      const app = createRequeteStateTestAppWithParams();

      const response = await app[':id'].$patch({
        param: { id: 'rs-1' },
      });

      expect(response.status).toBe(200);
      expect(mockGetRequeteStateById).toHaveBeenCalledWith('rs-1');
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.UPDATED,
        entity: 'RequeteState',
        entityId: 'rs-1',
        changedById: 'user123',
        before: {
          stepName: testRequeteState.stepName,
          statutId: testRequeteState.statutId,
        },
        after: {
          stepName: updatedRequeteState.stepName,
          statutId: updatedRequeteState.statutId,
        },
      });
    });

    it('should track changes to RequeteState fields with context', async () => {
      mockGetRequeteStateById.mockResolvedValueOnce(testRequeteState);

      const app = createRequeteStateTestAppWithContext();

      await app.index.$patch();

      expect(mockGetRequeteStateById).toHaveBeenCalledWith('rs-2');
    });

    it('should handle entity not found', async () => {
      mockGetRequeteStateById.mockResolvedValueOnce(null);

      const app = createRequeteStateTestWithNoId();

      const response = await app.index.$patch({
        param: { id: 'non-existent-id' },
      });

      expect(response.status).toBe(200);
      expect(mockGetRequeteStateById).not.toHaveBeenCalled();
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });
  });
});
