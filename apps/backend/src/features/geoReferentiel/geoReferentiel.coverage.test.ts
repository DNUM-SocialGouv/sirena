import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { buildEntiteCoverageReport } from './geoReferentiel.coverage.js';

vi.mock('../../libs/prisma.js');

type Territoire = {
  dptCodeActuel: string;
  dptLibActuel: string;
  ctcdCodeActuel: string;
  ctcdLibActuel: string;
};

type Entite = { entiteTypeId: string; departementCode: string | null; ctcdCode: string | null };

const territoire = (dpt: string, ctcd: string): Territoire => ({
  dptCodeActuel: dpt,
  dptLibActuel: `Departement ${dpt}`,
  ctcdCodeActuel: ctcd,
  ctcdLibActuel: `Collectivite ${ctcd}`,
});

const given = (territoires: Territoire[], entites: Entite[]) => {
  // biome-ignore lint/suspicious/noExplicitAny: les select ne renvoient qu'un sous-ensemble des modèles
  vi.mocked(prisma.commune.findMany).mockResolvedValue(territoires as any);
  // biome-ignore lint/suspicious/noExplicitAny: idem
  vi.mocked(prisma.entite.findMany).mockResolvedValue(entites as any);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildEntiteCoverageReport', () => {
  it('should consider a territoire covered when entities use the INSEE collectivite code', async () => {
    given(
      [territoire('76', '76D')],
      [
        { entiteTypeId: 'CD', departementCode: '76', ctcdCode: '76D' },
        { entiteTypeId: 'DD', departementCode: '76', ctcdCode: '76D' },
      ],
    );

    const report = await buildEntiteCoverageReport();

    expect(report).toMatchObject({ territoiresCount: 1, missingCdCount: 0, missingDdCount: 0 });
    expect(report.missing).toEqual([]);
  });

  it('should consider a territoire covered when entities use the internal convention', async () => {
    given(
      [territoire('76', '76D')],
      [
        { entiteTypeId: 'CD', departementCode: '76', ctcdCode: '76CD' },
        { entiteTypeId: 'DD', departementCode: '76', ctcdCode: '76DD' },
      ],
    );

    const report = await buildEntiteCoverageReport();

    expect(report.missing).toEqual([]);
  });

  it('should cover Corsica through either of its two accepted codes', async () => {
    given(
      [territoire('2A', '20R')],
      [
        { entiteTypeId: 'CD', departementCode: '2A', ctcdCode: '20R' },
        { entiteTypeId: 'DD', departementCode: '2A', ctcdCode: '2ADD' },
      ],
    );

    const report = await buildEntiteCoverageReport();

    expect(report.missing).toEqual([]);
  });

  it('should not cover a territoire when the entity sits in another departement', async () => {
    given([territoire('76', '76D')], [{ entiteTypeId: 'CD', departementCode: '27', ctcdCode: '76D' }]);

    const report = await buildEntiteCoverageReport();

    expect(report.missingCdCount).toBe(1);
  });

  it('should ignore services attached to a parent entity', async () => {
    given([territoire('76', '76D')], []);

    await buildEntiteCoverageReport();

    expect(prisma.entite.findMany).toHaveBeenCalledWith({
      where: { entiteTypeId: { in: ['CD', 'DD'] }, entiteMereId: null },
      select: { entiteTypeId: true, departementCode: true, ctcdCode: true },
    });
  });

  it('should report only the missing type when the other one exists', async () => {
    given([territoire('76', '76D')], [{ entiteTypeId: 'CD', departementCode: '76', ctcdCode: '76D' }]);

    const report = await buildEntiteCoverageReport();

    expect(report.missingCdCount).toBe(0);
    expect(report.missingDdCount).toBe(1);
    expect(report.missing).toEqual([
      {
        entiteType: 'DD',
        departementCode: '76',
        departementLib: 'Departement 76',
        ctcdCode: '76D',
        ctcdLib: 'Collectivite 76D',
      },
    ]);
  });

  it('should report both types for a territoire with no entity at all', async () => {
    given([territoire('975', '975'), territoire('76', '76D')], []);

    const report = await buildEntiteCoverageReport();

    expect(report).toMatchObject({ territoiresCount: 2, missingCdCount: 2, missingDdCount: 2 });
    expect(report.missing).toHaveLength(4);
  });

  it('should query distinct territoires from the referentiel', async () => {
    given([], []);

    const report = await buildEntiteCoverageReport();

    expect(prisma.commune.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ['dptCodeActuel', 'ctcdCodeActuel'] }),
    );
    expect(report.territoiresCount).toBe(0);
  });
});
