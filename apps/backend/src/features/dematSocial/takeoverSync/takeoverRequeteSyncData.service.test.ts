import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/__mocks__/prisma.js';
import { loadRequetePriseEnChargeForDematSocialSync } from './takeoverRequeteSyncData.service.js';

vi.mock('../../../libs/prisma.js', () => ({ prisma }));

const mockFindUniqueRequete = (requete: unknown) => {
  prisma.requete.findUnique.mockResolvedValueOnce(requete as never);
};

describe('loadRequetePriseEnChargeForDematSocialSync', () => {
  it('returns a candidate for a demat.social-linked Requête SIRENA without requiring complete closure', async () => {
    mockFindUniqueRequete({
      id: 'requete-1',
      dematSocialId: 123,
      requeteEntites: [
        { entiteId: 'entite-1', statutId: REQUETE_STATUT_TYPES.CLOTUREE },
        { entiteId: 'entite-2', statutId: REQUETE_STATUT_TYPES.EN_COURS },
      ],
    });

    const candidate = await loadRequetePriseEnChargeForDematSocialSync('requete-1');

    expect(candidate).toEqual({
      kind: 'candidate',
      requeteId: 'requete-1',
      dematSocialId: 123,
    });
  });
});
