import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import { addProcessingEtape, getRequeteEtapes } from '@/features/requeteEtapes/requetesEtapes.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import type { Requete, RequeteEntite, RequeteEtape, RequeteEtapeNote, UploadedFile } from '@/libs/prisma';
import pinoLogger from '@/middlewares/pino.middleware';
import { convertDatesToStrings } from '@/tests/formatter';
import RequetesEntiteController from './requetesEntite.controller';
import { getRequetesEntite, hasAccessToRequete } from './requetesEntite.service';

vi.mock('./requetesEntite.service', () => ({
  getRequetesEntite: vi.fn(),
  hasAccessToRequete: vi.fn(),
}));

vi.mock('@/features/requeteEtapes/requetesEtapes.service', () => ({
  addProcessingEtape: vi.fn(),
  getRequeteEtapes: vi.fn(),
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

vi.mock('@/middlewares/changelog/changelog.requeteEtape.middleware', () => {
  return {
    default: () => (_c: Context, next: Next) => {
      return next();
    },
  };
});

describe('RequetesEntite endpoints: /', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequetesEntiteController).onError(errorHandler);
  const client = testClient(app);

  const fakeData: (RequeteEntite & { requete: Requete; requeteEtape: RequeteEtape[] })[] = [
    {
      requeteId: 'r1',
      entiteId: 'e1',
      requete: {
        id: 'r1',
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Commentaire',
        receptionDate: new Date(),
        dematSocialId: 123,
        receptionTypeId: 'receptionTypeId',
      },
      requeteEtape: [],
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
    const requeteEtape: RequeteEtape = {
      id: 'requeteEtapeId',
      requeteId: 'requeteId',
      entiteId: 'entiteId',
      nom: 'Etape 1',
      estPartagee: false,
      statutId: 'A_FAIRE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const note = {
      id: 'noteId',
      texte: 'Note 1',
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: 'authorId',
      requeteEtapeId: 'requeteEtapeId',
    };

    const uploadedFile: Pick<UploadedFile, 'id' | 'size' | 'metadata' | 'filePath'> = {
      id: 'uploadedFileId',
      size: 1024,
      metadata: null,
      filePath: 'path/to/file1.pdf',
    };

    const requeteEtapeWithNotesAndFiles: RequeteEtape & {
      notes: (RequeteEtapeNote & {
        author: { prenom: string; nom: string };
        uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[];
      })[];
    } = {
      ...requeteEtape,
      notes: [
        {
          ...note,
          author: { prenom: 'John', nom: 'Doe' },
          uploadedFiles: [uploadedFile],
        },
      ],
    };

    it('should return processing steps for a requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      vi.mocked(getRequeteEtapes).mockResolvedValueOnce({ data: [requeteEtapeWithNotesAndFiles], total: 2 });

      const res = await client[':id']['processing-steps'].$get({
        param: { id: '1' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings([requeteEtapeWithNotesAndFiles]),
        meta: { total: 2 },
      });

      expect(getRequeteEtapes).toHaveBeenCalledWith('1', ['e1', 'e2'], {});
    });
  });

  describe('POST /:id/processing-steps', () => {
    it('should add a processing step', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fakeStep = {
        id: 'step1',
        requeteEntiteId: '1',
        nom: 'Step 1',
        statutId: 'FAIT',
        createdAt: new Date(0),
        updatedAt: new Date(0),
        entiteId: 'e1',
        requeteId: '1',
        estPartagee: false,
      };

      vi.mocked(addProcessingEtape).mockResolvedValueOnce(fakeStep);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { nom: 'Step 1' },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(fakeStep) });
      expect(addProcessingEtape).toHaveBeenCalledWith('1', ['e1', 'e2'], { nom: 'Step 1' });
    });

    it('should return 404 if step is not created', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      vi.mocked(addProcessingEtape).mockResolvedValueOnce(null);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { nom: 'Step 1' },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requete entite not found' });
      expect(addProcessingEtape).toHaveBeenCalledWith('1', ['e1', 'e2'], { nom: 'Step 1' });
    });
  });
});
