import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { getLoggerStore } from '../../../libs/asyncLocalStorage.js';
import { prisma } from '../../../libs/prisma.js';
import {
  type DematSocialPriseEnChargeSyncResult,
  syncRequetePriseEnChargeToDematSocial,
} from './priseEnChargeSync.service.js';

export type DematSocialPriseEnChargeBackfillResult = {
  found: number;
  synchronised: number;
  skipped: number;
  failed: number;
};

const isSynchronised = (result: DematSocialPriseEnChargeSyncResult): boolean => result.kind === 'synced';

export async function backfillRequetesPrisesEnChargeToDematSocial(): Promise<DematSocialPriseEnChargeBackfillResult> {
  const logger = getLoggerStore();
  const requetes = await prisma.requete.findMany({
    where: {
      dematSocialId: { not: null },
      requeteEntites: {
        some: { statutId: { in: [REQUETE_STATUT_TYPES.EN_COURS, REQUETE_STATUT_TYPES.CLOTUREE] } },
      },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const result: DematSocialPriseEnChargeBackfillResult = {
    found: requetes.length,
    synchronised: 0,
    skipped: 0,
    failed: 0,
  };

  logger.info({ found: result.found }, 'Starting demat.social Requêtes prises en charge backfill');

  for (const requete of requetes) {
    try {
      const syncResult = await syncRequetePriseEnChargeToDematSocial(requete.id);
      if (isSynchronised(syncResult)) {
        result.synchronised += 1;
      } else {
        result.skipped += 1;
      }
    } catch (err) {
      result.failed += 1;
      logger.error({ err, requeteId: requete.id }, 'Failed demat.social Requêtes prises en charge backfill item');
    }
  }

  logger.info(result, 'Completed demat.social Requêtes prises en charge backfill');
  return result;
}
