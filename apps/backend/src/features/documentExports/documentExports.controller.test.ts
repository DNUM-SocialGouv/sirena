import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { streamDocumentExportResponse } from '../../helpers/file.js';
import { createAccessLog } from '../accessLog/accessLog.service.js';
import { recordDocumentExportDownload } from '../monitoring/metrics.backend.js';
import DocumentExportsController from './documentExports.controller.js';
import { resolveDocumentExportAccess } from './documentExports.service.js';

const EXPORT_ID = '0b7d3c1e-6f0a-4c2b-9d1e-3a4b5c6d7e8f';

const logger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

vi.mock('hono-pino', () => ({
  pinoLogger: () => (c: Context, next: Next) => {
    c.set('logger', logger);
    return next();
  },
}));

vi.mock('../../middlewares/auth.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('userId', 'user-1');
    return next();
  },
}));

vi.mock('../../middlewares/userStatus.middleware.js', () => ({
  default: (_: Context, next: Next) => next(),
}));

vi.mock('../../middlewares/entites.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('topEntiteId', 'root-entite');
    return next();
  },
}));

vi.mock('./documentExports.service.js', () => ({
  resolveDocumentExportAccess: vi.fn(),
}));

vi.mock('../accessLog/accessLog.service.js', () => ({
  createAccessLog: vi.fn(),
}));

vi.mock('../monitoring/metrics.backend.js', () => ({
  recordDocumentExportDownload: vi.fn(),
}));

vi.mock('../../helpers/file.js', () => ({
  streamDocumentExportResponse: vi.fn((c: Context) => c.body('csv', 200)),
}));

const readyExport = {
  id: EXPORT_ID,
  userId: 'user-1',
  status: 'READY',
  fileName: 'export.csv',
  filePath: 'exports/abc.csv',
  mimeType: 'text/csv',
  metadata: { encryption: { iv: 'iv', authTag: 'tag' } },
  expiresAt: new Date('2026-10-26T10:30:00.000Z'),
};

describe('documentExports.controller', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', DocumentExportsController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /:id/access', () => {
    it('tells the requester the file is available, without tracing a download', async () => {
      vi.mocked(resolveDocumentExportAccess).mockResolvedValueOnce({
        status: 'AVAILABLE',
        documentExport: readyExport,
      } as never);

      const res = await client[':id'].access.$get({ param: { id: EXPORT_ID } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: { status: 'AVAILABLE', fileName: 'export.csv', expiresAt: '2026-10-26T10:30:00.000Z' },
      });
      expect(resolveDocumentExportAccess).toHaveBeenCalledWith(EXPORT_ID, 'user-1');
      expect(createAccessLog).not.toHaveBeenCalled();
    });

    it.each([
      { status: 'DENIED', reason: 'ACCESS_DENIED', outcome: 'denied' },
      { status: 'EXPIRED', reason: 'LINK_EXPIRED', outcome: 'expired' },
    ])('traces a refusal for $status with its reason (CA13, CA14)', async ({ status, reason, outcome }) => {
      vi.mocked(resolveDocumentExportAccess).mockResolvedValueOnce({ status } as never);

      const res = await client[':id'].access.$get({ param: { id: EXPORT_ID } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { status, fileName: null, expiresAt: null } });
      expect(createAccessLog).toHaveBeenCalledWith({
        entity: 'DocumentExport',
        entityId: EXPORT_ID,
        action: 'DOWNLOAD_DOCUMENT_EXPORT_REFUSED',
        userId: 'user-1',
        topEntiteId: 'root-entite',
        requestId: null,
        path: `/${EXPORT_ID}/access`,
        dataKeys: [],
        params: { reason },
      });
      expect(recordDocumentExportDownload).toHaveBeenCalledWith(outcome);
    });

    it('rejects a malformed link', async () => {
      const res = await client[':id'].access.$get({ param: { id: 'not-an-id' } });

      expect(res.status).toBe(400);
      expect(resolveDocumentExportAccess).not.toHaveBeenCalled();
    });
  });

  describe('GET /:id/download', () => {
    it('traces the download, linked to the export, then serves the file (CA11, CA12)', async () => {
      vi.mocked(resolveDocumentExportAccess).mockResolvedValueOnce({
        status: 'AVAILABLE',
        documentExport: readyExport,
      } as never);

      const res = await client[':id'].download.$get({ param: { id: EXPORT_ID } });

      expect(res.status).toBe(200);
      expect(createAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'DocumentExport',
          entityId: EXPORT_ID,
          action: 'DOWNLOAD_DOCUMENT_EXPORT',
          userId: 'user-1',
          params: undefined,
        }),
      );
      expect(recordDocumentExportDownload).toHaveBeenCalledWith('downloaded');
      expect(streamDocumentExportResponse).toHaveBeenCalledWith(expect.anything(), readyExport);
    });

    it.each(['DENIED', 'EXPIRED'])('refuses the file when the access is %s, and traces it', async (status) => {
      vi.mocked(resolveDocumentExportAccess).mockResolvedValueOnce({ status } as never);

      const res = await client[':id'].download.$get({ param: { id: EXPORT_ID } });

      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ cause: { code: status } });
      expect(createAccessLog).toHaveBeenCalledTimes(1);
      expect(createAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DOWNLOAD_DOCUMENT_EXPORT_REFUSED' }),
      );
      expect(streamDocumentExportResponse).not.toHaveBeenCalled();
    });
  });
});
