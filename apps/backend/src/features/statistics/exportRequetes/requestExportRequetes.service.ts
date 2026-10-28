import { randomUUID } from 'node:crypto';
import { EXPORT_REQUETES_ERROR_CODES } from '@sirena/common/constants';
import { documentExportCreationLockKey } from '../../../config/redis.constant.js';
import { connection } from '../../../config/redis.js';
import { addDocumentExportJob } from '../../../jobs/queues/documentExport.queue.js';
import { prisma } from '../../../libs/prisma.js';
import { createAccessLog } from '../../accessLog/accessLog.service.js';
import { AccessLogAction } from '../../accessLog/accessLog.type.js';
import {
  createDocumentExport,
  DOCUMENT_EXPORT_TYPE,
  findActiveDocumentExport,
  markDocumentExportFailed,
} from '../../documentExports/documentExports.service.js';
import { countExportRequetes } from './exportRequetes.service.js';
import { EXPORT_REQUETES_COLUMNS } from './exportRequetesColumns.js';

// Only covers the check-then-create below; a crashed request releases it on its own.
const CREATION_LOCK_TTL_SECONDS = 30;
// Deletes the lock only while it still holds our token, in one atomic call: once expired, the lock
// may belong to another request of the user.
const RELEASE_LOCK_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

export type RequestExportRequetesInput = {
  userId: string;
  topEntiteId: string;
  startDate: string;
  endDate: string;
  // Traced in the AccessLog.
  path: string;
  requestId: string | null;
};

export type RequestExportRequetesResult =
  | { ok: true; documentExportId: string }
  | {
      ok: false;
      code: typeof EXPORT_REQUETES_ERROR_CODES.EXPORT_IN_PROGRESS | typeof EXPORT_REQUETES_ERROR_CODES.NO_REQUETE;
    };

/**
 * Queues the generation of a requêtes CSV export for the user. A user has at most one export
 * in progress at a time, and an export is only launched when the period holds requêtes. The
 * export and its AccessLog trace are written together, so no export runs untraced.
 */
export async function requestExportRequetes(input: RequestExportRequetesInput): Promise<RequestExportRequetesResult> {
  const { userId, topEntiteId, startDate, endDate } = input;
  const lockKey = documentExportCreationLockKey(userId);

  const lockToken = randomUUID();
  const locked = await connection.set(lockKey, lockToken, 'EX', CREATION_LOCK_TTL_SECONDS, 'NX');
  if (locked !== 'OK') {
    return { ok: false, code: EXPORT_REQUETES_ERROR_CODES.EXPORT_IN_PROGRESS };
  }

  try {
    if (await findActiveDocumentExport(userId, DOCUMENT_EXPORT_TYPE.REQUETES_CSV)) {
      return { ok: false, code: EXPORT_REQUETES_ERROR_CODES.EXPORT_IN_PROGRESS };
    }

    if ((await countExportRequetes({ topEntiteId, startDate, endDate })) === 0) {
      return { ok: false, code: EXPORT_REQUETES_ERROR_CODES.NO_REQUETE };
    }

    const params = { startDate, endDate };
    const documentExport = await prisma.$transaction(async (tx) => {
      const created = await createDocumentExport(
        { type: DOCUMENT_EXPORT_TYPE.REQUETES_CSV, userId, topEntiteId, params },
        tx,
      );

      await createAccessLog(
        {
          entity: 'DocumentExport',
          entityId: created.id,
          action: AccessLogAction.EXPORT_REQUETES_CSV,
          userId,
          topEntiteId,
          requestId: input.requestId,
          path: input.path,
          dataKeys: EXPORT_REQUETES_COLUMNS.map((column) => column.key),
          params,
        },
        tx,
      );

      return created;
    });

    try {
      await addDocumentExportJob(documentExport.id);
    } catch (err) {
      // Left PENDING, the export would block the user until it times out.
      await markDocumentExportFailed(documentExport.id, 'The generation job could not be queued');
      throw err;
    }

    return { ok: true, documentExportId: documentExport.id };
  } finally {
    await connection.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockToken);
  }
}
