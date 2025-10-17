import fs from 'node:fs';
import { Readable } from 'node:stream';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { deleteFileFromMinio, getFileStream, uploadFileToMinio } from '@/libs/minio';
import type { UploadedFile } from '@/libs/prisma';
import entitesMiddleware from '@/middlewares/entites.middleware';
import extractUploadedFileMiddleware from '@/middlewares/upload.middleware';
import { convertDatesToStrings } from '@/tests/formatter';
import UploadedFilesController from './uploadedFiles.controller';
import { createUploadedFile, deleteUploadedFile, getUploadedFileById } from './uploadedFiles.service';

const fakeFile: UploadedFile = {
  id: 'file1',
  fileName: 'fallback.pdf',
  filePath: '/uploads/test.pdf',
  mimeType: 'application/pdf',
  size: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: null,
  entiteId: 'entite1',
  status: 'PENDING',
  requeteEtapeNoteId: 'step1',
  faitSituationId: null,
  requeteId: 'requeteId',
  uploadedById: 'user1',
  demarchesEngageesId: null,
};

const fakeData: UploadedFile[] = [fakeFile];

const signedUrl = 'https://test-signed-url.com';

vi.mock('@/libs/minio', () => ({
  getFileStream: vi.fn(),
  uploadFileToMinio: vi.fn(() => {
    return Promise.resolve({
      objectPath: fakeFile.filePath,
      rollback: vi.fn(),
    });
  }),
  getSignedUrl: vi.fn(() => Promise.resolve(signedUrl)),
  deleteFileFromMinio: vi.fn(),
}));

vi.mock('./uploadedFiles.service', () => ({
  createUploadedFile: vi.fn(() => Promise.resolve(fakeFile)),
  getUploadedFiles: vi.fn(() => Promise.resolve({ data: fakeData, total: 1 })),
  getUploadedFileById: vi.fn(() => Promise.resolve(fakeFile)),
  deleteUploadedFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/middlewares/upload.middleware', () => ({
  default: vi.fn((c: Context, next: Next) => {
    c.set('uploadedFile', {
      tempFilePath: fakeFile.filePath,
      fileName: fakeFile.fileName,
      contentType: fakeFile.mimeType,
      size: fakeFile.size,
    });
    return next();
  }),
}));

vi.mock('@/middlewares/userStatus.middleware', () => {
  return {
    default: (_: Context, next: Next) => {
      return next();
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

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('userId', 'id10');
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

vi.mock('node:fs', () => ({
  default: {
    promises: {
      unlink: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('@/helpers/errors', () => ({
  errorHandler: vi.fn((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    return c.json({ message: 'Internal server error' }, 500);
  }),
}));

describe('uploadedFiles.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', UploadedFilesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return a list of uploaded files', async () => {
      const res = await client.index.$get({
        query: {},
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeData),
        meta: {
          total: 1,
        },
      });
    });

    it('should return a list of uploaded files with offset and limit', async () => {
      const res = await client.index.$get({
        query: {
          offset: '10',
          limit: '5',
        },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeData),
        meta: {
          offset: 10,
          limit: 5,
          total: 1,
        },
      });
    });

    it('should return a 400 error if entiteIds is not set', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('entiteIds', null);
        return next();
      });

      const res = await client.index.$get({
        query: {},
      });

      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to read uploaded files without entiteIds.',
      });
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

    it('streams the file with correct headers (inline) and body content', async () => {
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(baseFile);

      const nodeReadable = Readable.from(Buffer.from('hello'));
      vi.mocked(getFileStream).mockResolvedValueOnce(nodeReadable);

      const res = await client[':requeteId'].file[':fileId'].$get({
        param: { requeteId: 'requeteId', fileId: 'file1' },
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
      const emptyFile = { ...baseFile, size: 0 };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(emptyFile);

      const res = await client[':requeteId'].file[':fileId'].$get({
        param: { requeteId: 'requeteId', fileId: 'file1' },
      });

      const bodyText = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toBe('inline; filename="report.pdf"');
      expect(bodyText).toBe('');

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when RequeteEtape not found', async () => {
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(null);

      const res = await client[':requeteId'].file[':fileId'].$get({
        param: { requeteId: 'requeteId', fileId: 'file1' },
      });

      expect(res.status).toBe(404);

      expect(getUploadedFileById).toHaveBeenCalledWith('file1', null);
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 403 when user has no access to requete', async () => {
      vi.mocked(getUploadedFileById).mockRejectedValueOnce(
        new HTTPException(403, { message: 'User has no access to requete' }),
      );

      const res = await client[':requeteId'].file[':fileId'].$get({
        param: { requeteId: 'requeteId', fileId: 'file1' },
      });

      expect(res.status).toBe(403);

      expect(getUploadedFileById).toHaveBeenCalledWith('file1', null);
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when file not found', async () => {
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(null);

      const res = await client[':requeteId'].file[':fileId'].$get({
        param: { requeteId: 'requeteId', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'File not found' });

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('falls back to fileName when metadata.originalName is missing', async () => {
      const fileNoMeta = { ...baseFile, metadata: null, fileName: 'fallback.pdf' };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(fileNoMeta);

      const nodeReadable = Readable.from(Buffer.from('x'));
      vi.mocked(getFileStream).mockResolvedValueOnce(nodeReadable);

      const res = await client[':requeteId'].file[':fileId'].$get({
        param: { requeteId: 'requeteId', fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toBe('inline; filename="fallback.pdf"');
    });
  });

  describe('GET /:id', () => {
    it('should return a 200 and the uploaded file if found', async () => {
      const res = await client[':id'].$get({
        param: { id: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeData[0]),
      });
    });

    it('should return a 400 error if entiteIds is not set', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('entiteIds', null);
        return next();
      });

      const res = await client[':id'].$get({
        param: { id: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to read uploaded files without entiteIds.',
      });
    });

    it('should return a 404 error if uploaded file is not found', async () => {
      vi.mocked(getUploadedFileById).mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      const res = await client[':id'].$get({
        param: { id: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'Uploaded file not found',
      });
    });
  });

  describe('GET /signed-url/:id', () => {
    it('should return a 200 and the signed url if found', async () => {
      const res = await client['signed-url'][':id'].$get({
        param: { id: 'file1' },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        data: {
          signedUrl: signedUrl,
        },
      });
    });

    it('should return a 400 error if entiteIds is not set', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('entiteIds', null);
        return next();
      });

      const res = await client['signed-url'][':id'].$get({
        param: { id: 'file1' },
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to read uploaded files without entiteIds.',
      });
    });

    it('should return a 404 error if uploaded file is not found', async () => {
      vi.mocked(getUploadedFileById).mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      const res = await client['signed-url'][':id'].$get({
        param: { id: 'file1' },
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'Uploaded file not found',
      });
    });
  });

  describe('POST /', () => {
    it('should create a uploaded file', async () => {
      const res = await client.index.$post();
      const body = await res.json();

      expect(createUploadedFile).toHaveBeenCalledTimes(1);
      expect(fs.promises.unlink).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(201);
      expect(body).toEqual({
        data: convertDatesToStrings(fakeFile),
      });
    });

    it('should return a 400 error if no file is uploaded', async () => {
      vi.mocked(extractUploadedFileMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('uploadedFile', null);
        return next();
      });

      const res = await client.index.$post();
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'No file uploaded',
      });
    });

    it('should return a 400 error if entiteIds is not set', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('entiteIds', null);
        return next();
      });

      const res = await client.index.$post();
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You must have an assigned entite to create an uploaded file.',
      });
    });

    it('should call rollbackMinio if uploadFileToMinio fails', async () => {
      const rollbackMinio = vi.fn();
      vi.mocked(uploadFileToMinio).mockImplementationOnce(() => {
        return Promise.resolve({
          objectPath: 'uploads/test.pdf',
          rollback: rollbackMinio,
        });
      });

      vi.mocked(createUploadedFile).mockImplementationOnce(() => {
        return Promise.reject(new Error('Error creating uploaded file'));
      });

      const res = await client.index.$post();
      const body = await res.json();

      expect(rollbackMinio).toHaveBeenCalled();
      expect(res.status).toBe(500);
      expect(body).toEqual({
        message: 'Internal server error',
      });
    });

    it('should return a 500 error if file name is not valid', async () => {
      vi.mocked(uploadFileToMinio).mockImplementationOnce(() => {
        return Promise.resolve({
          objectPath: 'badpath.pdf',
          rollback: vi.fn(),
        });
      });

      const res = await client.index.$post();
      const body = await res.json();

      expect(errorHandler).toHaveBeenCalledWith(new Error('File name is not valid'), expect.anything());
      expect(res.status).toBe(500);
      expect(body).toEqual({
        message: 'Internal server error',
      });
    });
  });

  describe('DELETE /:id', () => {
    it('should delete an uploaded file successfully', async () => {
      const res = await client[':id'].$delete({
        param: { id: 'file1' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
      expect(getUploadedFileById).toHaveBeenCalledWith('file1', null);
      expect(deleteUploadedFile).toHaveBeenCalledWith('file1');
      expect(deleteFileFromMinio).toHaveBeenCalledWith('/uploads/test.pdf');
    });

    it('should return 400 if entiteIds is not set', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('entiteIds', null);
        return next();
      });

      const res = await client[':id'].$delete({
        param: { id: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to delete uploaded files without entiteIds.',
      });
      expect(deleteUploadedFile).not.toHaveBeenCalled();
      expect(deleteFileFromMinio).not.toHaveBeenCalled();
    });

    it('should return 404 if uploaded file not found', async () => {
      vi.mocked(getUploadedFileById).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].$delete({
        param: { id: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        message: 'Uploaded file not found',
      });
      expect(deleteUploadedFile).not.toHaveBeenCalled();
      expect(deleteFileFromMinio).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(deleteUploadedFile).mockRejectedValueOnce(new Error('Database error'));

      const res = await client[':id'].$delete({
        param: { id: 'file1' },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({
        message: 'Internal server error',
      });
    });

    it('should handle MinIO deletion errors gracefully', async () => {
      vi.mocked(deleteFileFromMinio).mockRejectedValueOnce(new Error('MinIO error'));

      const res = await client[':id'].$delete({
        param: { id: 'file1' },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({
        message: 'Internal server error',
      });
    });
  });
});
