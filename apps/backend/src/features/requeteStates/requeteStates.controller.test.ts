import { Readable } from 'node:stream';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasAccessToRequete } from '@/features/requetesEntite/requetesEntite.service';
import { getUploadedFileById, isUserOwner, setNoteFile } from '@/features/uploadedFiles/uploadedFiles.service';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { getFileStream } from '@/libs/minio';
import type { RequeteState } from '@/libs/prisma';
import { convertDatesToStrings } from '@/tests/formatter';
import RequeteStatesController from './requeteStates.controller';
import {
  addNote,
  deleteRequeteState,
  getNoteById,
  getRequeteStateById,
  updateNote,
  updateRequeteStateStatut,
  updateRequeteStateStepName,
} from './requeteStates.service';
import type { UpdateRequeteStateNoteDto } from './requeteStates.type';

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

const fakeUpdatedStepNameRequeteState: RequeteState = {
  ...fakeRequeteState,
  stepName: 'Updated Step Name',
  updatedAt: new Date(),
};

vi.mock('./requeteStates.service', () => ({
  getRequeteStateById: vi.fn(() => Promise.resolve(fakeRequeteState)),
  updateRequeteStateStatut: vi.fn(() => Promise.resolve(fakeUpdatedRequeteState)),
  updateRequeteStateStepName: vi.fn(() => Promise.resolve(fakeUpdatedStepNameRequeteState)),
  addNote: vi.fn(),
  getNoteById: vi.fn(),
  updateNote: vi.fn(),
  isUserOwner: vi.fn(),
  setNoteFile: vi.fn(),
  deleteRequeteState: vi.fn(),
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

vi.mock('@/middlewares/changelog/changelog.requeteStep.middleware', () => {
  return {
    default: () => (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('@/middlewares/changelog/changelog.requeteStateNote.middleware', () => {
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

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockImplementationOnce(() => Promise.resolve(false));

      const res = await client[':id'].statut.$patch({
        param: { id: 'step1' },
        json: { statutId: 'EN_COURS' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
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

  describe('PATCH /:id/stepName', () => {
    it('should update the stepName of a RequeteState', async () => {
      const res = await client[':id'].stepName.$patch({
        param: { id: 'step1' },
        json: { stepName: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeUpdatedStepNameRequeteState),
      });
      expect(updateRequeteStateStepName).toHaveBeenCalledWith('step1', { stepName: 'Updated Step Name' });
    });

    it('should return 404 if RequeteState not found', async () => {
      vi.mocked(getRequeteStateById).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].stepName.$patch({
        param: { id: 'step1' },
        json: { stepName: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteState not found',
      });
      expect(updateRequeteStateStepName).not.toHaveBeenCalled();
    });

    it('should return 404 if update fails', async () => {
      vi.mocked(updateRequeteStateStepName).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].stepName.$patch({
        param: { id: 'step1' },
        json: { stepName: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteState not found',
      });
    });

    it('should return 401 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockImplementationOnce(() => Promise.resolve(false));

      const res = await client[':id'].stepName.$patch({
        param: { id: 'step1' },
        json: { stepName: 'Updated Step Name' },
      });

      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete state',
      });
      expect(updateRequeteStateStepName).not.toHaveBeenCalled();
    });

    it('should validate the request body - stepName is required', async () => {
      const res = await client[':id'].stepName.$patch({
        param: { id: 'step1' },
        json: { stepName: '' },
      });

      expect(res.status).toBe(400);
    });

    it('should validate the request body - stepName has max length', async () => {
      const longStepName = 'a'.repeat(301);
      const res = await client[':id'].stepName.$patch({
        param: { id: 'step1' },
        json: { stepName: longStepName },
      });

      expect(res.status).toBe(400);
    });

    it('should sanitize the stepName input', async () => {
      const res = await client[':id'].stepName.$patch({
        param: { id: 'step1' },
        json: { stepName: '  <script>  alert("xss")</script>  ' },
      });

      expect(res.status).toBe(200);
      expect(updateRequeteStateStepName).toHaveBeenCalledWith('step1', {
        stepName: 'script alert("xss")/script',
      });
    });

    it('should reject stepName with only spaces after sanitization', async () => {
      const res = await client[':id'].stepName.$patch({
        param: { id: 'step1' },
        json: { stepName: '   <><>   ' },
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
        fileIds: [],
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
      expect(addNote).toHaveBeenCalledWith({
        requeteEntiteStateId: 'step1',
        content: 'test',
        userId: 'test-user-id',
        fileIds: [],
      });
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

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { content: 'test' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete state',
      });
      expect(addNote).not.toHaveBeenCalled();
    });

    it('should return 403 if fileIds provided and user is not owner', async () => {
      vi.mocked(isUserOwner).mockResolvedValueOnce(false);

      const res = await client[':id'].note.$post({
        param: { id: 'step1' },
        json: { content: 'test with files', fileIds: ['f1', 'f2'] },
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
        requeteEntiteStateId: 'step1',
        content: 'test with files',
        authorId: 'test-user-id',
        fileIds: ['f1', 'f2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(addNote).mockResolvedValueOnce(fakeNote);
      vi.mocked(setNoteFile).mockResolvedValueOnce([
        {
          id: 'f1',
          requeteStateNoteId: 'note1',
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
          requeteStateNoteId: 'note1',
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
        json: { content: 'test with files', fileIds: ['f1', 'f2'] },
      });

      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeNote),
      });

      expect(isUserOwner).toHaveBeenCalledWith('test-user-id', ['f1', 'f2']);

      expect(addNote).toHaveBeenCalledWith({
        userId: 'test-user-id',
        requeteEntiteStateId: 'step1',
        content: 'test with files',
        fileIds: ['f1', 'f2'],
      });

      expect(setNoteFile).toHaveBeenCalledWith('note1', ['f1', 'f2'], null);
    });
  });

  describe('PATCH /:id/note/:noteId', () => {
    const fakeNote = {
      id: 'note1',
      content: 'Original note content',
      authorId: 'test-user-id',
      requeteEntiteStateId: 'step1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const fakeUpdatedNote = {
      ...fakeNote,
      content: 'Updated note content',
      updatedAt: new Date(),
    };

    it('should update the content of a note', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(fakeNote);
      vi.mocked(updateNote).mockResolvedValueOnce(fakeUpdatedNote);

      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { content: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeUpdatedNote),
      });
      expect(getRequeteStateById).toHaveBeenCalledWith('step1');
      expect(getNoteById).toHaveBeenCalledWith('note1');
      expect(updateNote).toHaveBeenCalledWith('note1', 'Updated note content');
    });

    it('should return 404 if RequeteState not found', async () => {
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(null);

      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { content: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteState not found',
      });
      expect(getNoteById).not.toHaveBeenCalled();
      expect(updateNote).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { content: 'Updated note content' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete state',
      });
      expect(getNoteById).not.toHaveBeenCalled();
      expect(updateNote).not.toHaveBeenCalled();
    });

    it('should return 404 if note not found', async () => {
      vi.mocked(getNoteById).mockResolvedValueOnce(null);

      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: { content: 'Updated note content' },
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
        json: { content: '' },
      });

      expect(res.status).toBe(400);
    });

    it('should validate the request body - content is required', async () => {
      const res = await client[':id'].note[':noteId'].$patch({
        param: { id: 'step1', noteId: 'note1' },
        json: {} as unknown as UpdateRequeteStateNoteDto,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /:id/file/:fileId', () => {
    const baseFile = {
      id: 'file1',
      fileName: 'test.pdf',
      filePath: '/uploads/test.pdf',
      mimeType: 'application/pdf',
      size: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { originalName: 'report.pdf' },
      entiteId: 'entite1',
      uploadedById: 'user1',
      status: 'PENDING',
      requeteStateNoteId: 'step1',
    };

    it('streams the file with correct headers (inline) and body content', async () => {
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(fakeRequeteState);
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
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(fakeRequeteState);
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

    it('returns 404 when RequeteState not found', async () => {
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'RequeteState not found' });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 403 when user has no access to requete', async () => {
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(fakeRequeteState);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to update this requete state',
      });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when file not found', async () => {
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(fakeRequeteState);
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
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(fakeRequeteState);
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
    it('should delete a RequeteState successfully', async () => {
      vi.mocked(deleteRequeteState).mockResolvedValueOnce();

      const res = await client[':id'].$delete({
        param: { id: 'step1' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
      expect(deleteRequeteState).toHaveBeenCalledWith('step1', expect.any(Object), 'test-user-id');
    });

    it('should return 404 if RequeteState not found', async () => {
      vi.mocked(getRequeteStateById).mockResolvedValueOnce(null);

      const res = await client[':id'].$delete({
        param: { id: 'step1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'RequeteState not found',
      });
      expect(deleteRequeteState).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].$delete({
        param: { id: 'step1' },
      });

      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to delete this requete state',
      });
      expect(deleteRequeteState).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(deleteRequeteState).mockRejectedValueOnce(new Error('Database error'));

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
});
