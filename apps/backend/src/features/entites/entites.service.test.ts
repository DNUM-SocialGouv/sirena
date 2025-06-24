import { prisma } from '@/libs/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEntiteForUser } from './entites.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    entite: {
      findMany: vi.fn(),
    },
  },
}));

describe('entites.service', () => {
  describe('getEntiteForUser()', () => {
    const mockEntite1 = {
      id: '2',
      label: 'b',
      email: 'test2@domain.fr',
      entiteTypeId: 'ENTITE_TYPE_A',
      entiteMereId: null,
      nomComplet: 'Entite B',
      organizationUnit: 'ARS-CORSE',
      emailDomain: null,
    };
    const mockEntite2 = {
      id: '1',
      label: 'A',
      email: 'test@domain.fr',
      entiteTypeId: 'ENTITE_TYPE_A',
      entiteMereId: null,
      nomComplet: 'Entite A',
      organizationUnit: '',
      emailDomain: 'domain.fr',
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return entite if organizationUnit matches a single entite', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValue([mockEntite1]);

      const result = await getEntiteForUser('ARS-CORSE', '');
      expect(prisma.entite.findMany).toHaveBeenCalledWith({ where: { organizationUnit: 'ARS-CORSE' } });
      expect(result).toEqual(mockEntite1);
    });

    it('should return entite if email domain matches a single entite', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite2]);

      const result = await getEntiteForUser(null, 'john@domain.fr');
      expect(prisma.entite.findMany).toHaveBeenLastCalledWith({ where: { emailDomain: 'domain.fr' } });
      expect(result).toEqual(mockEntite2);
    });

    it('should return null if multiple entites match orgUnit', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValue([mockEntite1, mockEntite2]);
      const result = await getEntiteForUser('DUPLICATE', '');
      expect(result).toBeNull();
    });

    it('should return null if no matches found', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValue([]);
      const result = await getEntiteForUser(null, 'nobody@nothing.com');
      expect(result).toBeNull();
    });
  });
});
