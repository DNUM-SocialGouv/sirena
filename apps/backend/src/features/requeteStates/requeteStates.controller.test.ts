import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasAccessToRequete } from '@/features/requetesEntite/requetesEntite.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import type { RequeteState } from '@/libs/prisma';
import { convertDatesToStrings } from '@/tests/formatter';
import RequeteStatesController from './requeteStates.controller';
import { addNote, getRequeteStateById, updateRequeteStateStatut } from './requeteStates.service';

const fakeRequeteState: RequeteState = {
  id: 'step1',
  requeteEntiteId: 'requeteEntiteId',
  stepName: 'Test Step',
  statutId: 'A_FAIRE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeUpdatedRequeteState: RequeteState = {
  ...fakeRequeteState,
  statutId: 'EN_COURS',
  updatedAt: new Date(),
};

vi.mock('./requeteStates.service', () => ({
  getRequeteStateById: vi.fn(() => Promise.resolve(fakeRequeteState)),
  updateRequeteStateStatut: vi.fn(() => Promise.resolve(fakeUpdatedRequeteState)),
  addNote: vi.fn(),
}));

vi.mock('@/features/requetesEntite/requetesEntite.service', () => ({
  hasAccessToRequete: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('userId', 'test-user-id');
      return next();
    },
  };
});

vi.mock('@/middlewares/role.middleware', () => {
  return {
    default: () => {
      return (c: Context, next: Next) => {
        c.set('roleId', 'ENTITY_ADMIN');
        return next();
      };
    },
  };
});

vi.mock('@/middlewares/entites.middleware', () => {
  return {
    default: vi.fn((c: Context, next: Next) => {
      c.set('entiteIds', ['e1', 'e2', 'e3']);
      return next();
    }),
  };
});

vi.mock('@/middlewares/changelog/changelog.requeteStep.middleware', () => {
  return {
    default: () => (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('@/helpers/errors', () => ({
  errorHandler: vi.fn((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    return c.json({ message: 'Internal server error' }, 500);
  }),
}));

describe('requeteStates.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequeteStatesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /:id/statut', () => {
    it('should update the statut of a RequeteState', async () => {
      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeUpdatedRequeteState),
      });
      expect(updateRequeteStateStatut).toHaveBeenCalledWith('step1', { statutId: 'EN_COURS' });
    });

    it('should return 404 if RequeteState not found', async () => {
      vi.mocked(getRequeteStateById).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteState not found',
      });
      expect(updateRequeteStateStatut).not.toHaveBeenCalled();
    });

    it('should return 404 if update fails', async () => {
      vi.mocked(updateRequeteStateStatut).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteState not found',
      });
    });

    it('should return 401 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockImplementationOnce(() => Promise.resolve(false));

      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete state',
      });
      expect(updateRequeteStateStatut).not.toHaveBeenCalled();
    });

    it('should validate the request body', async () => {
      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'INVALID_STATUS' as never },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /:id/note', () => {
    it('should add a note to a processing step', async () => {
      const fakeData = {
        createdAt: new Date(),
        id: 'note1',
        requeteEntiteStateId: 'step1',
        content: 'test',
        updatedAt: new Date(),
        authorId: 'test-user-id',
      };
      vi.mocked(addNote).mockResolvedValueOnce(fakeData);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { content: 'test' },
      });

      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeData),
      });
      expect(addNote).toHaveBeenCalledWith({ requeteEntiteStateId: 'step1', content: 'test', userId: 'test-user-id' });
    });

    it('should return 404 if RequeteState not found', async () => {
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(null);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { content: 'test' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteState not found',
      });
      expect(addNote).not.toHaveBeenCalled();
    });

    it('should return 401 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { content: 'test' },
      });

      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete state',
      });
      expect(addNote).not.toHaveBeenCalled();
    });
  });
});
