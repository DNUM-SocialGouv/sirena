import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { DOCUMENT_EXPORT_ACCESS_STATUS, ERROR_KIND } from '@sirena/common/constants';
import type { Context } from 'hono';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { streamDocumentExportResponse } from '../../helpers/file.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { createAccessLog } from '../accessLog/accessLog.service.js';
import { AccessLogAction } from '../accessLog/accessLog.type.js';
import { recordDocumentExportDownload } from '../monitoring/metrics.backend.js';
import { getDocumentExportAccessRoute, getDocumentExportDownloadRoute } from './documentExports.route.js';
import { DocumentExportParamsSchema } from './documentExports.schema.js';
import { resolveDocumentExportAccess } from './documentExports.service.js';

const REFUSAL_REASONS = {
  [DOCUMENT_EXPORT_ACCESS_STATUS.DENIED]: 'ACCESS_DENIED',
  [DOCUMENT_EXPORT_ACCESS_STATUS.EXPIRED]: 'LINK_EXPIRED',
} as const;

const DOWNLOAD_OUTCOMES = {
  [DOCUMENT_EXPORT_ACCESS_STATUS.DENIED]: 'denied',
  [DOCUMENT_EXPORT_ACCESS_STATUS.EXPIRED]: 'expired',
} as const;

/**
 * Resolves the access of the current user to the export and traces a refusal. The trace shares
 * the export trace's entityId, so a download can be tied back to the export it comes from.
 */
const checkAccess = async (c: Context, documentExportId: string) => {
  const userId = c.get('userId');
  const access = await resolveDocumentExportAccess(documentExportId, userId);

  if (access.status !== DOCUMENT_EXPORT_ACCESS_STATUS.AVAILABLE) {
    await traceAccess(c, documentExportId, AccessLogAction.DOWNLOAD_DOCUMENT_EXPORT_REFUSED, {
      reason: REFUSAL_REASONS[access.status],
    });
    recordDocumentExportDownload(DOWNLOAD_OUTCOMES[access.status]);
    c.get('logger').warn({ documentExportId, userId, status: access.status }, 'Document export access refused');
  }

  return access;
};

/** The audit trace never decides whether the download works: a failure to write it is only logged. */
const traceAccess = async (
  c: Context,
  documentExportId: string,
  action: AccessLogAction,
  params?: { reason: (typeof REFUSAL_REASONS)[keyof typeof REFUSAL_REASONS] },
) => {
  try {
    await createAccessLog({
      entity: 'DocumentExport',
      entityId: documentExportId,
      action,
      userId: c.get('userId'),
      topEntiteId: c.get('topEntiteId') ?? null,
      requestId: c.req.header('x-request-id') ?? c.res.headers.get('x-request-id'),
      path: c.req.routePath,
      dataKeys: [],
      params,
    });
  } catch (error) {
    c.get('logger').error({ err: error, documentExportId, action }, 'Failed to create the document export access log');
  }
};

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(entitesMiddleware)

  .get('/:id/access', getDocumentExportAccessRoute, zValidator('param', DocumentExportParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const access = await checkAccess(c, id);

    return c.json({
      data: {
        status: access.status,
        fileName: access.status === DOCUMENT_EXPORT_ACCESS_STATUS.AVAILABLE ? access.documentExport.fileName : null,
        expiresAt:
          access.status === DOCUMENT_EXPORT_ACCESS_STATUS.AVAILABLE
            ? access.documentExport.expiresAt.toISOString()
            : null,
      },
    });
  })

  .get('/:id/download', getDocumentExportDownloadRoute, zValidator('param', DocumentExportParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const access = await checkAccess(c, id);

    if (access.status !== DOCUMENT_EXPORT_ACCESS_STATUS.AVAILABLE) {
      throwHTTPException403Forbidden('Document export not available', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
        cause: { code: access.status },
      });
    }

    await traceAccess(c, id, AccessLogAction.DOWNLOAD_DOCUMENT_EXPORT);
    recordDocumentExportDownload('downloaded');
    c.get('logger').info({ documentExportId: id }, 'Document export downloaded');

    return streamDocumentExportResponse(c, access.documentExport);
  });

export default app;
