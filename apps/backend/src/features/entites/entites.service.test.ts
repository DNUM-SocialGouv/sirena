import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Entite, prisma } from '../../libs/prisma.js';
import {
  getDirectionsFromRequeteEntiteId,
  getDirectionsServicesFromRequeteEntiteId,
  getEditableEntitiesChain,
  getEntiteAscendanteIds,
  getEntiteChain,
  getEntiteDescendantIds,
  getEntiteForUser,
  getEntites,
  getEntitesByIds,
} from './entites.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    entite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    situationEntite: {
      findMany: vi.fn(),
    },
  },
}));

const fakeEntiteBase: Omit<Entite, 'id'> = {
  label: 'A',
  email: 'test@domain.fr',
  entiteTypeId: 'ENTITE_TYPE_A',
  entiteMereId: null,
  nomComplet: 'Entite A',
  organizationalUnit: '',
  emailDomain: 'domain.fr',
  departementCode: '1',
  regionCode: '1',
  ctcdCode: '1',
  regLib: 'Region 1',
  dptLib: 'Departement 1',
  isActive: true,
};

const fakeEntite = (id: string): Entite => ({
  ...fakeEntiteBase,
  id,
});

describe('entites.service', () => {
  describe('getDirectionsFromRequeteEntiteId()', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('queries directions (children entites) linked to requete situations', async () => {
      const mockDirections = [fakeEntite('d1'), fakeEntite('d2')];

      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce(mockDirections);

      const result = await getDirectionsFromRequeteEntiteId('requeteId', 'e1');

      expect(prisma.entite.findMany).toHaveBeenCalledWith({
        where: {
          entiteMereId: 'e1',
          situationEntites: {
            some: {
              situation: {
                requeteId: 'requeteId',
              },
            },
          },
        },
        select: {
          id: true,
          nomComplet: true,
          label: true,
        },
      });
      expect(result).toEqual(mockDirections);
    });
  });

  describe('getDirectionsServicesFromRequeteEntiteId()', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('returns direction services with traitement des faits data', async () => {
      vi.mocked(prisma.situationEntite.findMany).mockResolvedValueOnce([
        {
          entite: {
            id: 'dir1',
            nomComplet: 'Direction 1',
            entiteMereId: 'root1',
          },
          // biome-ignore lint/suspicious/noExplicitAny: the select doesn't match the type required
        } as any,
      ]);

      vi.mocked(prisma.entite.findUnique)
        .mockResolvedValueOnce({
          id: 'dir1',
          nomComplet: 'Direction 1',
          entiteMereId: 'root1',
          label: 'DIR1',
          email: '',
          emailDomain: '',
          entiteTypeId: '',
          organizationalUnit: '',
          departementCode: '1',
          regionCode: '1',
          ctcdCode: '1',
          dptLib: '1',
          regLib: '1',
          isActive: false,
        })
        .mockResolvedValueOnce({
          id: 'root1',
          nomComplet: 'Root 1',
          entiteMereId: null,
          label: 'ROOT',
          email: '',
          emailDomain: '',
          entiteTypeId: '',
          organizationalUnit: '',
          departementCode: '1',
          regionCode: '1',
          ctcdCode: '1',
          dptLib: '1',
          regLib: '1',
          isActive: false,
        });

      const result = await getDirectionsServicesFromRequeteEntiteId('requeteId', 'root1');

      expect(prisma.situationEntite.findMany).toHaveBeenCalledWith({
        where: {
          situation: {
            requeteId: 'requeteId',
          },
        },
        select: {
          entite: {
            select: {
              id: true,
              nomComplet: true,
              entiteMereId: true,
            },
          },
        },
      });

      expect(result).toEqual([
        {
          entiteId: 'root1',
          entiteName: 'Root 1',
          directionServiceId: 'dir1',
          directionServiceName: 'Direction 1',
          chain: [
            expect.objectContaining({ id: 'root1', nomComplet: 'Root 1', label: 'ROOT' }),
            expect.objectContaining({ id: 'dir1', nomComplet: 'Direction 1', label: 'DIR1' }),
          ],
        },
      ]);
    });
  });

  describe('getEntiteForUser()', () => {
    const mockEntite1 = {
      id: '2',
      label: 'b',
      email: 'test2@domain.fr',
      entiteTypeId: 'ENTITE_TYPE_A',
      entiteMereId: null,
      nomComplet: 'Entite B',
      organizationalUnit: 'ARS-CORSE',
      emailDomain: '',
      departementCode: '1',
      regionCode: '1',
      ctcdCode: '1',
      regLib: 'Region 1',
      dptLib: 'Departement 1',
      isActive: false,
    };
    const mockEntite2 = {
      id: '1',
      label: 'A',
      email: 'test@domain.fr',
      entiteTypeId: 'ENTITE_TYPE_A',
      entiteMereId: null,
      nomComplet: 'Entite A',
      organizationalUnit: '',
      emailDomain: 'domain.fr',
      departementCode: '1',
      regionCode: '1',
      ctcdCode: '1',
      regLib: 'Region 1',
      dptLib: 'Departement 1',
      isActive: true,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return entite if organizationUnit matches a single entite', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite1]);

      const result = await getEntiteForUser('ARS-CORSE', '');
      expect(prisma.entite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                organizationalUnit: expect.stringContaining('ARS-CORSE'),
              }),
            ]),
          }),
        }),
      );
      expect(result).toEqual(mockEntite1);
    });

    it('should return entite if email domain matches a single entite', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite2]);

      const result = await getEntiteForUser(null, 'john@domain.fr');
      expect(prisma.entite.findMany).toHaveBeenLastCalledWith({ where: { emailDomain: 'domain.fr' } });
      expect(result).toEqual(mockEntite2);
    });

    it('should return null if multiple entites match orgUnit', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite1, mockEntite2]);
      const result = await getEntiteForUser('DUPLICATE', '');
      expect(result).toBeNull();
    });

    it('should return null if no matches found', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([]);
      const result = await getEntiteForUser(null, 'nobody@nothing.com');
      expect(result).toBeNull();
    });
  });

  describe('getEntites(id)', () => {
    it('should fetch root entites when entiteMere is null', async () => {
      const mockEntite = {
        id: '2',
        label: 'b',
        email: 'test2@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: null,
        nomComplet: 'Entite B',
        organizationalUnit: 'ARS-CORSE',
        emailDomain: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: false,
      };
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite]);
      vi.mocked(prisma.entite.count).mockResolvedValueOnce(1);

      const result = await getEntites(null, { sort: 'nomComplet', order: 'asc', offset: 0, search: '' });

      expect(prisma.entite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entiteMere: null,
            OR: undefined,
          },
          orderBy: { nomComplet: 'asc' },
          skip: 0,
        }),
      );
      expect(result).toEqual({
        data: [mockEntite],
        total: 1,
      });
    });

    it('should fetch children entites when entiteMere is an ID', async () => {
      const mockEntite = {
        id: '2',
        label: 'b',
        email: 'test2@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: '1',
        nomComplet: 'Entite B',
        organizationalUnit: 'ARS-CORSE',
        emailDomain: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: false,
      };
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite]);
      vi.mocked(prisma.entite.count).mockResolvedValueOnce(1);

      const result = await getEntites('1', {
        sort: 'nomComplet',
        order: 'asc',
        offset: 0,
        limit: 1,
        search: 'test',
      });

      expect(prisma.entite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entiteMere: { is: { id: '1' } },
            OR: [
              { nomComplet: { contains: 'test', mode: 'insensitive' } },
              { label: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        }),
      );

      expect(result).toEqual({
        data: [mockEntite],
        total: 1,
      });
    });
  });
  describe('getEntiteChain()', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });
    it('should return full entite chain from child to root', async () => {
      const mockEntite1 = {
        id: '2',
        label: 'b',
        email: 'test2@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: null,
        nomComplet: 'Entite B',
        organizationalUnit: 'ARS-CORSE',
        emailDomain: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: true,
      };
      const mockEntite2 = {
        id: '1',
        label: 'A',
        email: 'test@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: '2',
        nomComplet: 'Entite A',
        organizationalUnit: '',
        emailDomain: 'domain.fr',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: false,
      };

      vi.mocked(prisma.entite.findUnique).mockResolvedValueOnce(mockEntite2).mockResolvedValueOnce(mockEntite1);

      const chain = await getEntiteChain('1');

      expect(chain[0].id).toBe('2');
      expect(chain[1].id).toBe('1');

      expect(prisma.entite.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.entite.findUnique).toHaveBeenCalledWith({ where: { id: '1' }, select: expect.anything() });
      expect(prisma.entite.findUnique).toHaveBeenCalledWith({ where: { id: '2' }, select: expect.anything() });
    });

    it('should return empty array if nothing found', async () => {
      vi.mocked(prisma.entite.findUnique).mockResolvedValueOnce(null);

      const result = await getEntiteChain('unknown-id');
      expect(result).toEqual([]);
      expect(prisma.entite.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEntiteDescendantIds()', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return all descendant IDs for a given entite', async () => {
      const mockEntite2 = {
        id: '2',
        label: 'A',
        email: 'test@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: '1',
        nomComplet: 'Entite A',
        organizationalUnit: '',
        emailDomain: 'domain.fr',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: false,
      };
      const mockEntite3 = {
        id: '3',
        label: 'A',
        email: 'test@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: '2',
        nomComplet: 'Entite A',
        organizationalUnit: '',
        emailDomain: 'domain.fr',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: false,
      };

      vi.mocked(prisma.entite.findMany)
        .mockResolvedValueOnce([mockEntite2])
        .mockResolvedValueOnce([mockEntite3])
        .mockResolvedValueOnce([]);

      const results = await getEntiteDescendantIds('1');

      expect(results).toEqual(['1', '2', '3']);
      expect(prisma.entite.findMany).toHaveBeenCalledTimes(3);
    });

    it('should return empty array if no descendants found', async () => {
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([]);

      const results = await getEntiteDescendantIds('unknown-id');

      expect(results).toEqual(['unknown-id']);
      expect(prisma.entite.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return null if null provided', async () => {
      const results = await getEntiteDescendantIds(null);

      expect(results).toEqual(null);
    });
  });

  describe('getEditableEntitiesChain()', () => {
    const chainFromFindUnique = [
      {
        id: '5',
        nomComplet: 'Child B',
        label: '',
        entiteMereId: '4',
        email: '',
        emailDomain: '',
        entiteTypeId: '',
        organizationalUnit: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: true,
      },
      {
        id: '4',
        nomComplet: 'Child A',
        label: '',
        entiteMereId: '3',
        email: '',
        emailDomain: '',
        entiteTypeId: '',
        organizationalUnit: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: true,
      },
      {
        id: '3',
        nomComplet: 'Current',
        label: '',
        entiteMereId: '2',
        email: '',
        emailDomain: '',
        entiteTypeId: '',
        organizationalUnit: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: true,
      },
      {
        id: '2',
        nomComplet: 'Intermediate',
        label: '',
        entiteMereId: '1',
        email: '',
        emailDomain: '',
        entiteTypeId: '',
        organizationalUnit: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: false,
      },
      {
        id: '1',
        nomComplet: 'Root',
        label: '',
        entiteMereId: null,
        email: '',
        emailDomain: '',
        entiteTypeId: '',
        organizationalUnit: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: false,
      },
    ];

    const mockChain = () => {
      vi.mocked(prisma.entite.findUnique).mockReset();
      chainFromFindUnique.forEach((entite) => {
        vi.mocked(prisma.entite.findUnique).mockResolvedValueOnce(entite);
      });
    };

    it('should return all entities with disabled: false for super admin', async () => {
      mockChain();

      const result = await getEditableEntitiesChain('5', null);
      expect(result).toEqual(chainFromFindUnique.toReversed().map((e) => ({ ...e, disabled: false })));
    });

    it('should disable all if editableEntiteIds is empty', async () => {
      mockChain();

      const result = await getEditableEntitiesChain('5', []);
      expect(result).toEqual(chainFromFindUnique.toReversed().map((e) => ({ ...e, disabled: true })));
    });

    it('should disable everything except allowed and not pivot', async () => {
      mockChain();

      const result = await getEditableEntitiesChain('5', ['3', '4']);

      expect(result).toEqual(
        chainFromFindUnique.toReversed().map(({ id, ...rest }) => ({
          id,
          ...rest,
          disabled: id === '3' || !['3', '4'].includes(id),
        })),
      );
    });

    it('should disable everything if only pivot is present', async () => {
      mockChain();

      const result = await getEditableEntitiesChain('3', ['3']);

      expect(result).toEqual(chainFromFindUnique.toReversed().map((e) => ({ ...e, disabled: true })));
    });
  });

  describe('getEntiteAscendanteIds()', () => {
    it('returns [] when the entite does not exist', async () => {
      vi.mocked(prisma.entite.findUnique).mockResolvedValueOnce(null);

      const result = await getEntiteAscendanteIds('unknown-id');

      expect(result).toEqual([]);
    });

    it('returns null when input is null', async () => {
      const result = await getEntiteAscendanteIds(null);
      expect(result).toBeNull();
    });

    it('returns all ascendant IDs for a given entite', async () => {
      vi.mocked(prisma.entite.findUnique).mockReset();
      const mockEntite1 = {
        id: '2',
        label: 'b',
        email: 'test2@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: null,
        nomComplet: 'Entite B',
        organizationalUnit: 'ARS-CORSE',
        emailDomain: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: true,
      };
      const mockEntite2 = {
        id: '1',
        label: 'A',
        email: 'test@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: '2',
        nomComplet: 'Entite A',
        organizationalUnit: '',
        emailDomain: 'domain.fr',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: true,
      };

      vi.mocked(prisma.entite.findUnique).mockResolvedValueOnce(mockEntite2);
      vi.mocked(prisma.entite.findUnique).mockResolvedValueOnce(mockEntite1);

      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([mockEntite2]);
      vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([]);

      const results = await getEntiteAscendanteIds('1');

      expect(results).toEqual(['2', '1']);
      expect(prisma.entite.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.entite.findMany).toHaveBeenCalledTimes(2);
    });

    it('throws on cycle in entite hierarchy (>6 hops) and does not traverse descendants', async () => {
      vi.clearAllMocks();
      const mockEntite1 = {
        id: '2',
        label: 'b',
        email: 'test2@domain.fr',
        entiteTypeId: 'ENTITE_TYPE_A',
        entiteMereId: '1',
        nomComplet: 'Entite B',
        organizationalUnit: 'ARS-CORSE',
        emailDomain: '',
        departementCode: '1',
        regionCode: '1',
        ctcdCode: '1',
        regLib: 'Region 1',
        dptLib: 'Departement 1',
        isActive: true,
      };

      vi.mocked(prisma.entite.findUnique).mockResolvedValue(mockEntite1);

      await expect(getEntiteAscendanteIds('A')).rejects.toThrow(/Possible cycle detected in entite hierarchy/);
      expect(prisma.entite.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getEntitesByIds()', () => {
    it('returns [] when input is empty', async () => {
      const result = await getEntitesByIds([]);
      expect(result).toEqual([]);
    });
  });

  it('returns all entities when input is not empty', async () => {
    vi.mocked(prisma.entite.findMany).mockResolvedValueOnce([fakeEntite('1'), fakeEntite('2'), fakeEntite('3')]);

    const result = await getEntitesByIds(['1', '2', '3']);
    expect(result).toEqual([fakeEntite('1'), fakeEntite('2'), fakeEntite('3')]);
  });
});
