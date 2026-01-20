import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { deleteFileFromMinio, uploadFileToMinio } from '../../libs/minio.js';
import type { UploadedFile } from '../../libs/prisma.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import extractUploadedFileMiddleware from '../../middlewares/upload.middleware.js';
import { convertDatesToStrings } from '../../tests/formatter.js';
import UploadedFilesController from './uploadedFiles.controller.js';
import { createUploadedFile, deleteUploadedFile, getUploadedFileById } from './uploadedFiles.service.js';

vi.mock('../config/env.js', () => ({
  envVars: {
    SENTRY_ENABLED: false,
  },
}));

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
  canDelete: true,
  scanStatus: 'PENDING',
  sanitizeStatus: 'PENDING',
  safeFilePath: null,
  scanResult: null,
  processingError: null,
};

const fakeData: UploadedFile[] = [fakeFile];

const signedUrl = 'https://test-signed-url.com';

vi.mock('../../libs/minio.js', () => ({
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

vi.mock('./uploadedFiles.service.js', () => ({
  createUploadedFile: vi.fn(() => Promise.resolve(fakeFile)),
  getUploadedFiles: vi.fn(() => Promise.resolve({ data: fakeData, total: 1 })),
  getUploadedFileById: vi.fn(() => Promise.resolve(fakeFile)),
  deleteUploadedFile: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../middlewares/upload.middleware.js', () => ({
  default: vi.fn((c: Context, next: Next) => {
    c.set('uploadedFile', {
      buffer: Buffer.from('test pdf content'),
      fileName: fakeFile.fileName,
      contentType: fakeFile.mimeType,
      size: fakeFile.size,
    });
    return next();
  }),
}));

vi.mock('../../middlewares/userStatus.middleware.js', () => {
  return {
    default: (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('../../middlewares/entites.middleware.js', () => {
  return {
    default: vi.fn((c: Context, next: Next) => {
      c.set('topEntiteId', 'e1');
      return next();
    }),
  };
});

vi.mock('../../middlewares/auth.middleware.js', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('userId', 'id10');
      return next();
    },
  };
});

vi.mock('../../middlewares/role.middleware.js', () => {
  return {
    default: () => {
      return (c: Context, next: Next) => {
        c.set('roleId', 'ENTITY_ADMIN');
        return next();
      };
    },
  };
});

vi.mock('../../middlewares/changelog/changelog.uploadedFile.middleware.js', () => {
  return {
    default: () => {
      return (_c: Context, next: Next) => {
        return next();
      };
    },
  };
});

vi.mock('../../jobs/queues/fileProcessing.queue.js', () => ({
  addFileProcessingJob: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../helpers/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../helpers/errors.js')>('../../helpers/errors.js');
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

describe('uploadedFiles.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', UploadedFilesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a uploaded file', async () => {
      const res = await client.index.$post();
      const body = await res.json();

      expect(createUploadedFile).toHaveBeenCalledTimes(1);
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

    it('should return a 400 error if topEntiteId is not set', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('topEntiteId', null);
        return next();
      });

      const res = await client.index.$post();
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to create uploaded files without topEntiteId.',
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
          objectPath: '',
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
        param: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
      expect(getUploadedFileById).toHaveBeenCalledWith('ffffffff-ffff-ffff-ffff-ffffffffffff', ['e1']);
      expect(deleteUploadedFile).toHaveBeenCalledWith('ffffffff-ffff-ffff-ffff-ffffffffffff');
      expect(deleteFileFromMinio).toHaveBeenCalledWith('/uploads/test.pdf');
    });

    it('should return 400 if topEntiteId is not set', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('topEntiteId', null);
        return next();
      });

      const res = await client[':id'].$delete({
        param: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
      });

      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to delete uploaded files without topEntiteId.',
      });
      expect(deleteUploadedFile).not.toHaveBeenCalled();
      expect(deleteFileFromMinio).not.toHaveBeenCalled();
    });

    it('should return 404 if uploaded file not found', async () => {
      vi.mocked(getUploadedFileById).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].$delete({
        param: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
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
        param: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
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
        param: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({
        message: 'Internal server error',
      });
    });
  });

  describe('GET /:id/status', () => {
    it('should return file processing status', async () => {
      const res = await client[':id'].status.$get({
        param: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        data: {
          id: fakeFile.id,
          status: fakeFile.status,
          scanStatus: fakeFile.scanStatus,
          sanitizeStatus: fakeFile.sanitizeStatus,
          processingError: fakeFile.processingError,
          safeFilePath: fakeFile.safeFilePath,
        },
      });
    });

    it('should return 400 if topEntiteId is not set', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('topEntiteId', null);
        return next();
      });

      const res = await client[':id'].status.$get({
        param: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
      });

      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to access uploaded files without topEntiteId.',
      });
    });

    it('should return 404 if file not found', async () => {
      vi.mocked(getUploadedFileById).mockImplementationOnce(() => Promise.resolve(null));

      const res = await client[':id'].status.$get({
        param: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({
        message: 'Uploaded file not found',
      });
    });
  });
});
