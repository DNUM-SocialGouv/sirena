import { Readable } from 'node:stream';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addProcessingEtape, getRequeteEtapes } from '@/features/requeteEtapes/requetesEtapes.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { getFileStream } from '@/libs/minio';
import type { RequeteEtape, RequeteEtapeNote, UploadedFile } from '@/libs/prisma';
import pinoLogger from '@/middlewares/pino.middleware';
import { convertDatesToStrings } from '@/tests/formatter';
import { getUploadedFileById, isFileBelongsToRequete } from '../uploadedFiles/uploadedFiles.service';
import RequetesEntiteController from './requetesEntite.controller';
import { getRequeteEntiteById, getRequetesEntite, hasAccessToRequete } from './requetesEntite.service';

vi.mock('./requetesEntite.service', () => ({
  getRequeteEntiteById: vi.fn(),
  getRequetesEntite: vi.fn(),
  hasAccessToRequete: vi.fn(),
}));

vi.mock('@/libs/minio', () => ({
  getFileStream: vi.fn(),
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

vi.mock('@/features/uploadedFiles/uploadedFiles.service', () => ({
  getUploadedFileById: vi.fn(),
  isFileBelongsToRequete: vi.fn(),
}));

describe('RequetesEntite endpoints: /', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequetesEntiteController).onError(errorHandler);
  const client = testClient(app);

  const fakeData = [
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
        participant: null,
        situations: [],
        declarant: {
          id: 'd1',
          createdAt: new Date(),
          updatedAt: new Date(),
          commentaire: '',
          estNonIdentifiee: false,
          estAnonyme: false,
          estHandicapee: false,
          estIdentifie: true,
          estVictime: null,
          estVictimeInformee: null,
          victimeInformeeCommentaire: '',
          veutGarderAnonymat: false,
          autrePersonnes: '',
          declarantDeId: 'd1',
          lienAutrePrecision: '',
          lienVictimeId: '',
          participantDeId: '',
          ageId: null,
          identite: null,
          adresse: null,
        },
      },
      requeteEtape: [],
    },
  ] satisfies Awaited<ReturnType<typeof getRequetesEntite>>['data'];

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

      expect(getRequetesEntite).toHaveBeenCalledWith(['e1', 'e2'], {});
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

      expect(getRequetesEntite).toHaveBeenCalledWith(['e1', 'e2'], { offset: 5, limit: 10 });
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

  describe('GET /:id/file/:fileId', () => {
    const baseFile: UploadedFile = {
      id: 'file1',
      fileName: 'test.pdf',
      filePath: '/uploads/test.pdf',
      mimeType: 'application/pdf',
      size: 5,
      requeteId: 'requeteId',
      faitSituationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { originalName: 'report.pdf' },
      entiteId: 'entite1',
      uploadedById: 'user1',
      status: 'PENDING',
      requeteEtapeNoteId: 'step1',
      demarchesEngageesId: null,
    };

    const fakeRequeteEntite = {
      requeteId: 'requeteId',
      entiteId: 'entiteId',
      requete: {
        id: 'requeteId',
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Commentaire',
        receptionDate: new Date(),
        dematSocialId: 123,
        receptionTypeId: 'receptionTypeId',
        declarant: null,
        participant: null,
        fichiersRequeteOriginale: [],
      },
      requeteEtape: [],
    };

    it('streams the file with correct headers (inline) and body content', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      vi.mocked(getUploadedFileById).mockResolvedValueOnce(baseFile);
      vi.mocked(isFileBelongsToRequete).mockResolvedValueOnce(true);

      const nodeReadable = Readable.from(Buffer.from('hello'));
      vi.mocked(getFileStream).mockResolvedValueOnce(nodeReadable);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const bodyText = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toBe('inline; filename="report.pdf"');

      expect(bodyText).toBe('hello');

      expect(getUploadedFileById).toHaveBeenCalledWith('file1', null);
      expect(getFileStream).toHaveBeenCalledWith('/uploads/test.pdf');
    });

    it('returns 200 with empty body when file size is 0 (no streaming)', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const emptyFile = { ...baseFile, size: 0 };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(emptyFile);
      vi.mocked(isFileBelongsToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const bodyText = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toBe('inline; filename="report.pdf"');
      expect(bodyText).toBe('');

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when RequeteEntite not found', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'Requete not found' });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 403 when user has no access to requete', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);
      vi.mocked(hasAccessToRequete).mockResolvedValue(false);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'You are not allowed to access this requete' });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when file not found', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'File not found' });

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('falls back to fileName when metadata.originalName is missing', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fileNoMeta = { ...baseFile, metadata: null, fileName: 'fallback.pdf' };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(fileNoMeta);
      vi.mocked(isFileBelongsToRequete).mockResolvedValueOnce(true);

      const nodeReadable = Readable.from(Buffer.from('x'));
      vi.mocked(getFileStream).mockResolvedValueOnce(nodeReadable);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toBe('inline; filename="fallback.pdf"');
    });
  });
});
