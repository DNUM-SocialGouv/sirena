import { RECEPTION_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import {
  createOrGetFromDematSocial,
  createRequeteFromDematSocial,
  getRequeteByDematSocialId,
} from './requetes.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    requete: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('requetes.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      };
      mockedFindFirst.mockResolvedValueOnce(mockRequete);

      const result = await getRequeteByDematSocialId(123);

      expect(mockedFindFirst).toHaveBeenCalledWith({ where: { dematSocialId: 123 } });
      expect(result).toEqual(mockRequete);
    });

    it('should return null if no requete found', async () => {
      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);
      mockedFindFirst.mockResolvedValueOnce(null);

      const result = await getRequeteByDematSocialId(999);
      expect(result).toBeNull();
    });
  });

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

  describe('createOrGetFromDematSocial()', () => {
    it('should return null if requete already exists', async () => {
      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);
      const mockedCreate = vi.mocked(prisma.requete.create);

      const existing = {
        number: 1,
        id: '1',
        dematSocialId: 123,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedFindFirst.mockResolvedValueOnce(existing);

      const result = await createOrGetFromDematSocial({ dematSocialId: 123 });

      expect(mockedFindFirst).toHaveBeenCalledWith({ where: { dematSocialId: 123 } });
      expect(mockedCreate).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should create and return requete if not existing', async () => {
      vi.clearAllMocks();
      const mockedFindFirst = vi.mocked(prisma.requete.findFirst);
      const mockedCreate = vi.mocked(prisma.requete.create);

      const dematSocialId = 456;
      const created = {
        number: 1,
        id: '1',
        dematSocialId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockedFindFirst).mockResolvedValueOnce(null);
      mockedCreate.mockResolvedValueOnce(created);

      const result = await createOrGetFromDematSocial({ dematSocialId });

      expect(mockedFindFirst).toHaveBeenCalledWith({ where: { dematSocialId } });
      expect(mockedCreate).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });
});
