import { REQUETE_CLOTURE_REASON, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/__mocks__/prisma.js';
import { loadClosedRequeteForDematSocialSync } from './closedRequeteSyncData.service.js';

vi.mock('../../../libs/prisma.js', () => ({ prisma }));

const mockFindUniqueRequete = (requete: unknown) => {
  prisma.requete.findUnique.mockResolvedValueOnce(requete as never);
};

describe('loadClosedRequeteForDematSocialSync', () => {
  it('does not return a sync candidate when at least one Entité administrative is not closed', async () => {
    mockFindUniqueRequete({
      id: 'requete-1',
      dematSocialId: 123,
      requeteEntites: [
        { entiteId: 'entite-1', statutId: REQUETE_STATUT_TYPES.CLOTUREE, requeteEtape: [] },
        { entiteId: 'entite-2', statutId: REQUETE_STATUT_TYPES.EN_COURS, requeteEtape: [] },
      ],
    });

    const candidate = await loadClosedRequeteForDematSocialSync('requete-1');

    expect(candidate).toEqual({ kind: 'skip', reason: 'REQUETE_NOT_COMPLETELY_CLOSED' });
  });

  it('returns a candidate with latest closure reasons when all Entités administratives are closed', async () => {
    mockFindUniqueRequete({
      id: 'requete-1',
      dematSocialId: 123,
      requeteEntites: [
        {
          entiteId: 'entite-1',
          statutId: REQUETE_STATUT_TYPES.CLOTUREE,
          requeteEtape: [{ clotureReason: [{ id: REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES }] }],
        },
        {
          entiteId: 'entite-2',
          statutId: REQUETE_STATUT_TYPES.CLOTUREE,
          requeteEtape: [{ clotureReason: [{ id: REQUETE_CLOTURE_REASON.HORS_COMPETENCE }] }],
        },
      ],
    });

    const candidate = await loadClosedRequeteForDematSocialSync('requete-1');

    expect(candidate).toEqual({
      kind: 'candidate',
      requeteId: 'requete-1',
      dematSocialId: 123,
      closureReasons: [REQUETE_CLOTURE_REASON.MESURES_CORRECTIVES, REQUETE_CLOTURE_REASON.HORS_COMPETENCE],
    });
  });

  it('asks Prisma for only the latest closed step per Entité administrative', async () => {
    mockFindUniqueRequete({
      id: 'requete-1',
      dematSocialId: 123,
      requeteEntites: [
        {
          entiteId: 'entite-1',
          statutId: REQUETE_STATUT_TYPES.CLOTUREE,
          requeteEtape: [{ clotureReason: [{ id: REQUETE_CLOTURE_REASON.SANS_SUITE }] }],
        },
      ],
    });

    await loadClosedRequeteForDematSocialSync('requete-1');

    expect(prisma.requete.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          requeteEntites: expect.objectContaining({
            select: expect.objectContaining({
              requeteEtape: expect.objectContaining({
                where: { statutId: 'CLOTUREE' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('returns an anomaly when a closed Entité administrative has no latest closure step or reasons', async () => {
    mockFindUniqueRequete({
      id: 'requete-1',
      dematSocialId: 123,
      requeteEntites: [
        { entiteId: 'entite-1', statutId: REQUETE_STATUT_TYPES.CLOTUREE, requeteEtape: [] },
        { entiteId: 'entite-2', statutId: REQUETE_STATUT_TYPES.CLOTUREE, requeteEtape: [{ clotureReason: [] }] },
      ],
    });

    const candidate = await loadClosedRequeteForDematSocialSync('requete-1');

    expect(candidate).toEqual({
      kind: 'anomaly',
      reason: 'MISSING_LATEST_CLOSURE_REASONS',
      entiteIds: ['entite-1', 'entite-2'],
    });
  });
});
