import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { getLoggerStore } from '../../../libs/asyncLocalStorage.js';
import { prisma } from '../../../libs/prisma.js';
import { type DematSocialClosureSyncResult, syncClosedRequeteToDematSocial } from './closureSync.service.js';

export type DematSocialClosureBackfillResult = {
  found: number;
  synchronised: number;
  skipped: number;
  failed: number;
};

const isSynchronised = (result: DematSocialClosureSyncResult): boolean => result.kind === 'synced';

export async function backfillClosedRequetesToDematSocial(): Promise<DematSocialClosureBackfillResult> {
  const logger = getLoggerStore();
  const requetes = await prisma.requete.findMany({
    where: {
      dematSocialId: { not: null },
      requeteEntites: {
        some: {},
        every: { statutId: REQUETE_STATUT_TYPES.CLOTUREE },
      },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const result: DematSocialClosureBackfillResult = {
    found: requetes.length,
    synchronised: 0,
    skipped: 0,
    failed: 0,
  };

  logger.info({ found: result.found }, 'Starting demat.social closed Requête backfill');

  for (const requete of requetes) {
    try {
      const syncResult = await syncClosedRequeteToDematSocial(requete.id);
      if (isSynchronised(syncResult)) {
        result.synchronised += 1;
      } else {
        result.skipped += 1;
      }
    } catch (err) {
      result.failed += 1;
      logger.error({ err, requeteId: requete.id }, 'Failed demat.social closed Requête backfill item');
    }
  }

  logger.info(result, 'Completed demat.social closed Requête backfill');
  return result;
}
