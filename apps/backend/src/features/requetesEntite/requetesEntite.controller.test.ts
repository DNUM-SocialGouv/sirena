import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { addProcessingState, getRequeteStates } from '@/features/requeteStates/requeteStates.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import pinoLogger from '@/middlewares/pino.middleware';
import { convertDatesToStrings } from '@/tests/formatter';
import RequetesEntiteController from './requetesEntite.controller';
import { getRequetesEntite, hasAccessToRequete } from './requetesEntite.service';

vi.mock('./requetesEntite.service', () => ({
  getRequetesEntite: vi.fn(),
  hasAccessToRequete: vi.fn(),
}));

vi.mock('@/features/requeteStates/requeteStates.service', () => ({
  addProcessingState: vi.fn(),
  getRequeteStates: vi.fn(),
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('userId', 'id1');
      return next();
    },
  };
});

vi.mock('@/middlewares/userStatus.middleware', () => {
  return {
    default: (_: Context, next: Next) => {
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
    default: (c: Context, next: Next) => {
      c.set('entiteIds', ['e1', 'e2']);
      return next();
    },
  };
});

vi.mock('@/middlewares/changelog/changelog.requeteStep.middleware', () => {
  return {
    default: () => (_c: Context, next: Next) => {
      return next();
    },
  };
});

describe('RequetesEntite endpoints: /', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequetesEntiteController).onError(errorHandler);
  const client = testClient(app);

  const fakeData = [
    {
      id: 'r1',
      number: 123,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      requeteId: 'q1',
      requete: {
        id: 'q1',
        number: 111,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        dematSocialId: 321,
      },
      requetesEntiteStates: [],
    },
  ];

  describe('GET /', () => {
    it('should return requetesEntite with basic query', async () => {
      vi.mocked(getRequetesEntite).mockResolvedValueOnce({ data: fakeData, total: 1 });

      const res = await client.index.$get({
        query: {},
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings(fakeData),
        meta: { total: 1 },
      });

      expect(getRequetesEntite).toHaveBeenCalledWith(null, {});
    });

    it('should return meta with offset and limit', async () => {
      vi.mocked(getRequetesEntite).mockResolvedValueOnce({ data: fakeData, total: 1 });

      const res = await client.index.$get({
        query: { offset: '5', limit: '10' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings(fakeData),
        meta: { offset: 5, limit: 10, total: 1 },
      });

      expect(getRequetesEntite).toHaveBeenCalledWith(null, { offset: 5, limit: 10 });
    });
  });

  describe('GET /:id/processing-steps', () => {
    it('should return processing steps for a requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fakeSteps = [
        {
          id: 'step1',
          requeteEntiteId: '1',
          stepName: 'Step 1',
          statutId: 'FAIT',
          notes: [],
          createdAt: new Date(0),
          updatedAt: new Date(0),
        },
        {
          id: 'step2',
          requeteEntiteId: '1',
          stepName: 'Step 2',
          statutId: 'FAIT',
          notes: [],
          createdAt: new Date(0),
          updatedAt: new Date(0),
        },
      ];
      vi.mocked(getRequeteStates).mockResolvedValueOnce({ data: fakeSteps, total: 2 });

      const res = await client[':id']['processing-steps'].$get({
        param: { id: '1' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings(fakeSteps),
        meta: { total: 2 },
      });

      expect(getRequeteStates).toHaveBeenCalledWith('1', {});
    });

    it('should return 404 if requete does not exist', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id']['processing-steps'].$get({
        param: { id: 'nonexistent' },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requete entite not found' });
    });
  });

  describe('POST /:id/processing-steps', () => {
    it('should add a processing step', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fakeStep = {
        id: 'step1',
        requeteEntiteId: '1',
        stepName: 'Step 1',
        statutId: 'FAIT',
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };

      vi.mocked(addProcessingState).mockResolvedValueOnce(fakeStep);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { stepName: 'Step 1' },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(fakeStep) });
      expect(addProcessingState).toHaveBeenCalledWith('1', { stepName: 'Step 1' });
    });

    it('should return 404 if requete does not exist', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: 'nonexistent' },
        json: { stepName: 'Step 1' },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requete entite not found' });
    });

    it('should return 404 if step is not created', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      vi.mocked(addProcessingState).mockResolvedValueOnce(null);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { stepName: 'Step 1' },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requete entite not found' });
      expect(addProcessingState).toHaveBeenCalledWith('1', { stepName: 'Step 1' });
    });
  });
});
