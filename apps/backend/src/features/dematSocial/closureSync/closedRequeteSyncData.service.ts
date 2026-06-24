import { prisma } from '../../../libs/prisma.js';

export type ClosedRequeteForDematSocialSync =
  | {
      kind: 'candidate';
      requeteId: string;
      dematSocialId: number;
    }
  | {
      kind: 'skip';
      reason: 'REQUETE_NOT_FOUND' | 'REQUETE_WITHOUT_DEMAT_SOCIAL_ID';
    };

export async function loadClosedRequeteForDematSocialSync(requeteId: string): Promise<ClosedRequeteForDematSocialSync> {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    select: {
      id: true,
      dematSocialId: true,
    },
  });

  if (!requete) {
    return { kind: 'skip', reason: 'REQUETE_NOT_FOUND' };
  }

  if (requete.dematSocialId == null) {
    return { kind: 'skip', reason: 'REQUETE_WITHOUT_DEMAT_SOCIAL_ID' };
  }

  return {
    kind: 'candidate',
    requeteId: requete.id,
    dematSocialId: requete.dematSocialId,
  };
}
