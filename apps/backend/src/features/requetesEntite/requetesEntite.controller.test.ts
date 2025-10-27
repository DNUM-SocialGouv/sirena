import { Readable } from 'node:stream';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addProcessingEtape, getRequeteEtapes } from '@/features/requeteEtapes/requetesEtapes.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { getFileStream } from '@/libs/minio';
import type { RequeteEtape, RequeteEtapeNote, UploadedFile } from '@/libs/prisma';
import entitesMiddleware from '@/middlewares/entites.middleware';
import pinoLogger from '@/middlewares/pino.middleware';
import { convertDatesToStrings } from '@/tests/formatter';
import { getUploadedFileById, isFileBelongsToRequete } from '../uploadedFiles/uploadedFiles.service';
import RequetesEntiteController from './requetesEntite.controller';
import {
  closeRequeteForEntite,
  getRequeteEntiteById,
  getRequetesEntite,
  hasAccessToRequete,
} from './requetesEntite.service';

vi.mock('./requetesEntite.service', () => ({
  closeRequeteForEntite: vi.fn(),
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

vi.mock('@/middlewares/entites.middleware', () => ({
  default: vi.fn((c: Context, next: Next) => {
    c.set('entiteIds', ['e1', 'e2']);
    return next();
  }),
}));

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
      clotureReasonId: null,
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
      clotureReason: { label: string } | null;
    } = {
      ...requeteEtape,
      clotureReason: null,
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

      expect(getRequeteEtapes).toHaveBeenCalledWith('1', ['e1'], {});
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
        clotureReasonId: null,
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
        situations: [],
        fichiersRequeteOriginale: [],
      },
      requeteEtape: [],
    };

    it('streams the file with correct headers (inline) and body content', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);

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

    it('returns 404 when user has no access to requete', async () => {
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

    it('returns 404 when file not found', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);
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

  describe('POST /:id/close', () => {
    const mockCloseResult = {
      etapeId: 'etape123',
      closedAt: '2024-01-01T10:00:00.000Z',
      noteId: 'note123',
    };

    it('should close requete successfully with precision and files', async () => {
      vi.mocked(closeRequeteForEntite).mockResolvedValueOnce(mockCloseResult);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
          precision: 'Test precision',
          fileIds: ['file1', 'file2'],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: mockCloseResult });

      expect(closeRequeteForEntite).toHaveBeenCalledWith('requeteId', 'e1', 'reason123', 'id1', 'Test precision', [
        'file1',
        'file2',
      ]);
    });

    it('should close requete successfully without precision and files', async () => {
      const mockCloseResultMinimal = {
        etapeId: 'etape123',
        closedAt: '2024-01-01T10:00:00.000Z',
        noteId: 'note123',
      };

      vi.mocked(closeRequeteForEntite).mockResolvedValueOnce(mockCloseResultMinimal);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: mockCloseResultMinimal });

      expect(closeRequeteForEntite).toHaveBeenCalledWith('requeteId', 'e1', 'reason123', 'id1', undefined, undefined);
    });

    it('should return 403 when no entiteId is available', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('entiteIds', null);
        return next();
      });

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({ message: 'You are not allowed to close this requête' });

      expect(closeRequeteForEntite).not.toHaveBeenCalled();
    });

    it('should return 404 when requete not found', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('REQUETE_NOT_FOUND'));

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requête not found' });
    });

    it('should return 400 when reason is invalid', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('REASON_INVALID'));

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'invalidReason',
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: 'REASON_INVALID', message: 'Invalid reason provided' });
    });

    it('should return 403 when requete is already closed', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('READONLY_FOR_ENTITY'));

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({
        error: 'READONLY_FOR_ENTITY',
        message: 'Requête is already closed for this entity',
      });
    });

    it('should return 400 when files are invalid', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('FILES_INVALID'));

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
          fileIds: ['invalidFile'],
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: 'FILES_INVALID', message: 'Invalid files provided' });
    });

    it('should return 500 when unexpected error occurs', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('UNEXPECTED_ERROR'));

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
    });
  });
});
