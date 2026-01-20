import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '../../features/changelog/changelog.service.js';
import { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getRequeteEtapeById } from '../../features/requeteEtapes/requetesEtapes.service.js';
import appWithAuth from '../../helpers/factories/appWithAuth.js';
import type { RequeteEtape } from '../../libs/prisma.js';
import requeteEtapesChangelogMiddleware from './changelog.requeteEtape.middleware.js';

vi.mock('../../features/changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('../../features/requeteEtapes/requetesEtapes.service.js', () => ({
  getRequeteEtapeById: vi.fn(),
}));

describe('changelog.requeteEtapes.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetRequeteEtapeById = vi.mocked(getRequeteEtapeById);

  const testRequeteEtape: RequeteEtape = {
    id: 'rs-1',
    requeteId: 'requete-1',
    entiteId: 'entite-1',
    nom: 'Initial Step',
    statutId: 'EN_ATTENTE',
    estPartagee: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    clotureReasonId: null,
    createdById: 'user-1',
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createRequeteEtapeTestAppWithParams = () => {
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
      .patch('/:id', requeteEtapesChangelogMiddleware({ action: ChangeLogAction.UPDATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createRequeteEtapeTestAppWithContext = () => {
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
      .patch('/', requeteEtapesChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        c.set('changelogId', 'rs-2');
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createRequeteEtapeTestWithNoId = () => {
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
      .patch('/', requeteEtapesChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  describe('requeteEtapesChangelogMiddleware', () => {
    it('should track changes to RequeteEtape fields with params', async () => {
      const updatedRequeteEtape = { ...testRequeteEtape, nom: 'Updated Step', statutId: 'EN_COURS' };

      mockGetRequeteEtapeById.mockResolvedValueOnce(testRequeteEtape).mockResolvedValueOnce(updatedRequeteEtape);

      const app = createRequeteEtapeTestAppWithParams();

      const response = await app[':id'].$patch({
        param: { id: 'rs-1' },
      });

      expect(response.status).toBe(200);
      expect(mockGetRequeteEtapeById).toHaveBeenCalledWith('rs-1');
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.UPDATED,
        entity: 'RequeteEtape',
        entityId: 'rs-1',
        changedById: 'user123',
        before: {
          nom: testRequeteEtape.nom,
          statutId: testRequeteEtape.statutId,
        },
        after: {
          nom: updatedRequeteEtape.nom,
          statutId: updatedRequeteEtape.statutId,
        },
      });
    });

    it('should track changes to RequeteEtape fields with context', async () => {
      mockGetRequeteEtapeById.mockResolvedValueOnce(testRequeteEtape);

      const app = createRequeteEtapeTestAppWithContext();

      await app.index.$patch();

      expect(mockGetRequeteEtapeById).toHaveBeenCalledWith('rs-2');
    });

    it('should handle entity not found', async () => {
      mockGetRequeteEtapeById.mockResolvedValueOnce(null);

      const app = createRequeteEtapeTestWithNoId();

      const response = await app.index.$patch({
        param: { id: 'non-existent-id' },
      });

      expect(response.status).toBe(200);
      expect(mockGetRequeteEtapeById).not.toHaveBeenCalled();
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });
  });
});
