import { Readable } from 'node:stream';
import { ERROR_KIND, REQUETE_MESSAGE_MAX_LENGTH, REQUETE_STATUT_TYPES, ROLES } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { getFileStream } from '../../libs/minio.js';
import type { UploadedFile } from '../../libs/prisma.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import { hasFeature } from '../featureFlags/featureFlags.service.js';
import { getRequeteEntiteStatutId, hasAccessToRequete } from '../requetesEntite/requetesEntite.service.js';
import {
  FilesNotOwnedError,
  getRequeteMessageUploadedFile,
  getUploadedFileById,
} from '../uploadedFiles/uploadedFiles.service.js';
import RequeteMessagesController from './requeteMessages.controller.js';
import {
  createRequeteMessage,
  getRequeteMessages,
  getUnreadCount,
  markAllMessagesAsRead,
} from './requeteMessages.service.js';

const roleState = vi.hoisted(() => ({ current: 'ENTITY_ADMIN' as string }));

vi.mock('../../config/env.js', () => ({
  envVars: {
    SENTRY_ENABLED: false,
  },
}));

vi.mock('./requeteMessages.service.js', () => ({
  createRequeteMessage: vi.fn(),
  getRequeteMessages: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllMessagesAsRead: vi.fn(),
}));

vi.mock('../featureFlags/featureFlags.service.js', () => ({
  hasFeature: vi.fn(),
}));

vi.mock('../requetesEntite/requetesEntite.service.js', () => ({
  hasAccessToRequete: vi.fn(),
  getRequeteEntiteStatutId: vi.fn(),
}));

vi.mock('../uploadedFiles/uploadedFiles.service.js', () => ({
  FilesNotOwnedError: class FilesNotOwnedError extends Error {},
  getRequeteMessageUploadedFile: vi.fn(),
  getUploadedFileById: vi.fn(),
}));

vi.mock('../../middlewares/auth.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    return next();
  },
}));

vi.mock('../../middlewares/userStatus.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('user', { email: 'agent@example.test', entiteId: 'e1' });
    return next();
  },
}));

vi.mock('../../middlewares/role.middleware.js', () => ({
  default: (allowedRoles: readonly string[]) => (c: Context, next: Next) => {
    if (!allowedRoles.includes(roleState.current)) {
      return c.json({ message: 'Forbidden' }, 403);
    }
    c.set('roleId', roleState.current);
    return next();
  },
}));

vi.mock('../../middlewares/entites.middleware.js', () => ({
  default: vi.fn((c: Context, next: Next) => {
    c.set('entiteIds', ['e1', 'e2']);
    c.set('topEntiteId', 'e1');
    return next();
  }),
}));

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

const REQUETE_ID = 'REQ';
const MESSAGE_ID = '11111111-1111-4111-8111-111111111111';

const fakeMessage = {
  id: MESSAGE_ID,
  requeteId: REQUETE_ID,
  contenu: 'Bonjour',
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  entite: { id: 'e1', nomComplet: 'ARS', entiteTypeId: 'ARS' },
  author: { prenom: 'Jean', nom: 'Dupont' },
  uploadedFiles: [],
  isReadByCurrentUser: true,
};

const fakeFile: UploadedFile = {
  id: 'file1',
  fileName: 'report.pdf',
  filePath: '/uploads/test.pdf',
  mimeType: 'application/pdf',
  size: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: null,
  entiteId: 'e1',
  status: 'COMPLETED',
  requeteEtapeId: null,
  faitSituationId: null,
  requeteId: null,
  requeteMessageId: MESSAGE_ID,
  uploadedById: 'test-user-id',
  demarchesEngageesId: null,
  canDelete: false,
  scanStatus: 'CLEAN',
  sanitizeStatus: 'DONE',
  safeFilePath: '/uploads/safe.pdf',
  scanResult: null,
  processingError: null,
};

const withoutTopEntiteId = () => {
  vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
    c.set('topEntiteId', null);
    return next();
  });
};

describe('requeteMessages.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequeteMessagesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    roleState.current = ROLES.ENTITY_ADMIN;
    vi.mocked(hasFeature).mockResolvedValue(true);
    vi.mocked(hasAccessToRequete).mockResolvedValue(true);
    vi.mocked(getRequeteEntiteStatutId).mockResolvedValue(REQUETE_STATUT_TYPES.EN_COURS);
    vi.mocked(getRequeteMessages).mockResolvedValue({
      data: [fakeMessage],
      meta: { hasMore: false, nextCursor: null },
    } as unknown as Awaited<ReturnType<typeof getRequeteMessages>>);
    vi.mocked(getUnreadCount).mockResolvedValue(2);
    vi.mocked(markAllMessagesAsRead).mockResolvedValue({ markedIds: [MESSAGE_ID], unreadCount: 0 });
    vi.mocked(createRequeteMessage).mockResolvedValue(
      fakeMessage as unknown as Awaited<ReturnType<typeof createRequeteMessage>>,
    );
  });

  describe('GET /:requeteId', () => {
    it('lists the messages of the requete for the current user', async () => {
      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: {} });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(getRequeteMessages).toHaveBeenCalledWith(REQUETE_ID, 'test-user-id', { limit: 50 });
      expect(body).toEqual({
        data: [{ ...fakeMessage, createdAt: fakeMessage.createdAt.toISOString() }],
        meta: { hasMore: false, nextCursor: null },
      });
    });

    it('forwards the after cursor to catch up on newer messages', async () => {
      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: { after: MESSAGE_ID } });

      expect(res.status).toBe(200);
      expect(getRequeteMessages).toHaveBeenCalledWith(REQUETE_ID, 'test-user-id', { limit: 50, after: MESSAGE_ID });
    });

    it('returns 400 when the user has no root entity', async () => {
      withoutTopEntiteId();

      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: {} });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to read requetes without topEntiteId.',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(getRequeteMessages).not.toHaveBeenCalled();
    });

    it('hides the requete behind a 404 when the feature flag is disabled', async () => {
      vi.mocked(hasFeature).mockResolvedValueOnce(false);

      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: {} });

      expect(res.status).toBe(404);
      expect(getRequeteMessages).not.toHaveBeenCalled();
    });

    it('hides the requete behind a 404 when the entity is not affected to it', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: {} });

      expect(res.status).toBe(404);
      expect(getRequeteMessages).not.toHaveBeenCalled();
    });

    it.each([
      ['a limit below the minimum', { limit: '0' }],
      ['a limit above the maximum', { limit: '101' }],
      ['a cursor that is not a uuid', { before: 'not-a-uuid' }],
      ['an after cursor that is not a uuid', { after: 'not-a-uuid' }],
      ['both cursors at once', { before: MESSAGE_ID, after: MESSAGE_ID }],
    ])('rejects %s with a 400', async (_label, query) => {
      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query });

      expect(res.status).toBe(400);
      expect(getRequeteMessages).not.toHaveBeenCalled();
    });
  });

  describe('GET /:requeteId/unread-count', () => {
    it('returns the unread count of the current user', async () => {
      const res = await client[':requeteId']['unread-count'].$get({ param: { requeteId: REQUETE_ID } });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ data: { unreadCount: 2 } });
      expect(getUnreadCount).toHaveBeenCalledWith(REQUETE_ID, 'test-user-id');
    });

    it('returns 404 when the entity is not affected to the requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':requeteId']['unread-count'].$get({ param: { requeteId: REQUETE_ID } });

      expect(res.status).toBe(404);
      expect(getUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe('POST /:requeteId/read', () => {
    it('marks every message of the requete as read and returns the refreshed unread count', async () => {
      const res = await client[':requeteId'].read.$post({ param: { requeteId: REQUETE_ID } });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ data: { unreadCount: 0 } });
      expect(markAllMessagesAsRead).toHaveBeenCalledWith(REQUETE_ID, 'test-user-id', 'e1');
    });

    it('is allowed to a reader', async () => {
      roleState.current = ROLES.READER;

      const res = await client[':requeteId'].read.$post({ param: { requeteId: REQUETE_ID } });

      expect(res.status).toBe(200);
      expect(markAllMessagesAsRead).toHaveBeenCalledOnce();
    });

    it('returns 404 when the entity is not affected to the requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':requeteId'].read.$post({ param: { requeteId: REQUETE_ID } });

      expect(res.status).toBe(404);
      expect(markAllMessagesAsRead).not.toHaveBeenCalled();
    });
  });

  describe('POST /:requeteId', () => {
    it('creates the message', async () => {
      const res = await client[':requeteId'].$post({
        param: { requeteId: REQUETE_ID },
        json: { contenu: 'Bonjour', fileIds: ['f1'] },
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual({ data: { ...fakeMessage, createdAt: fakeMessage.createdAt.toISOString() } });
      expect(createRequeteMessage).toHaveBeenCalledWith(
        REQUETE_ID,
        'e1',
        'test-user-id',
        { contenu: 'Bonjour', fileIds: ['f1'] },
        expect.anything(),
      );
    });

    it('forbids a reader from posting', async () => {
      roleState.current = ROLES.READER;

      const res = await client[':requeteId'].$post({
        param: { requeteId: REQUETE_ID },
        json: { contenu: 'Bonjour' },
      });

      expect(res.status).toBe(403);
      expect(createRequeteMessage).not.toHaveBeenCalled();
    });

    it('forbids posting on a requete closed for the caller entity', async () => {
      vi.mocked(getRequeteEntiteStatutId).mockResolvedValueOnce(REQUETE_STATUT_TYPES.CLOTUREE);

      const res = await client[':requeteId'].$post({
        param: { requeteId: REQUETE_ID },
        json: { contenu: 'Bonjour' },
      });
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'La requête est clôturée pour votre entité.',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(createRequeteMessage).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty message without attachment', { contenu: '   ', fileIds: [] }],
      ['a content above the maximum length', { contenu: 'a'.repeat(REQUETE_MESSAGE_MAX_LENGTH + 1), fileIds: [] }],
      ['duplicated attachments', { contenu: '', fileIds: ['f1', 'f1'] }],
    ])('rejects %s with a 400', async (_label, json) => {
      const res = await client[':requeteId'].$post({ param: { requeteId: REQUETE_ID }, json });

      expect(res.status).toBe(400);
      expect(createRequeteMessage).not.toHaveBeenCalled();
    });

    it('returns 403 when the attachments do not belong to the author', async () => {
      vi.mocked(createRequeteMessage).mockRejectedValueOnce(new FilesNotOwnedError('FILES_NOT_OWNED'));

      const res = await client[':requeteId'].$post({
        param: { requeteId: REQUETE_ID },
        json: { contenu: '', fileIds: ['f1'] },
      });
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({
        message: 'You are not allowed to add these files',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
    });
  });

  describe('GET /:requeteId/file/:fileId', () => {
    it('streams a file attached to a message of the requete', async () => {
      vi.mocked(getRequeteMessageUploadedFile).mockResolvedValueOnce(fakeFile);
      vi.mocked(getFileStream).mockResolvedValueOnce({
        stream: Readable.from(Buffer.from('hello')),
        metadata: { encrypted: false },
      });

      const res = await client[':requeteId'].file[':fileId'].$get({
        param: { requeteId: REQUETE_ID, fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('hello');
      expect(res.headers.get('content-disposition')).toBe('inline; filename="report.pdf"');
      expect(getRequeteMessageUploadedFile).toHaveBeenCalledWith(REQUETE_ID, 'file1');
      expect(getUploadedFileById).not.toHaveBeenCalled();
    });

    it('returns 404 when the file is not attached to a message of this requete', async () => {
      vi.mocked(getRequeteMessageUploadedFile).mockResolvedValueOnce(null);

      const res = await client[':requeteId'].file[':fileId'].$get({
        param: { requeteId: REQUETE_ID, fileId: 'file1' },
      });

      expect(res.status).toBe(404);
      expect(getFileStream).not.toHaveBeenCalled();
    });
  });

  describe('GET /:requeteId/file/:fileId/safe', () => {
    it('streams the sanitized version of the file', async () => {
      vi.mocked(getRequeteMessageUploadedFile).mockResolvedValueOnce(fakeFile);
      vi.mocked(getFileStream).mockResolvedValueOnce({
        stream: Readable.from(Buffer.from('safe content')),
        metadata: { encrypted: false },
      });

      const res = await client[':requeteId'].file[':fileId'].safe.$get({
        param: { requeteId: REQUETE_ID, fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('safe content');
      expect(getFileStream).toHaveBeenCalledWith('/uploads/safe.pdf', undefined);
    });

    it('returns 404 when no sanitized version is available yet', async () => {
      vi.mocked(getRequeteMessageUploadedFile).mockResolvedValueOnce({ ...fakeFile, safeFilePath: null });

      const res = await client[':requeteId'].file[':fileId'].safe.$get({
        param: { requeteId: REQUETE_ID, fileId: 'file1' },
      });

      expect(res.status).toBe(404);
      expect(getFileStream).not.toHaveBeenCalled();
    });
  });
});
