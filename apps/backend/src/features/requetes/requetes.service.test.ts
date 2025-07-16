import { RECEPTION_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { createRequeteFromDematSocial } from './requetes.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    requete: {
      create: vi.fn(),
    },
  },
}));

describe('requetes.service.ts', () => {
  describe('createRequeteFromDematSocial()', () => {
    it('should create a Requete with nested RequeteEntite and RequeteEntiteState with infoComplementaire', async () => {
      const mockedCreate = vi.mocked(prisma.requete.create);

      const dematSocialId = 123;
      const fakeResult = {
        number: 1,
        dematSocialId,
        id: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockedCreate.mockResolvedValueOnce(fakeResult);

      const result = await createRequeteFromDematSocial({ dematSocialId });

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          dematSocialId,
          requetesEntite: {
            create: {
              requetesEntiteStates: {
                create: {
                  statutId: REQUETE_STATUT_TYPES.A_QUALIFIER,
                  infoComplementaire: {
                    create: {
                      receptionDate: expect.any(Date),
                      receptionTypeId: RECEPTION_TYPES.FORUMULAIRE,
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(result).toBe(fakeResult);
    });
  });
});
