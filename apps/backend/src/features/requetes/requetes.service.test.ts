import { RECEPTION_TYPES } from '@sirena/common/constants';
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
      it('creates requete with declarant, participant and situations inside a single transaction', async () => {
        vi.useFakeTimers();

        const fakeNow = new Date('2025-08-06T12:34:56.000Z');
        vi.setSystemTime(fakeNow);

        const dematSocialId = 123;
        const receptionTypeId = RECEPTION_TYPES.FORMULAIRE;

        const fakeRequete: Requete = {
          id: '1',
          dematSocialId,
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
          updatedAt: new Date('2025-01-02T00:00:00.000Z'),
          commentaire: 'Requête créée automatiquement',
          receptionDate: new Date(),
          receptionTypeId,
        };

        const transactionSpy = vi.mocked(prisma.$transaction);
        transactionSpy.mockImplementation(async (cb) => {
          const mockTx = {
            ...prisma,
            requete: {
              ...prisma.requete,
              create: vi.fn().mockResolvedValue({ id: '1' }),
              findUniqueOrThrow: vi.fn().mockResolvedValue(fakeRequete),
            },
            personneConcernee: {
              ...prisma.personneConcernee,
              create: vi.fn().mockResolvedValue({ id: 'personne-1' }),
            },
            adresse: {
              ...prisma.adresse,
              create: vi.fn().mockResolvedValue({ id: 'adresse-1' }),
            },
            lieuDeSurvenue: {
              ...prisma.lieuDeSurvenue,
              create: vi.fn().mockResolvedValue({ id: 'lieu-1' }),
            },
            misEnCause: {
              ...prisma.misEnCause,
              create: vi.fn().mockResolvedValue({ id: 'mec-1' }),
            },
            autoriteTypeEnum: {
              ...prisma.autoriteTypeEnum,
              findUnique: vi.fn().mockResolvedValue({ id: 'autorite-1' }),
            },
            demarchesEngageesEnum: {
              ...prisma.demarchesEngageesEnum,
              findMany: vi.fn().mockResolvedValue([{ id: 'demarche-1' }]),
            },
            demarchesEngagees: {
              ...prisma.demarchesEngagees,
              create: vi.fn().mockResolvedValue({ id: 'demarches-1' }),
            },
            situation: {
              ...prisma.situation,
              create: vi.fn().mockResolvedValue({ id: 'situation-1' }),
            },
            fait: {
              ...prisma.fait,
              create: vi.fn().mockResolvedValue({ id: 'fait-1' }),
            },
            faitMotif: {
              ...prisma.faitMotif,
              createMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
            faitConsequence: {
              ...prisma.faitConsequence,
              createMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
            faitMaltraitanceType: {
              ...prisma.faitMaltraitanceType,
              createMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
          } as typeof prisma;
          return cb(mockTx);
        });

        const result = await createRequeteFromDematSocial({
          dematSocialId,
          receptionTypeId,
          receptionDate: new Date(),
          declarant: {
            adresse: {
              label: '123 Main St',
              codePostal: '12345',
              ville: 'Anytown',
              rue: 'Main St',
              numRue: '123',
            },
            ageId: '1',
            telephone: '1234567890',
            estHandicapee: false,
            lienVictimeId: '1',
            estVictime: false,
            estAnonyme: false,
          },
          participant: {
            adresse: {
              label: '123 Main St',
              codePostal: '12345',
              ville: 'Anytown',
              rue: 'Main St',
              numRue: '123',
            },
            ageId: '1',
            telephone: '1234567890',
            estHandicapee: false,
            estVictimeInformee: false,
            victimeInformeeCommentaire: '1234567890',
            autrePersonnes: '1234567890',
          },
          situations: [],
        });

        expect(transactionSpy).toHaveBeenCalledTimes(1);
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
      const fakeNow = new Date('2025-08-06T12:34:56.000Z');
      vi.setSystemTime(fakeNow);
      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);

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

      const result = await createOrGetFromDematSocial({
        dematSocialId: 123,
        receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
        receptionDate: new Date(),
        declarant: {
          adresse: {
            label: '123 Main St',
            codePostal: '12345',
            ville: 'Anytown',
            rue: 'Main St',
            numRue: '123',
          },
          ageId: '1',
          telephone: '1234567890',
          estHandicapee: false,
          lienVictimeId: '1',
          estVictime: false,
          estAnonyme: false,
        },
        participant: {
          adresse: {
            label: '123 Main St',
            codePostal: '12345',
            ville: 'Anytown',
            rue: 'Main St',
            numRue: '123',
          },
          ageId: '1',
          telephone: '1234567890',
          estHandicapee: false,
          estVictimeInformee: false,
          victimeInformeeCommentaire: '1234567890',
          autrePersonnes: '1234567890',
        },
        situations: [],
      });

      expect(mockedFindFirst).toHaveBeenCalledWith({
        where: { dematSocialId: 123 },
        include: {
          receptionType: true,
          etapes: { include: { statut: true } },
        },
      });
      expect(result).toBeNull();
    });

    it('should create and return requete if not existing', async () => {
      vi.useFakeTimers();
      const fakeNow = new Date('2025-08-06T12:34:56.000Z');
      vi.setSystemTime(fakeNow);

      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);
      const transactionSpy = vi.mocked(prisma.$transaction);

      const dematSocialId = 456;
      const mockRequeteCreate = vi.fn().mockResolvedValue({ id: '1' });

      const created: Requete = {
        id: '1',
        dematSocialId,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Requête créée automatiquement',
        receptionDate: new Date(),
        receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
      };

      mockedFindFirst.mockResolvedValueOnce(null);

      transactionSpy.mockImplementation(async (cb) => {
        const mockTx = {
          ...prisma,
          requete: {
            ...prisma.requete,
            create: mockRequeteCreate,
            findUniqueOrThrow: vi.fn().mockResolvedValue(created),
          },
          personneConcernee: {
            ...prisma.personneConcernee,
            create: vi.fn().mockResolvedValue({ id: 'personne-1' }),
          },
          adresse: {
            ...prisma.adresse,
            create: vi.fn().mockResolvedValue({ id: 'adresse-1' }),
          },
          lieuDeSurvenue: {
            ...prisma.lieuDeSurvenue,
            create: vi.fn().mockResolvedValue({ id: 'lieu-1' }),
          },
          misEnCause: {
            ...prisma.misEnCause,
            create: vi.fn().mockResolvedValue({ id: 'mec-1' }),
          },
          autoriteTypeEnum: {
            ...prisma.autoriteTypeEnum,
            findUnique: vi.fn().mockResolvedValue({ id: 'autorite-1' }),
          },
          demarchesEngageesEnum: {
            ...prisma.demarchesEngageesEnum,
            findMany: vi.fn().mockResolvedValue([{ id: 'demarche-1' }]),
          },
          demarchesEngagees: {
            ...prisma.demarchesEngagees,
            create: vi.fn().mockResolvedValue({ id: 'demarches-1' }),
          },
          situation: {
            ...prisma.situation,
            create: vi.fn().mockResolvedValue({ id: 'situation-1' }),
          },
          fait: {
            ...prisma.fait,
            create: vi.fn().mockResolvedValue({ id: 'fait-1' }),
          },
          faitMotif: {
            ...prisma.faitMotif,
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          faitConsequence: {
            ...prisma.faitConsequence,
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          faitMaltraitanceType: {
            ...prisma.faitMaltraitanceType,
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        } as typeof prisma;
        return cb(mockTx);
      });

      const result = await createOrGetFromDematSocial({
        dematSocialId,
        receptionTypeId: RECEPTION_TYPES.FORMULAIRE,
        receptionDate: new Date(),
        declarant: {
          adresse: {
            label: '123 Main St',
            codePostal: '12345',
            ville: 'Anytown',
            rue: 'Main St',
            numRue: '123',
          },
          ageId: '1',
          telephone: '1234567890',
          estHandicapee: false,
          lienVictimeId: '1',
          estVictime: false,
          estAnonyme: false,
        },
        participant: {
          adresse: {
            label: '123 Main St',
            codePostal: '12345',
            ville: 'Anytown',
            rue: 'Main St',
            numRue: '123',
          },
          ageId: '1',
          telephone: '1234567890',
          estHandicapee: false,
          estVictimeInformee: false,
          victimeInformeeCommentaire: '1234567890',
          autrePersonnes: '1234567890',
        },
        situations: [],
      });

      expect(mockedFindFirst).toHaveBeenCalledWith({
        where: { dematSocialId },
        include: {
          receptionType: true,
          etapes: { include: { statut: true } },
        },
      });
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(mockRequeteCreate).toHaveBeenCalledTimes(1);
      expect(mockRequeteCreate).toHaveBeenCalledWith({
        data: {
          dematSocialId,
          receptionDate: new Date(),
          receptionType: { connect: { id: RECEPTION_TYPES.FORMULAIRE } },
        },
        select: { id: true },
      });
      expect(result).toEqual(created);
    });
  });
});
