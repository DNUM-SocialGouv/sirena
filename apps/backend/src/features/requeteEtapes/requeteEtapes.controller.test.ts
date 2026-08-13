import { Readable } from 'node:stream';
import { ERROR_KIND } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { getFileStream } from '../../libs/minio.js';
import type { RequeteEntite, RequeteEtape, RequeteEtapeNote, UploadedFile } from '../../libs/prisma.js';
import { convertDatesToStrings } from '../../tests/formatter.js';
import {
  AcknowledgmentStepAlreadyProcessedError,
  EmailSendingDisabledError,
  sendManualAcknowledgmentEmail,
} from '../declarants/declarants.notification.service.js';
import { hasFeature } from '../featureFlags/featureFlags.service.js';
import {
  getRequeteEntiteById,
  hasAccessToRequete,
  updateStatusRequete,
} from '../requetesEntite/requetesEntite.service.js';
import { getRequeteEtapeUploadedFile } from '../uploadedFiles/uploadedFiles.service.js';
import { getUserById } from '../users/users.service.js';
import { requeteEtapeAuthorization } from './requetesEtapes.authorization.js';
import RequeteEtapesController from './requetesEtapes.controller.js';
import {
  addClotureEtapeFiles,
  createProcessingEtape,
  deleteRequeteEtape,
  EtapeNotEditableError,
  FilesNotOwnedError,
  getRequeteEtapeById,
  getRequeteEtapes,
  updateProcessingEtape,
} from './requetesEtapes.service.js';

vi.mock('../../config/env.js', () => ({
  envVars: {
    SENTRY_ENABLED: false,
  },
}));

vi.mock('../requeteEtapes/requetesEtapes.service.js', () => ({
  getRequeteEtapeById: vi.fn(),
  deleteRequeteEtape: vi.fn(),
  createProcessingEtape: vi.fn(),
  updateProcessingEtape: vi.fn(),
  addClotureEtapeFiles: vi.fn(),
  EtapeNotEditableError: class EtapeNotEditableError extends Error {},
  FilesNotOwnedError: class FilesNotOwnedError extends Error {},
  getRequeteEtapes: vi.fn(),
}));

vi.mock('../declarants/declarants.notification.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../declarants/declarants.notification.service.js')>();
  return {
    ...actual,
    sendManualAcknowledgmentEmail: vi.fn(),
  };
});

vi.mock('../featureFlags/featureFlags.service.js', () => ({
  hasFeature: vi.fn(),
}));

vi.mock('../users/users.service.js', () => ({
  getUserById: vi.fn(),
}));

vi.mock('../uploadedFiles/uploadedFiles.service.js', () => ({
  getRequeteEtapeUploadedFile: vi.fn(),
  isFileBelongsToRequete: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../requetesEntite/requetesEntite.service.js', () => ({
  hasAccessToRequete: vi.fn(() => Promise.resolve(true)),
  getRequeteEntiteById: vi.fn(),
  updateStatusRequete: vi.fn(),
}));

vi.mock('../../middlewares/userStatus.middleware.js', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('user', { email: 'agent@example.test', entiteId: 'e1' });
      return next();
    },
  };
});

vi.mock('../../middlewares/auth.middleware.js', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('userId', 'test-user-id');
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

vi.mock('../../middlewares/entites.middleware.js', () => {
  return {
    default: vi.fn((c: Context, next: Next) => {
      c.set('entiteIds', ['e1', 'e2', 'e3']);
      c.set('topEntiteId', 'e1');
      return next();
    }),
  };
});

vi.mock('../../middlewares/changelog/changelog.requeteEtape.middleware.js', () => {
  return {
    default: () => (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('../../libs/minio.js', () => ({
  getFileStream: vi.fn(),
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

const fakeRequeteEtape: RequeteEtape = {
  id: 'step1',
  requeteId: 'requeteId',
  entiteId: 'e1',
  nom: 'Test FAKE Step',
  type: 'MANUAL',
  statutId: 'A_FAIRE',
  createdAt: new Date(),
  updatedAt: new Date(),
  estPartagee: false,
  acknowledgmentSendMode: null,
  acknowledgmentSendOperationId: null,
  dateRealisation: null,
  createdById: null,
  clotureEffectiveDate: null,
  rappelType: null,
  rappelDate: null,
};

const fakeUpdatedNomRequeteEtape: RequeteEtape = {
  ...fakeRequeteEtape,
  nom: 'Updated Step Name',
  updatedAt: new Date(),
};

const fakeRequeteEntite = {
  statutId: 'EN_COURS',
} as unknown as Awaited<ReturnType<typeof getRequeteEntiteById>>;

describe('requeteEtapes.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequeteEtapesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequeteEtapeById).mockResolvedValue(fakeRequeteEtape);
    vi.mocked(getUserById).mockResolvedValue({ email: 'agent@example.test', entiteId: 'e1' } as never);
    vi.mocked(hasFeature).mockResolvedValue(false);
    vi.mocked(hasAccessToRequete).mockResolvedValue(true);
    vi.mocked(getRequeteEntiteById).mockResolvedValue(fakeRequeteEntite);
    vi.mocked(updateStatusRequete).mockResolvedValue({
      statutId: 'EN_COURS',
      requeteId: 'requeteId',
      entiteId: 'e1',
      prioriteId: null,
    } as RequeteEntite);
  });

  describe('POST /:id/cloture-files', () => {
    it('should attach files to the closure step', async () => {
      vi.mocked(addClotureEtapeFiles).mockResolvedValueOnce(fakeRequeteEtape);

      const res = await client[':id']['cloture-files'].$post({
        param: { id: 'step1' },
        json: { fileIds: ['file1', 'file2'] },
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ data: convertDatesToStrings(fakeRequeteEtape) });
      expect(addClotureEtapeFiles).toHaveBeenCalledWith('step1', 'test-user-id', 'e1', ['file1', 'file2']);
    });

    it('should return 404 if RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id']['cloture-files'].$post({
        param: { id: 'step1' },
        json: { fileIds: ['file1'] },
      });

      expect(res.status).toBe(404);
      expect(addClotureEtapeFiles).not.toHaveBeenCalled();
    });

    it('forbids attaching files to an automatically sent acknowledgment owned by the current perimeter', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        acknowledgmentSendMode: 'AUTOMATIC',
        acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
      });

      const res = await client[':id']['cloture-files'].$post({
        param: { id: 'step1' },
        json: { fileIds: ['file1'] },
      });

      expect(res.status).toBe(403);
      expect(addClotureEtapeFiles).not.toHaveBeenCalled();
    });

    it('forbids attaching files to a foreign Étape partagée', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        entiteId: 'e2',
        estPartagee: true,
      });

      const res = await client[':id']['cloture-files'].$post({
        param: { id: 'step1' },
        json: { fileIds: ['file1'] },
      });

      expect(res.status).toBe(403);
      expect(addClotureEtapeFiles).not.toHaveBeenCalled();
    });

    it('should return 403 if user has no access to requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id']['cloture-files'].$post({
        param: { id: 'step1' },
        json: { fileIds: ['file1'] },
      });

      expect(res.status).toBe(403);
      expect(addClotureEtapeFiles).not.toHaveBeenCalled();
    });

    it('should return 403 if the user does not own the files', async () => {
      vi.mocked(addClotureEtapeFiles).mockRejectedValueOnce(new FilesNotOwnedError('FILES_NOT_OWNED'));

      const res = await client[':id']['cloture-files'].$post({
        param: { id: 'step1' },
        json: { fileIds: ['file1'] },
      });

      expect(res.status).toBe(403);
    });

    it('should return 403 if the step does not accept files (not a closure step)', async () => {
      vi.mocked(addClotureEtapeFiles).mockRejectedValueOnce(new EtapeNotEditableError('ETAPE_NOT_EDITABLE'));

      const res = await client[':id']['cloture-files'].$post({
        param: { id: 'step1' },
        json: { fileIds: ['file1'] },
      });

      expect(res.status).toBe(403);
    });

    it('should validate that at least one file is provided', async () => {
      const res = await client[':id']['cloture-files'].$post({
        param: { id: 'step1' },
        json: { fileIds: [] },
      });

      expect(res.status).toBe(400);
      expect(addClotureEtapeFiles).not.toHaveBeenCalled();
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
      requeteEtapeId: null,
      demarchesEngageesId: null,
      canDelete: true,
      scanStatus: 'PENDING',
      sanitizeStatus: 'PENDING',
      safeFilePath: null,
      scanResult: null,
      processingError: null,
    };

    it('streams the file with correct headers (inline) and body content', async () => {
      const requeteEtapeWithE1 = { ...fakeRequeteEtape, entiteId: 'e1' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithE1);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      vi.mocked(getRequeteEtapeUploadedFile).mockResolvedValueOnce(baseFile);

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

      expect(getRequeteEtapeUploadedFile).toHaveBeenCalledWith('step1', 'file1');
      expect(getFileStream).toHaveBeenCalledWith('/uploads/test.pdf', undefined);
    });

    it('allows an affected reader with sharing enabled to download a foreign Étape partagée file', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        entiteId: 'e2',
        estPartagee: true,
      });
      vi.mocked(hasFeature).mockResolvedValueOnce(true);
      vi.mocked(getRequeteEtapeUploadedFile).mockResolvedValueOnce(baseFile);
      vi.mocked(getFileStream).mockResolvedValueOnce({
        stream: Readable.from(Buffer.from('shared')),
        metadata: { encrypted: false },
      });

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('shared');
      expect(hasFeature).toHaveBeenCalledWith('SHARED_PROCESSING_STEPS', false, 'agent@example.test', 'e1');
      expect(getRequeteEtapeUploadedFile).toHaveBeenCalledWith('step1', 'file1');
    });

    it('denies a foreign Étape partagée file when the reader feature flag is disabled', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        entiteId: 'e2',
        estPartagee: true,
      });

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(403);
      expect(getRequeteEtapeUploadedFile).not.toHaveBeenCalled();
    });

    it('revokes a known foreign file URL as soon as the step becomes private', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        entiteId: 'e2',
        estPartagee: false,
      });
      vi.mocked(hasFeature).mockResolvedValueOnce(true);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(403);
      expect(getRequeteEtapeUploadedFile).not.toHaveBeenCalled();
    });

    it('denies a foreign Étape partagée file when the reader is not affected to the Requête SIRENA', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        entiteId: 'e2',
        estPartagee: true,
      });
      vi.mocked(hasFeature).mockResolvedValueOnce(true);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(403);
      expect(getRequeteEtapeUploadedFile).not.toHaveBeenCalled();
    });

    it('returns 200 with empty body when file size is 0 (no streaming)', async () => {
      const requeteEtapeWithE1 = { ...fakeRequeteEtape, entiteId: 'e1' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithE1);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const emptyFile = { ...baseFile, size: 0 };
      vi.mocked(getRequeteEtapeUploadedFile).mockResolvedValueOnce(emptyFile);

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

    it('denies file reads rejected by the common authorization policy', async () => {
      vi.spyOn(requeteEtapeAuthorization, 'canRead').mockReturnValueOnce(false);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(403);
      expect(requeteEtapeAuthorization.canRead).toHaveBeenCalledWith('e1', fakeRequeteEtape, false);
      expect(hasAccessToRequete).not.toHaveBeenCalled();
      expect(getRequeteEtapeUploadedFile).not.toHaveBeenCalled();
    });

    it('returns 404 when RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'RequeteEtape not found', cause: { kind: ERROR_KIND.BUSINESS } });

      expect(getRequeteEtapeUploadedFile).not.toHaveBeenCalled();
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
        cause: { kind: ERROR_KIND.BUSINESS },
      });

      expect(getRequeteEtapeUploadedFile).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
      expect(hasAccessToRequete).not.toHaveBeenCalled();
    });

    it('returns 404 when the file does not belong to the exact processing step', async () => {
      const requeteEtapeWithE1 = { ...fakeRequeteEtape, entiteId: 'e1' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithE1);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);
      vi.mocked(getRequeteEtapeUploadedFile).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'File not found', cause: { kind: ERROR_KIND.BUSINESS } });

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('falls back to fileName when metadata.originalName is missing', async () => {
      const requeteEtapeWithE1 = { ...fakeRequeteEtape, entiteId: 'e1' };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(requeteEtapeWithE1);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fileNoMeta = { ...baseFile, metadata: null, fileName: 'fallback.pdf' };
      vi.mocked(getRequeteEtapeUploadedFile).mockResolvedValueOnce(fileNoMeta);

      const nodeReadable = Readable.from(Buffer.from('x'));
      vi.mocked(getFileStream).mockResolvedValueOnce({ stream: nodeReadable, metadata: { encrypted: false } });

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toBe('inline; filename="fallback.pdf"');
    });

    it('streams the safe version of a foreign Étape partagée file when available', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        entiteId: 'e2',
        estPartagee: true,
      });
      vi.mocked(hasFeature).mockResolvedValueOnce(true);
      vi.mocked(getRequeteEtapeUploadedFile).mockResolvedValueOnce({
        ...baseFile,
        safeFilePath: '/uploads/safe-test.pdf',
      });
      vi.mocked(getFileStream).mockResolvedValueOnce({
        stream: Readable.from(Buffer.from('safe')),
        metadata: { encrypted: false },
      });

      const res = await client[':id'].file[':fileId'].safe.$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('safe');
      expect(getRequeteEtapeUploadedFile).toHaveBeenCalledWith('step1', 'file1');
      expect(getFileStream).toHaveBeenCalledWith('/uploads/safe-test.pdf', undefined);
    });

    it('keeps the safe file unavailable when no sanitized version exists', async () => {
      vi.mocked(getRequeteEtapeUploadedFile).mockResolvedValueOnce(baseFile);

      const res = await client[':id'].file[':fileId'].safe.$get({
        param: { id: 'step1', fileId: 'file1' },
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ message: 'Safe file not available', cause: { kind: ERROR_KIND.BUSINESS } });
      expect(getFileStream).not.toHaveBeenCalled();
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
        cause: { kind: ERROR_KIND.BUSINESS },
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
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(deleteRequeteEtape).not.toHaveBeenCalled();
    });

    it('forbids deleting an automatically sent acknowledgment owned by the current perimeter', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        acknowledgmentSendMode: 'AUTOMATIC',
        acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
      });

      const res = await client[':id'].$delete({ param: { id: 'step1' } });

      expect(res.status).toBe(403);
      expect(deleteRequeteEtape).not.toHaveBeenCalled();
      expect(updateStatusRequete).not.toHaveBeenCalled();
    });

    it('forbids deleting a foreign Étape partagée', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        entiteId: 'other-entite',
        estPartagee: true,
      });

      const res = await client[':id'].$delete({ param: { id: 'step1' } });

      expect(res.status).toBe(403);
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
      type: 'MANUAL',
      estPartagee: false,
      acknowledgmentSendMode: null,
      acknowledgmentSendOperationId: null,
      dateRealisation: null,
      statutId: 'A_FAIRE',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: null,
      clotureEffectiveDate: null,
      rappelType: null,
      rappelDate: null,
    };

    const note: RequeteEtapeNote = {
      id: 'noteId',
      texte: 'Note 1',
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: 'authorId',
      requeteEtapeId: 'requeteEtapeId',
    };

    const uploadedFile: Pick<UploadedFile, 'id' | 'fileName' | 'size'> = {
      id: 'uploadedFileId',
      fileName: 'file1.pdf',
      size: 1024,
    };

    const requeteEtapeWithNotesAndFiles: RequeteEtape & {
      notes: (RequeteEtapeNote & {
        author: { prenom: string; nom: string };
        uploadedFiles: Pick<UploadedFile, 'id' | 'fileName' | 'size' | 'status' | 'scanStatus' | 'sanitizeStatus'>[];
      })[];
      clotureReason: { label: string }[];
      createdBy: { prenom: string; nom: string } | null;
      uploadedFiles: (Pick<
        UploadedFile,
        'id' | 'fileName' | 'size' | 'status' | 'scanStatus' | 'sanitizeStatus' | 'canDelete' | 'createdAt'
      > & { uploadedBy: { prenom: string; nom: string } | null })[];
      requete: {
        createdById: string | null;
        dematSocialId: number | null;
        sirecId: number | null;
        thirdPartyAccountId: string | null;
        createdBy: { prenom: string; nom: string } | null;
      };
      editable: boolean;
      canOnlyEditNotes: boolean;
      timelineItemType: 'ENTITY_STEP';
      attributedEntiteAdministrative: { id: string; nomComplet: string; entiteTypeId: string };
      entiteAdministrative: { id: string; nomComplet: string; entiteTypeId: string };
    } = {
      ...requeteEtape,
      clotureReason: [],
      createdBy: null,
      uploadedFiles: [],
      requete: { createdById: null, dematSocialId: null, sirecId: null, thirdPartyAccountId: null, createdBy: null },
      editable: true,
      canOnlyEditNotes: false,
      timelineItemType: 'ENTITY_STEP',
      attributedEntiteAdministrative: {
        id: 'entiteId',
        nomComplet: 'ARS Normandie',
        entiteTypeId: 'ARS',
      },
      entiteAdministrative: {
        id: 'entiteId',
        nomComplet: 'ARS Normandie',
        entiteTypeId: 'ARS',
      },
      notes: [
        {
          ...note,
          author: { prenom: 'John', nom: 'Doe' },
          uploadedFiles: [{ ...uploadedFile, status: '', scanStatus: '', sanitizeStatus: '' }],
        },
      ],
    };

    it('should return processing steps for a requete', async () => {
      vi.mocked(getRequeteEtapes).mockResolvedValueOnce({
        data: [requeteEtapeWithNotesAndFiles],
        total: 2,
        isMultiEntite: true,
      });

      const res = await client[':id']['processing-steps'].$get({
        param: { id: '1' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings([requeteEtapeWithNotesAndFiles]),
        meta: { total: 2, isMultiEntite: true, etapePartageeEnabled: false },
      });

      expect(getRequeteEtapes).toHaveBeenCalledWith('1', 'e1', {}, false);
    });

    it('returns a complete projected chronology in service order with visible-item metadata', async () => {
      const automaticAcknowledgmentFile = {
        id: 'acknowledgment-file',
        fileName: 'accuse-reception.pdf',
        size: 1024,
        status: 'READY',
        scanStatus: 'CLEAN',
        sanitizeStatus: 'COMPLETED',
        canDelete: false,
        createdAt: new Date('2026-06-01T08:00:00.000Z'),
        uploadedBy: null,
      };
      vi.mocked(hasFeature).mockResolvedValueOnce(true);
      vi.mocked(getRequeteEtapes).mockResolvedValueOnce({
        data: [
          {
            ...requeteEtapeWithNotesAndFiles,
            id: 'later-automatic-acknowledgment',
            type: 'ACKNOWLEDGMENT',
            acknowledgmentSendMode: 'AUTOMATIC',
            acknowledgmentSendOperationId: '22222222-2222-4222-8222-222222222222',
            timelineItemType: 'NEUTRAL_EVENT' as const,
            attributedEntiteAdministrative: null,
            uploadedFiles: [{ ...automaticAcknowledgmentFile, id: 'later-acknowledgment-file' }],
            editable: false,
          },
          {
            ...requeteEtapeWithNotesAndFiles,
            id: 'owner-step',
          },
          {
            ...requeteEtapeWithNotesAndFiles,
            id: 'foreign-shared-step',
            entiteId: 'e2',
            estPartagee: true,
            editable: false,
            attributedEntiteAdministrative: { id: 'e2', nomComplet: 'CD du Calvados', entiteTypeId: 'CD' },
            entiteAdministrative: { id: 'e2', nomComplet: 'CD du Calvados', entiteTypeId: 'CD' },
          },
          {
            ...requeteEtapeWithNotesAndFiles,
            id: 'first-grouped-automatic-acknowledgment',
            type: 'ACKNOWLEDGMENT',
            acknowledgmentSendMode: 'AUTOMATIC',
            acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
            timelineItemType: 'NEUTRAL_EVENT' as const,
            attributedEntiteAdministrative: null,
            uploadedFiles: [automaticAcknowledgmentFile],
            editable: false,
          },
          {
            ...requeteEtapeWithNotesAndFiles,
            id: 'neutral-creation',
            type: 'CREATION',
            timelineItemType: 'NEUTRAL_EVENT' as const,
            attributedEntiteAdministrative: null,
            editable: false,
          },
        ],
        total: 5,
        isMultiEntite: true,
      });

      const res = await client[':id']['processing-steps'].$get({ param: { id: '1' } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.meta).toEqual({ total: 5, isMultiEntite: true, etapePartageeEnabled: true });
      expect(json.data.map((step) => step.id)).toEqual([
        'later-automatic-acknowledgment',
        'owner-step',
        'foreign-shared-step',
        'first-grouped-automatic-acknowledgment',
        'neutral-creation',
      ]);
      expect(json.data).toMatchObject([
        {
          acknowledgmentSendOperationId: '22222222-2222-4222-8222-222222222222',
          timelineItemType: 'NEUTRAL_EVENT',
          attributedEntiteAdministrative: null,
          uploadedFiles: [{ id: 'later-acknowledgment-file' }],
          editable: false,
        },
        {
          timelineItemType: 'ENTITY_STEP',
          attributedEntiteAdministrative: { id: 'entiteId', nomComplet: 'ARS Normandie', entiteTypeId: 'ARS' },
        },
        {
          estPartagee: true,
          editable: false,
          timelineItemType: 'ENTITY_STEP',
          attributedEntiteAdministrative: { id: 'e2', nomComplet: 'CD du Calvados', entiteTypeId: 'CD' },
        },
        {
          acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
          timelineItemType: 'NEUTRAL_EVENT',
          attributedEntiteAdministrative: null,
          uploadedFiles: [{ id: 'acknowledgment-file' }],
          editable: false,
        },
        { type: 'CREATION', timelineItemType: 'NEUTRAL_EVENT', attributedEntiteAdministrative: null, editable: false },
      ]);
    });

    it('requests the shared chronology only when the targeted feature is enabled', async () => {
      vi.mocked(hasFeature).mockResolvedValueOnce(true);
      vi.mocked(getRequeteEtapes).mockResolvedValueOnce({ data: [], total: 0, isMultiEntite: true });

      const res = await client[':id']['processing-steps'].$get({ param: { id: '1' } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [],
        meta: { total: 0, isMultiEntite: true, etapePartageeEnabled: true },
      });
      expect(hasFeature).toHaveBeenCalledWith('SHARED_PROCESSING_STEPS', false, 'agent@example.test', 'e1');
      expect(getUserById).not.toHaveBeenCalled();
      expect(getRequeteEtapes).toHaveBeenCalledWith('1', 'e1', {}, true);
    });

    it('should return 400 if topEntiteId is missing', async () => {
      vi.mocked(getRequeteEtapes).mockResolvedValueOnce({ data: [], total: 0, isMultiEntite: false });

      const res = await client[':id']['processing-steps'].$get({
        param: { id: 'nonexistent' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: [],
        meta: { total: 0, isMultiEntite: false, etapePartageeEnabled: false },
      });
    });
  });

  describe('POST /:id/processing-steps', () => {
    it('should add a processing step', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const fakeStep: RequeteEtape = {
        id: 'step1',
        requeteId: '1',
        nom: 'Step 1',
        type: 'MANUAL',
        statutId: 'FAIT',
        createdAt: new Date(0),
        updatedAt: new Date(0),
        entiteId: 'e1',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      vi.mocked(createProcessingEtape).mockResolvedValueOnce(fakeStep);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { nom: 'Step 1' },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(fakeStep) });
      expect(createProcessingEtape).toHaveBeenCalledWith(
        '1',
        'e1',
        'test-user-id',
        {
          nom: 'Step 1',
          notes: [],
          fileIds: [],
          estPartagee: false,
        },
        expect.anything(),
      );
    });

    it('requires an explicit sharing choice when the feature is enabled', async () => {
      vi.mocked(hasFeature).mockResolvedValueOnce(true);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { nom: 'Step 1' },
      });

      expect(res.status).toBe(400);
      expect(createProcessingEtape).not.toHaveBeenCalled();
    });

    it('should reject a custom reminder without a date', async () => {
      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { nom: 'Step 1', rappelType: 'PERSONNALISE' },
      });

      expect(res.status).toBe(400);
      expect(createProcessingEtape).not.toHaveBeenCalled();
    });

    it('checks access before requiring a sharing choice', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValue(false);
      vi.mocked(hasFeature).mockResolvedValue(true);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: 'inaccessible' },
        json: { nom: 'Step 1' },
      });

      vi.mocked(hasAccessToRequete).mockResolvedValue(true);
      vi.mocked(hasFeature).mockResolvedValue(false);

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        message: 'Requete entite not found',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(hasAccessToRequete).toHaveBeenCalledWith({ requeteId: 'inaccessible', entiteId: 'e1' });
      expect(hasFeature).not.toHaveBeenCalled();
      expect(createProcessingEtape).not.toHaveBeenCalled();
    });

    it('persists the sharing choice atomically when the feature is enabled', async () => {
      vi.mocked(hasFeature).mockResolvedValueOnce(true);
      vi.mocked(createProcessingEtape).mockResolvedValueOnce(fakeRequeteEtape);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { nom: 'Step 1', estPartagee: true },
      });

      expect(res.status).toBe(201);
      expect(createProcessingEtape).toHaveBeenCalledWith(
        '1',
        'e1',
        'test-user-id',
        { nom: 'Step 1', notes: [], fileIds: [], estPartagee: true },
        expect.anything(),
      );
    });

    it('cannot force sharing through a direct request when the feature is disabled', async () => {
      vi.mocked(createProcessingEtape).mockResolvedValueOnce(fakeRequeteEtape);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { nom: 'Step 1', estPartagee: true },
      });

      expect(res.status).toBe(201);
      expect(createProcessingEtape).toHaveBeenCalledWith(
        '1',
        'e1',
        'test-user-id',
        { nom: 'Step 1', notes: [], fileIds: [], estPartagee: false },
        expect.anything(),
      );
    });

    it('should return 404 if hasAccessToRequete returns false', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);
      vi.mocked(createProcessingEtape).mockResolvedValueOnce(null);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: 'nonexistent' },
        json: { nom: 'Step 1' },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requete entite not found', cause: { kind: ERROR_KIND.BUSINESS } });
    });

    it('should return 404 if step is not created', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      vi.mocked(createProcessingEtape).mockResolvedValueOnce(null);

      const res = await client[':id']['processing-steps'].$post({
        param: { id: '1' },
        json: { nom: 'Step 1' },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requete entite not found', cause: { kind: ERROR_KIND.BUSINESS } });
      expect(createProcessingEtape).toHaveBeenCalledWith(
        '1',
        'e1',
        'test-user-id',
        {
          nom: 'Step 1',
          notes: [],
          fileIds: [],
          estPartagee: false,
        },
        expect.anything(),
      );
    });
  });

  describe('POST /:id/send-acknowledgment', () => {
    it('returns a conflict when the acknowledgment step has already been processed', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        type: 'ACKNOWLEDGMENT',
      });
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce({
        requete: { declarant: { identite: { email: 'declarant@example.test' } } },
      } as never);
      vi.mocked(sendManualAcknowledgmentEmail).mockRejectedValueOnce(new AcknowledgmentStepAlreadyProcessedError());

      const res = await client[':id']['send-acknowledgment'].$post({
        param: { id: 'step1' },
        json: {},
      });

      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        message: "L'accusé de réception a déjà été envoyé pour cette étape.",
        cause: { kind: ERROR_KIND.BUSINESS },
      });
    });

    it('returns a service unavailable business error when email sending is disabled', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        type: 'ACKNOWLEDGMENT',
      });
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce({
        requete: { declarant: { identite: { email: 'declarant@example.test' } } },
      } as never);
      vi.mocked(sendManualAcknowledgmentEmail).mockRejectedValueOnce(new EmailSendingDisabledError());

      const res = await client[':id']['send-acknowledgment'].$post({
        param: { id: 'step1' },
        json: {},
      });

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        message: "L'envoi des e-mails est actuellement désactivé.",
        cause: { kind: ERROR_KIND.BUSINESS },
      });
    });
  });

  describe('PATCH /:id', () => {
    const validBody = { nom: 'Updated', statutId: 'A_FAIRE' as const, notes: [], fileIds: [] };

    it('updates a step and returns 200', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(fakeRequeteEtape);
      vi.mocked(updateProcessingEtape).mockResolvedValueOnce(fakeUpdatedNomRequeteEtape);

      const res = await client[':id'].$patch({ param: { id: 'step1' }, json: validBody });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(fakeUpdatedNomRequeteEtape) });
      expect(updateProcessingEtape).toHaveBeenCalledWith(
        'step1',
        'test-user-id',
        { ...validBody, estPartagee: undefined },
        expect.anything(),
      );
    });

    it('allows another agent from the owner root perimeter to update an editable step', async () => {
      const stepCreatedByAnotherAgent = {
        ...fakeRequeteEtape,
        createdById: 'creator-agent-id',
      };
      const stepUpdatedByCurrentAgent = {
        ...stepCreatedByAnotherAgent,
        nom: 'Updated',
      };
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(stepCreatedByAnotherAgent);
      vi.mocked(updateProcessingEtape).mockResolvedValueOnce(stepUpdatedByCurrentAgent);

      const res = await client[':id'].$patch({ param: { id: 'step1' }, json: validBody });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: convertDatesToStrings(stepUpdatedByCurrentAgent) });
    });

    it('updates sharing on an owned manual step when the feature is enabled', async () => {
      vi.mocked(hasFeature).mockResolvedValueOnce(true);
      vi.mocked(updateProcessingEtape).mockResolvedValueOnce({ ...fakeUpdatedNomRequeteEtape, estPartagee: false });

      const res = await client[':id'].$patch({
        param: { id: 'step1' },
        json: { ...validBody, estPartagee: false },
      });

      expect(res.status).toBe(200);
      expect(updateProcessingEtape).toHaveBeenCalledWith(
        'step1',
        'test-user-id',
        { ...validBody, estPartagee: false },
        expect.anything(),
      );
    });

    it('forbids changing notes and files on an automatically sent acknowledgment owned by the current perimeter', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        acknowledgmentSendMode: 'AUTOMATIC',
        acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
      });

      const res = await client[':id'].$patch({
        param: { id: 'step1' },
        json: { ...validBody, notes: [{ texte: 'Forbidden note' }], fileIds: ['forbidden-file'] },
      });

      expect(res.status).toBe(403);
      expect(updateProcessingEtape).not.toHaveBeenCalled();
      expect(updateStatusRequete).not.toHaveBeenCalled();
    });

    it('denies updates rejected by the common authorization policy', async () => {
      vi.spyOn(requeteEtapeAuthorization, 'canWrite').mockReturnValueOnce(false);

      const res = await client[':id'].$patch({ param: { id: 'step1' }, json: validBody });

      expect(res.status).toBe(403);
      expect(requeteEtapeAuthorization.canWrite).toHaveBeenCalledWith('e1', fakeRequeteEtape);
      expect(hasAccessToRequete).not.toHaveBeenCalled();
      expect(updateProcessingEtape).not.toHaveBeenCalled();
    });

    it('returns 404 if RequeteEtape not found', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(null);

      const res = await client[':id'].$patch({ param: { id: 'nope' }, json: validBody });

      expect(res.status).toBe(404);
      expect(updateProcessingEtape).not.toHaveBeenCalled();
    });

    it('forbids the creator from changing notes or files after leaving the owner root perimeter', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce({
        ...fakeRequeteEtape,
        entiteId: 'other-entite',
        estPartagee: true,
        createdById: 'test-user-id',
      });

      const res = await client[':id'].$patch({
        param: { id: 'step1' },
        json: {
          ...validBody,
          notes: [{ texte: 'Foreign note' }],
          fileIds: ['foreign-file'],
        },
      });

      expect(res.status).toBe(403);
      expect(updateProcessingEtape).not.toHaveBeenCalled();
    });

    it('returns 403 if the step is not editable', async () => {
      vi.mocked(getRequeteEtapeById).mockResolvedValueOnce(fakeRequeteEtape);
      vi.mocked(updateProcessingEtape).mockRejectedValueOnce(new EtapeNotEditableError('ETAPE_NOT_EDITABLE'));

      const res = await client[':id'].$patch({ param: { id: 'step1' }, json: validBody });

      expect(res.status).toBe(403);
    });

    it('validates the body (status EN_COURS is rejected)', async () => {
      const res = await client[':id'].$patch({
        param: { id: 'step1' },
        json: { ...validBody, statutId: 'EN_COURS' as never },
      });

      expect(res.status).toBe(400);
    });
  });
});
