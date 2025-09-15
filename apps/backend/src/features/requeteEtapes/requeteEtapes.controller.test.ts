import { Readable } from 'node:stream';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addNote,
  deleteNote,
  deleteRequeteEtape,
  getNoteById,
  getRequeteEtapeById,
  updateNote,
  updateRequeteEtapeNom,
  updateRequeteEtapeStatut,
} from '@/features/requeteEtapes/requetesEtapes.service';
import { hasAccessToRequete } from '@/features/requetesEntite/requetesEntite.service';
import { getUploadedFileById, isUserOwner, setNoteFile } from '@/features/uploadedFiles/uploadedFiles.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { getFileStream } from '@/libs/minio';
import type { RequeteEtape, RequeteEtapeNote, UploadedFile } from '@/libs/prisma';
import { convertDatesToStrings } from '@/tests/formatter';
import RequeteEtapesController from './requetesEtapes.controller';
import type { UpdateRequeteEtapeNoteDto } from './requetesEtapes.type';

vi.mock('@/features/requeteEtapes/requetesEtapes.service', () => ({
  getRequeteEtapeById: vi.fn(),
  updateRequeteEtapeStatut: vi.fn(),
  updateRequeteEtapeNom: vi.fn(() => Promise.resolve(fakeUpdatedNomRequeteEtape)),
  addNote: vi.fn(),
  getNoteById: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  isUserOwner: vi.fn(),
  setNoteFile: vi.fn(),
  deleteRequeteEtape: vi.fn(),
}));

vi.mock('@/features/uploadedFiles/uploadedFiles.service', () => ({
  getUploadedFileById: vi.fn(),
  isUserOwner: vi.fn(),
  setNoteFile: vi.fn(),
}));

vi.mock('@/features/requetesEntite/requetesEntite.service', () => ({
  hasAccessToRequete: vi.fn(() => Promise.resolve(true)),
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

vi.mock('@/middlewares/changelog/changelog.requeteEtapeNote.middleware', () => {
  return {
    default: () => (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('@/libs/minio', () => ({
  getFileStream: vi.fn(),
}));

vi.mock('@/helpers/errors', () => ({
  errorHandler: vi.fn((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    return c.json({ message: 'Internal server error' }, 500);
  }),
}));

const fakeRequeteEtape: RequeteEtape = {
  id: 'step1',
  requeteId: 'requeteId',
  entiteId: 'entiteId',
  nom: 'Test FAKE Step',
  statutId: 'A_FAIRE',
  createdAt: new Date(),
  updatedAt: new Date(),
  estPartagee: false,
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

describe('requeteEtapes.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequeteEtapesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequeteEtapeById).mockResolvedValue(fakeRequeteEtape);
    vi.mocked(updateRequeteEtapeStatut).mockResolvedValue(fakeUpdatedRequeteEtape);
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
      vi.mocked(hasAccessToRequete).mockImplementationOnce(() => Promise.resolve(false));

      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete etape',
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

    it('should return 401 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockImplementationOnce(() => Promise.resolve(false));

      const res = await client[':id'].nom.$patch({
        param: { id: 'step1' },
        json: { nom: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete etape',
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

  describe('POST /:id/note', () => {
    it('should add a note to a processing Etape', async () => {
      const fakeData: RequeteEtapeNote = {
        createdAt: new Date(),
        id: 'note1',
        requeteEtapeId: 'step1',
        texte: 'test',
        updatedAt: new Date(),
        authorId: 'test-user-id',
      };

      vi.mocked(addNote).mockResolvedValueOnce(fakeData);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { texte: 'test' },
      });

      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeData),
      });
      expect(addNote).toHaveBeenCalledWith({
        requeteEtapeId: 'step1',
        texte: 'test',
        userId: 'test-user-id',
        fileIds: [],
      });
    });

    it('should return 404 if RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { texte: 'test' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
      expect(addNote).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { texte: 'test' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to add notes to this requete etape',
      });
      expect(addNote).not.toHaveBeenCalled();
    });

    it('should return 403 if fileIds provided and user is not owner', async () => {
      vi.mocked(isUserOwner).mockResolvedValueOnce(false);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { texte: 'test with files', fileIds: ['f1', 'f2'] },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to add notes with these files',
      });

      expect(isUserOwner).toHaveBeenCalledWith('test-user-id', ['f1', 'f2']);

      expect(addNote).not.toHaveBeenCalled();
      expect(setNoteFile).not.toHaveBeenCalled();
    });

    it('should add note with files when user owns them and link files to note', async () => {
      vi.mocked(isUserOwner).mockResolvedValueOnce(true);

      const fakeNote = {
        id: 'note1',
        requeteEtapeId: 'step1',
        texte: 'test with files',
        authorId: 'test-user-id',
        fileIds: ['f1', 'f2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(addNote).mockResolvedValueOnce(fakeNote);
      vi.mocked(setNoteFile).mockResolvedValueOnce([
        {
          id: 'f1',
          requeteEtapeNoteId: 'note1',
          requeteId: null,
          faitSituationId: null,
          status: 'COMPLETED',
          entiteId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          fileName: 'test.pdf',
          filePath: '/uploads/test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          metadata: { originalName: 'test.pdf' },
          uploadedById: 'user1',
        },
        {
          id: 'f2',
          requeteEtapeNoteId: 'note1',
          requeteId: null,
          faitSituationId: null,
          status: 'COMPLETED',
          entiteId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          fileName: 'test2.pdf',
          filePath: '/uploads/test2.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          metadata: { originalName: 'test2.pdf' },
          uploadedById: 'user1',
        },
      ]);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { texte: 'test with files', fileIds: ['f1', 'f2'] },
      });

      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeNote),
      });

      expect(isUserOwner).toHaveBeenCalledWith('test-user-id', ['f1', 'f2']);

      expect(addNote).toHaveBeenCalledWith({
        userId: 'test-user-id',
        requeteEtapeId: 'step1',
        texte: 'test with files',
        fileIds: ['f1', 'f2'],
      });

      expect(setNoteFile).toHaveBeenCalledWith('note1', ['f1', 'f2'], null);
    });
  });

  describe('PATCH /:id/note/:noteId', () => {
    const fakeNote: RequeteEtapeNote & { uploadedFiles: UploadedFile[] } = {
      id: 'note1',
      texte: 'Original note content',
      authorId: 'test-user-id',
      requeteEtapeId: 'step1',
      uploadedFiles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const fakeUpdatedNote = {
      ...fakeNote,
      texte: 'Updated note content',
      updatedAt: new Date(),
    };

    it('should update the content of a note', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(updateNote).mockResolvedValueOnce(fakeUpdatedNote);

      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { texte: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeUpdatedNote),
      });
      expect(getRequeteEtapeById).toHaveBeenCalledWith('step1');
      expect(getNoteById).toHaveBeenCalledWith('note1');
      expect(updateNote).toHaveBeenCalledWith('note1', 'Updated note content');
    });

    it('should return 404 if RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { texte: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
      expect(getNoteById).not.toHaveBeenCalled();
      expect(updateNote).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { texte: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete etape',
      });
      expect(getNoteById).not.toHaveBeenCalled();
      expect(updateNote).not.toHaveBeenCalled();
    });

    it('should return 404 if note not found', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(null);

      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { texte: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'Note not found',
      });
      expect(updateNote).not.toHaveBeenCalled();
    });

    it('should validate the request body - content is required', async () => {
      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { texte: '' },
      });

      expect(res.status).toBe(400);
    });

    it('should validate the request body - content is required', async () => {
      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: {} as unknown as UpdateRequeteEtapeNoteDto,
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
    };

    it('streams the file with correct headers (inline) and body content', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(fakeRequeteEtape);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      vi.mocked(getUploadedFileById).mockResolvedValueOnce(baseFile);

      const nodeReadable = Readable.from(Buffer.from('hello'));
      vi.mocked(getFileStream).mockResolvedValueOnce(nodeReadable);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
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
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(fakeRequeteEtape);
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
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(fakeRequeteEtape);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete etape',
      });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when file not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(fakeRequeteEtape);
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
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(fakeRequeteEtape);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fileNoMeta = { ...baseFile, metadata: null, fileName: 'fallback.pdf' };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(fileNoMeta);

      const nodeReadable = Readable.from(Buffer.from('x'));
      vi.mocked(getFileStream).mockResolvedValueOnce(nodeReadable);

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
        message: 'You are not allowed to delete this requete etape',
      });
      expect(deleteRequeteEtape).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
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

  describe('DELETE /:id/note/:noteId', () => {
    const fakeNote: RequeteEtapeNote & { uploadedFiles: UploadedFile[] } = {
      id: 'note1',
      texte: 'Original note content',
      authorId: 'test-user-id',
      requeteEtapeId: 'step1',
      uploadedFiles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a note successfully', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(deleteNote).mockResolvedValueOnce();

      const res = await client[':id'].note[':noteId'].$delete({
        param: { id: 'step1', noteId: 'note1' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
      expect(getRequeteEtapeById).toHaveBeenCalledWith('step1');
      expect(getNoteById).toHaveBeenCalledWith('note1');
      expect(deleteNote).toHaveBeenCalledWith('note1', expect.any(Object), 'test-user-id');
    });

    it('should return 404 if RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id'].note[':noteId'].$delete({
        param: { id: 'step1', noteId: 'note1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
      expect(getNoteById).not.toHaveBeenCalled();
      expect(deleteNote).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].note[':noteId'].$delete({
        param: { id: 'step1', noteId: 'note1' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to delete notes from this requete etape',
      });
      expect(getNoteById).not.toHaveBeenCalled();
      expect(deleteNote).not.toHaveBeenCalled();
    });

    it('should return 404 if note not found', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(null);

      const res = await client[':id'].note[':noteId'].$delete({
        param: { id: 'step1', noteId: 'note1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'Note not found',
      });
      expect(deleteNote).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(deleteNote).mockRejectedValueOnce(new Error('Database error'));

      const res = await client[':id'].note[':noteId'].$delete({
        param: { id: 'step1', noteId: 'note1' },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({
        message: 'Internal server error',
      });
    });
  });
});
