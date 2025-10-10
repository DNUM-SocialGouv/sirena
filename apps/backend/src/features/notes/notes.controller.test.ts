import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequeteEtapeById } from '@/features/requeteEtapes/requetesEtapes.service';
import { hasAccessToRequete } from '@/features/requetesEntite/requetesEntite.service';
import { isUserOwner, setNoteFile } from '@/features/uploadedFiles/uploadedFiles.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import type { RequeteEtape, RequeteEtapeNote, UploadedFile } from '@/libs/prisma';
import { convertDatesToStrings } from '@/tests/formatter';
import NotesController from './notes.controller';
import { addNote, deleteNote, getNoteById, updateNote } from './notes.service';

vi.mock('@/features/requeteEtapes/requetesEtapes.service', () => ({
  getRequeteEtapeById: vi.fn(),
}));

vi.mock('./notes.service', () => ({
  addNote: vi.fn(),
  getNoteById: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('@/features/uploadedFiles/uploadedFiles.service', () => ({
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

vi.mock('@/middlewares/changelog/changelog.requeteEtapeNote.middleware', () => {
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

describe('notes.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', NotesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRequeteEtapeById).mockResolvedValue(fakeRequeteEtape);
    vi.mocked(hasAccessToRequete).mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(NotesController).toBeDefined();
  });

  describe('POST /', () => {
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

      const res = await client.index.$post({
        json: { texte: 'test', requeteEtapeId: 'step1' },
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

      const res = await client.index.$post({
        json: { texte: 'test', requeteEtapeId: 'step1' },
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

      const res = await client.index.$post({
        json: { texte: 'test', requeteEtapeId: 'step1' },
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

      const res = await client.index.$post({
        json: { texte: 'test with files', fileIds: ['f1', 'f2'], requeteEtapeId: 'step1' },
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

      const res = await client.index.$post({
        json: { texte: 'test with files', fileIds: ['f1', 'f2'], requeteEtapeId: 'step1' },
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

  describe('PATCH /:noteId', () => {
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

      const res = await client[':noteId'].$patch({
        param: { noteId: 'note1' },
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
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':noteId'].$patch({
        param: { noteId: 'note1' },
        json: { texte: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
      expect(updateNote).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':noteId'].$patch({
        param: { noteId: 'note1' },
        json: { texte: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete etape',
      });
      expect(updateNote).not.toHaveBeenCalled();
    });

    it('should return 404 if note not found', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(null);

      const res = await client[':noteId'].$patch({
        param: { noteId: 'note1' },
        json: { texte: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'Note not found',
      });
      expect(updateNote).not.toHaveBeenCalled();
    });

    it('should validate the request body - content is not required', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);

      const res = await client[':noteId'].$patch({
        param: { noteId: 'note1' },
        json: { texte: '' },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /:noteId', () => {
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

      const res = await client[':noteId'].$delete({
        param: { noteId: 'note1' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
      expect(getRequeteEtapeById).toHaveBeenCalledWith('step1');
      expect(getNoteById).toHaveBeenCalledWith('note1');
      expect(deleteNote).toHaveBeenCalledWith('note1', expect.any(Object), 'test-user-id');
    });

    it('should return 404 if RequeteEtape not found', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':noteId'].$delete({
        param: { noteId: 'note1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteEtape not found',
      });
      expect(deleteNote).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':noteId'].$delete({
        param: { noteId: 'note1' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to delete notes from this requete etape',
      });
      expect(deleteNote).not.toHaveBeenCalled();
    });

    it('should return 404 if note not found', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(null);

      const res = await client[':noteId'].$delete({
        param: { noteId: 'note1' },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({
        message: 'Note not found',
      });
      expect(deleteNote).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(deleteNote).mockRejectedValueOnce(new Error('Database error'));

      const res = await client[':noteId'].$delete({
        param: { noteId: 'note1' },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({
        message: 'Internal server error',
      });
    });
  });
});
