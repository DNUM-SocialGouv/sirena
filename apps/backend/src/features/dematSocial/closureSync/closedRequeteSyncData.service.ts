import type { RequeteClotureReason } from '@sirena/common/constants';
import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { prisma } from '../../../libs/prisma.js';

export type ClosedRequeteForDematSocialSync =
  | {
      kind: 'candidate';
      requeteId: string;
      dematSocialId: number;
      closureReasons: RequeteClotureReason[];
    }
  | {
      kind: 'skip';
      reason: 'REQUETE_NOT_FOUND' | 'REQUETE_WITHOUT_DEMAT_SOCIAL_ID' | 'REQUETE_NOT_COMPLETELY_CLOSED';
    }
  | {
      kind: 'anomaly';
      reason: 'MISSING_LATEST_CLOSURE_REASONS';
      entiteIds: string[];
    };

export async function loadClosedRequeteForDematSocialSync(requeteId: string): Promise<ClosedRequeteForDematSocialSync> {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    select: {
      id: true,
      dematSocialId: true,
      requeteEntites: {
        select: {
          entiteId: true,
          statutId: true,
          requeteEtape: {
            where: { statutId: REQUETE_ETAPE_STATUT_TYPES.CLOTUREE },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              clotureReason: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!requete) {
    return { kind: 'skip', reason: 'REQUETE_NOT_FOUND' };
  }

  if (requete.dematSocialId == null) {
    return { kind: 'skip', reason: 'REQUETE_WITHOUT_DEMAT_SOCIAL_ID' };
  }

  const isCompletelyClosed = requete.requeteEntites.every(
    (requeteEntite) => requeteEntite.statutId === REQUETE_STATUT_TYPES.CLOTUREE,
  );

  if (!isCompletelyClosed) {
    return { kind: 'skip', reason: 'REQUETE_NOT_COMPLETELY_CLOSED' };
  }

  const entiteIdsWithMissingClosureReasons: string[] = [];
  const closureReasons: RequeteClotureReason[] = [];

  for (const requeteEntite of requete.requeteEntites) {
    const latestClosureStep = requeteEntite.requeteEtape[0];
    if (!latestClosureStep || latestClosureStep.clotureReason.length === 0) {
      entiteIdsWithMissingClosureReasons.push(requeteEntite.entiteId);
      continue;
    }

    closureReasons.push(...latestClosureStep.clotureReason.map((reason) => reason.id as RequeteClotureReason));
  }

  if (entiteIdsWithMissingClosureReasons.length > 0) {
    return {
      kind: 'anomaly',
      reason: 'MISSING_LATEST_CLOSURE_REASONS',
      entiteIds: entiteIdsWithMissingClosureReasons,
    };
  }

  return {
    kind: 'candidate',
    requeteId: requete.id,
    dematSocialId: requete.dematSocialId,
    closureReasons,
  };
}
