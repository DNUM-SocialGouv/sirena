import { Readable } from 'node:stream';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addProcessingEtape,
  deleteRequeteEtape,
  getRequeteEtapeById,
  getRequeteEtapes,
  updateRequeteEtapeNom,
  updateRequeteEtapeStatut,
} from '@/features/requeteEtapes/requetesEtapes.service';
import { getUploadedFileById } from '@/features/uploadedFiles/uploadedFiles.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { getFileStream } from '@/libs/minio';
import type { RequeteEtape, RequeteEtapeNote, UploadedFile } from '@/libs/prisma';
import { convertDatesToStrings } from '@/tests/formatter';
import {
  getRequeteEntiteById,
  hasAccessToRequete,
  updateStatusRequete,
} from '../requetesEntite/requetesEntite.service';
import RequeteEtapesController from './requetesEtapes.controller';

vi.mock('@/features/requeteEtapes/requetesEtapes.service', () => ({
  getRequeteEtapeById: vi.fn(),
  updateRequeteEtapeStatut: vi.fn(),
  updateRequeteEtapeNom: vi.fn(() => Promise.resolve(fakeUpdatedNomRequeteEtape)),
  deleteRequeteEtape: vi.fn(),
  addProcessingEtape: vi.fn(),
  getRequeteEtapes: vi.fn(),
}));

vi.mock('@/features/uploadedFiles/uploadedFiles.service', () => ({
  getUploadedFileById: vi.fn(),
  isFileBelongsToRequete: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../requetesEntite/requetesEntite.service', () => ({
  hasAccessToRequete: vi.fn(() => Promise.resolve(true)),
  getRequeteEntiteById: vi.fn(),
  updateStatusRequete: vi.fn(),
}));

vi.mock('@/middlewares/userStatus.middleware', () => {
  return {
    default: (_: Context, next: Next) => {
      return next();
    },
  };
});

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
      c.set('topEntiteId', 'e1');
      return next();
    }),
  };
});

vi.mock('@/middlewares/changelog/changelog.requeteEtape.middleware', () => {
  return {
    default: () => (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('@/libs/minio', () => ({
  getFileStream: vi.fn(),
}));

vi.mock('@/helpers/errors', async () => {
  const actual = await vi.importActual<typeof import('@/helpers/errors')>('@/helpers/errors');
  return {
    ...actual,
    errorHandler: vi.fn((err, c) => {
      if (actual.isHTTPException(err)) {
        return err.getResponse();
      }
      return c.json({ message: 'Internal server error' }, 500);
    }),
  };
});

const fakeRequeteEtape: RequeteEtape = {
  id: 'step1',
  requeteId: 'requeteId',
  entiteId: 'e1',
  nom: 'Test FAKE Step',
  statutId: 'A_FAIRE',
  createdAt: new Date(),
  updatedAt: new Date(),
  estPartagee: false,
  clotureReasonId: null,
};

const fakeUpdatedRequeteEtape: RequeteEtape = {
  ...fakeRequeteEtape,
  statutId: 'EN_COURS',
  updatedAt: new Date(),
};

const fakeUpdatedNomRequeteEtape: RequeteEtape = {
  ...fakeRequeteEtape,
  nom: 'Updated Step Name',
  updatedAt: new Date(),
};

const fakeRequeteEntite = {
  statutId: 'EN_COURS',
};

describe('requeteEtapes.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequeteEtapesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequeteEtapeById).mockResolvedValue(fakeRequeteEtape);
    vi.mocked(updateRequeteEtapeStatut).mockResolvedValue(fakeUpdatedRequeteEtape);
    vi.mocked(hasAccessToRequete).mockResolvedValue(true);
    vi.mocked(getRequeteEntiteById).mockResolvedValue(fakeRequeteEntite);
    vi.mocked(updateStatusRequete).mockResolvedValue({
      statutId: 'EN_COURS',
      requeteId: 'requeteId',
      entiteId: 'e1',
      prioriteId: null,
    });
  });

  describe('PATCH /:id/statut', () => {
    it('should return 404 if RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
      expect(updateRequeteEtapeStatut).not.toHaveBeenCalled();
    });

    it('should update the statut of a RequeteEtape', async () => {
      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeUpdatedRequeteEtape),
      });
      expect(updateRequeteEtapeStatut).toHaveBeenCalledWith('step1', { statutId: 'EN_COURS' });
    });

    it('should return 404 if update fails', async () => {
      vi.mocked(updateRequeteEtapeStatut).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to add notes to this requete etape',
      });
      expect(updateRequeteEtapeStatut).not.toHaveBeenCalled();
    });

    it('should validate the request body', async () => {
      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'INVALID_STATUS' as never },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /:id/nom', () => {
    it('should update the nom of a RequeteEtape', async () => {
      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeUpdatedNomRequeteEtape),
      });
      expect(updateRequeteEtapeNom).toHaveBeenCalledWith('step1', { nom: 'Updated Step Name' });
    });

    it('should return 404 if RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
      expect(updateRequeteEtapeNom).not.toHaveBeenCalled();
    });

    it('should return 404 if update fails', async () => {
      vi.mocked(updateRequeteEtapeNom).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to add notes to this requete etape',
      });
      expect(updateRequeteEtapeNom).not.toHaveBeenCalled();
    });

    it('should validate the request body - nom is required', async () => {
      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: '' },
      });

      expect(res.status).toBe(400);
    });

    it('should validate the request body - nom has max length', async () => {
      const longNom = 'a'.repeat(301);
      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: longNom },
      });

      expect(res.status).toBe(400);
    });

    it('should sanitize the nom input', async () => {
      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: '  <script>  alert("xss")</script>  ' },
      });

      expect(res.status).toBe(200);
      expect(updateRequeteEtapeNom).toHaveBeenCalledWith('step1', {
        nom: 'script alert("xss")/script',
      });
    });

    it('should reject nom with only spaces after sanitization', async () => {
      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: '   <><>   ' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /:id/file/:fileId', () => {
    const baseFile: UploadedFile = {
      id: 'file1',
      fileName: 'test.pdf',
      filePath: '/uploads/test.pdf',
      mimeType: 'application/pdf',
      size: 5,
      requeteId: null,
      faitSituationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { originalName: 'report.pdf' },
      entiteId: 'entite1',
      uploadedById: 'user1',
      status: 'PENDING',
      requeteEtapeNoteId: 'step1',
      demarchesEngageesId: null,
      canDelete: true,
    };

    it('streams the file with correct headers (inline) and body content', async () => {
      const requeteEtapeWithE1 = { ...fakeRequeteEtape, entiteId: 'e1' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithE1);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      vi.mocked(getUploadedFileById).mockResolvedValueOnce(baseFile);

      const nodeReadable = Readable.from(Buffer.from('hello'));
      vi.mocked(getFileStream).mockResolvedValueOnce({ stream: nodeReadable, metadata: { encrypted: false } });

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const bodyText = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toBe('inline; filename="report.pdf"');

      expect(bodyText).toBe('hello');

      expect(getUploadedFileById).toHaveBeenCalledWith('file1', ['e1']);
      expect(getFileStream).toHaveBeenCalledWith('/uploads/test.pdf');
    });

    it('returns 200 with empty body when file size is 0 (no streaming)', async () => {
      const requeteEtapeWithE1 = { ...fakeRequeteEtape, entiteId: 'e1' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithE1);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const emptyFile = { ...baseFile, size: 0 };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(emptyFile);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const bodyText = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toBe('inline; filename="report.pdf"');
      expect(bodyText).toBe('');

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'RequeteEtape not found' });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 403 when user has no access to requete', async () => {
      const requeteEtapeWithDifferentEntite = { ...fakeRequeteEtape, entiteId: 'e2' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithDifferentEntite);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to read this file for this requete etape',
      });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
      expect(hasAccessToRequete).not.toHaveBeenCalled();
    });

    it('returns 404 when file not found', async () => {
      const requeteEtapeWithE1 = { ...fakeRequeteEtape, entiteId: 'e1' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithE1);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'File not found' });

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('falls back to fileName when metadata.originalName is missing', async () => {
      const requeteEtapeWithE1 = { ...fakeRequeteEtape, entiteId: 'e1' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithE1);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fileNoMeta = { ...baseFile, metadata: null, fileName: 'fallback.pdf' };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(fileNoMeta);

      const nodeReadable = Readable.from(Buffer.from('x'));
      vi.mocked(getFileStream).mockResolvedValueOnce({ stream: nodeReadable, metadata: { encrypted: false } });

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toBe('inline; filename="fallback.pdf"');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a RequeteEtape successfully', async () => {
      vi.mocked(deleteRequeteEtape).mockResolvedValueOnce();
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].$delete({
        param: { id: 'step1' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
      expect(deleteRequeteEtape).toHaveBeenCalledWith('step1', expect.any(Object), 'test-user-id');
    });

    it('should return 404 if RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id'].$delete({
        param: { id: 'step1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
      expect(deleteRequeteEtape).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].$delete({
        param: { id: 'step1' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to add notes to this requete etape',
      });
      expect(deleteRequeteEtape).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);
      vi.mocked(deleteRequeteEtape).mockRejectedValueOnce(new Error('Database error'));

      const res = await client[':id'].$delete({
        param: { id: 'step1' },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({
        message: 'Internal server error',
      });
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

    const note: RequeteEtapeNote = {
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

      expect(getRequeteEtapes).toHaveBeenCalledWith('1', 'e1', {});
    });

    it('should return 400 if topEntiteId is missing', async () => {
      vi.mocked(getRequeteEtapes).mockResolvedValueOnce({ data: [], total: 0 });

      const res = await client[':id']['processing-steps'].$get({
        param: { id: 'nonexistent' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: [], meta: { total: 0 } });
    });
  });

  describe('POST /:id/processing-steps', () => {
    it('should add a processing step', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fakeStep: RequeteEtape = {
        id: 'step1',
        requeteId: '1',
        nom: 'Step 1',
        statutId: 'FAIT',
        createdAt: new Date(0),
        updatedAt: new Date(0),
        entiteId: 'e1',
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
      expect(addProcessingEtape).toHaveBeenCalledWith('1', 'e1', { nom: 'Step 1' });
    });

    it('should return 404 if hasAccessToRequete returns false', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);
      vi.mocked(addProcessingEtape).mockResolvedValueOnce(null);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: 'nonexistent' },
        json: { nom: 'Step 1' },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requete entite not found' });
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
      expect(addProcessingEtape).toHaveBeenCalledWith('1', 'e1', { nom: 'Step 1' });
    });
  });
});
