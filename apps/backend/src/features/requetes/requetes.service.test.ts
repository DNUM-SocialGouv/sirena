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
      vi.useFakeTimers();

      const createdAt = new Date('2025-01-01');

      const date = new Date('2025-08-06');
      vi.setSystemTime(date);

      const dematSocialId = 123;
      const fakeResult = {
        number: 1,
        dematSocialId,
        id: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockedCreate.mockResolvedValueOnce(fakeResult);

      const result = await createRequeteFromDematSocial({ dematSocialId, createdAt });

      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          createdAt,
          dematSocialId,
          requetesEntite: {
            create: {
              requetesEntiteStates: {
                create: {
                  statutId: REQUETE_STATUT_TYPES.FAIT,
                  stepName: `Création de la requête le ${createdAt.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}`,
                  infoComplementaire: {
                    create: {
                      receptionDate: new Date(),
                      receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
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
