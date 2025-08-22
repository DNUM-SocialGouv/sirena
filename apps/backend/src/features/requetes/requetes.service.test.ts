import { RECEPTION_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/__mocks__/prisma';
import { createRequeteFromDematSocial } from './requetes.service';

vi.mock('@/libs/prisma');

describe('requetes.service.ts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('createRequeteFromDematSocial()', () => {
    describe('createRequeteFromDematSocial', async () => {
      it('creates requete + one entite + two states with infoComplementaire inside a single transaction', async () => {
        vi.useFakeTimers();

        const createdAt = new Date('2025-01-01T00:00:00.000Z');
        const fakeNow = new Date('2025-08-06T12:34:56.000Z');
        vi.setSystemTime(fakeNow);

        const dematSocialId = 123;

        const entiteId = 42;
        const fakeRequete = {
          id: '1',
          number: 1,
          dematSocialId,
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
          updatedAt: new Date('2025-01-02T00:00:00.000Z'),
          requetesEntite: [{ id: entiteId }],
        };

        vi.mocked(prisma.requete.create).mockResolvedValueOnce(fakeRequete);
        vi.mocked(prisma.requete.create).mockResolvedValueOnce(fakeRequete);

        const transactionSpy = vi.mocked(prisma.$transaction);
        transactionSpy.mockImplementation(async (cb) => cb(prisma));

        const result = await createRequeteFromDematSocial({ dematSocialId, createdAt });

        expect(prisma.requete.create).toHaveBeenCalledTimes(1);
        expect(prisma.requete.create).toHaveBeenCalledWith({
          data: {
            dematSocialId,
            createdAt,
            requetesEntite: { create: {} },
          },
          include: { requetesEntite: true },
        });

        expect(prisma.requeteState.create).toHaveBeenCalledTimes(2);

        expect(prisma.requeteState.create).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            data: {
              requeteEntiteId: entiteId,
              statutId: REQUETE_STATUT_TYPES.FAIT,
              stepName: `Création de la requête le ${createdAt.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}`,
              infoComplementaire: {
                create: {
                  receptionDate: expect.any(Date),
                  receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
                },
              },
            },
          }),
        );

        expect(prisma.requeteState.create).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            data: {
              requeteEntiteId: entiteId,
              statutId: REQUETE_STATUT_TYPES.A_FAIRE,
              stepName: 'Envoyer un accusé de réception au déclarant',
              infoComplementaire: {
                create: {
                  receptionDate: expect.any(Date),
                  receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
                },
              },
            },
          }),
        );
        expect(result).toBe(fakeRequete);
      });
    });
  });
});
