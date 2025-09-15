import { RECEPTION_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/__mocks__/prisma';
import type { Requete } from '@/libs/prisma';
import {
  createOrGetFromDematSocial,
  createRequeteFromDematSocial,
  getRequeteByDematSocialId,
} from './requetes.service';

vi.mock('@/libs/prisma');

describe('requetes.service.ts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('createRequeteFromDematSocial()', () => {
    describe('createRequeteFromDematSocial', async () => {
      it('creates requete + one entite + two etapes inside a single transaction', async () => {
        vi.useFakeTimers();

        const createdAt = new Date('2025-01-01T00:00:00.000Z');
        const fakeNow = new Date('2025-08-06T12:34:56.000Z');
        vi.setSystemTime(fakeNow);

        const dematSocialId = 123;
        const receptionTypeId = RECEPTION_TYPES.FORMULAIRE;

        const entiteId = 42;
        const fakeRequete: Requete = {
          id: '1',
          dematSocialId,
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
          updatedAt: new Date('2025-01-02T00:00:00.000Z'),
          commentaire: 'Requête créée automatiquement',
          receptionDate: new Date(),
          receptionTypeId,
        };

        vi.mocked(prisma.requete.create).mockResolvedValueOnce(fakeRequete);
        vi.mocked(prisma.requete.create).mockResolvedValueOnce(fakeRequete);

        const transactionSpy = vi.mocked(prisma.$transaction);
        transactionSpy.mockImplementation(async (cb) => cb(prisma));

        const result = await createRequeteFromDematSocial({
          dematSocialId,
          createdAt,
          entiteIds: [entiteId.toString()],
          receptionTypeId,
          receptionDate: new Date(),
          commentaire: 'Requête créée automatiquement',
        });

        expect(prisma.requete.create).toHaveBeenCalledTimes(1);
        expect(prisma.requete.create).toHaveBeenCalledWith({
          data: {
            dematSocialId,
            commentaire: 'Requête créée automatiquement',
            receptionDate: new Date(),
            receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
            createdAt,
          },
        });

        expect(prisma.requeteEtape.create).toHaveBeenCalledTimes(2);

        expect(prisma.requeteEtape.create).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            data: {
              nom: `Création de la requête le ${createdAt.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}`,
              statutId: REQUETE_STATUT_TYPES.FAIT,
              requeteId: fakeRequete.id,
              entiteId: entiteId.toString(),
            },
          }),
        );

        expect(prisma.requeteEtape.create).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            data: {
              nom: 'Envoyer un accusé de réception au déclarant',
              statutId: REQUETE_STATUT_TYPES.A_FAIRE,
              requeteId: fakeRequete.id,
              entiteId: entiteId.toString(),
            },
          }),
        );
        expect(result).toBe(fakeRequete);
      });
    });
  });

  describe('getRequeteByDematSocialId()', () => {
    it('should return the requete matching the dematSocialId', async () => {
      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);

      const mockRequete = {
        number: 1,
        id: '1',
        dematSocialId: 123,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Requête créée automatiquement',
        receptionDate: new Date(),
        receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
      };
      mockedFindFirst.mockResolvedValueOnce(mockRequete);

      const result = await getRequeteByDematSocialId(123);

      expect(mockedFindFirst).toHaveBeenCalledWith({
        where: { dematSocialId: 123 },
        include: {
          receptionType: true,
          RequeteEntites: { include: { entite: true } },
          etapes: { include: { statut: true } },
        },
      });
      expect(result).toEqual(mockRequete);
    });

    it('should return null if no requete found', async () => {
      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);
      mockedFindFirst.mockResolvedValueOnce(null);

      const result = await getRequeteByDematSocialId(999);
      expect(result).toBeNull();
    });
  });

  describe('createOrGetFromDematSocial()', () => {
    it('should return null if requete already exists', async () => {
      vi.useFakeTimers();
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const fakeNow = new Date('2025-08-06T12:34:56.000Z');
      vi.setSystemTime(fakeNow);
      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);
      const mockedCreate = vi.mocked(prisma.requete.create);

      const entiteId = 42;

      const existing = {
        number: 1,
        id: '1',
        dematSocialId: 123,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Requête créée automatiquement',
        receptionDate: new Date(),
        receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
      };

      mockedFindFirst.mockResolvedValueOnce(existing);

      const result = await createOrGetFromDematSocial(
        {
          dematSocialId: 123,
          createdAt,
          receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
          entiteIds: [entiteId.toString()],
          receptionDate: new Date(),
          commentaire: 'Requête créée automatiquement',
        },
        { userEntiteId: entiteId.toString() },
      );

      expect(mockedFindFirst).toHaveBeenCalledWith({
        where: { dematSocialId: 123 },
        include: {
          receptionType: true,
          RequeteEntites: { include: { entite: true } },
          etapes: { include: { statut: true } },
        },
      });
      expect(mockedCreate).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should create and return requete if not existing', async () => {
      vi.useFakeTimers();
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const fakeNow = new Date('2025-08-06T12:34:56.000Z');
      vi.setSystemTime(fakeNow);

      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);
      const mockedCreate = vi.mocked(prisma.requete.create);
      const transactionSpy = vi.mocked(prisma.$transaction);

      const dematSocialId = 456;
      const entiteId = 42;

      mockedFindFirst.mockResolvedValueOnce(null);

      transactionSpy.mockImplementation(async (cb) => cb(prisma));

      const created = {
        id: '1',
        number: 1,
        dematSocialId,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Requête créée automatiquement',
        receptionDate: new Date(),
        receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
      };
      mockedCreate.mockResolvedValueOnce(created);

      const result = await createOrGetFromDematSocial(
        {
          dematSocialId,
          createdAt,
          receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
          entiteIds: [entiteId.toString()],
          receptionDate: new Date(),
          commentaire: 'Requête créée automatiquement',
        },
        { userEntiteId: entiteId.toString() },
      );

      expect(mockedFindFirst).toHaveBeenCalledWith({
        where: { dematSocialId },
        include: {
          receptionType: true,
          RequeteEntites: { include: { entite: true } },
          etapes: { include: { statut: true } },
        },
      });
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(mockedCreate).toHaveBeenCalledTimes(1);
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          dematSocialId,
          createdAt,
          receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
          commentaire: 'Requête créée automatiquement',
          receptionDate: new Date(),
        },
      });
      expect(result).toEqual(created);
    });
  });
});
