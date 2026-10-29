import { serializeCsv } from '@sirena/common/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/prisma.js';
import { countExportRequetes, type ExportRequetesParams, prepareExportRequetesCsv } from './exportRequetes.service.js';
import { EXPORT_REQUETES_HEADERS } from './exportRequetesColumns.js';
import { buildExportRequetesRows } from './exportRequetesRows.js';

vi.mock('../../../libs/prisma.js', () => ({
  prisma: {
    requete: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    inseePostal: {
      findMany: vi.fn(),
    },
    commune: {
      groupBy: vi.fn(),
    },
  },
}));

const PERIOD = { startDate: '2026-06-01', endDate: '2026-06-30' };

const exportParams = (topEntiteId: string, overrides: Partial<ExportRequetesParams> = {}): ExportRequetesParams => ({
  topEntiteId,
  ...PERIOD,
  ...overrides,
});

const generateExportRequetesCsv = async (
  topEntiteId: string,
  overrides: Partial<ExportRequetesParams> = {},
): Promise<string> => {
  const writeCsv = await prepareExportRequetesCsv(exportParams(topEntiteId, overrides));
  let csv = '';
  await writeCsv(async (chunk) => {
    csv += chunk;
  });
  return csv;
};

describe('prepareExportRequetesCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports requêtes assigned to the root entity itself, created during the period, bounds included in Paris time', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([
      {
        id: 'REQ-2026-0001',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{}],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);

    const csv = await generateExportRequetesCsv('root-entite');

    expect(prisma.requete.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          // The exact root entity, like hasAccessToRequete: no requête the user cannot open.
          requeteEntites: { some: { entiteId: 'root-entite' } },
          // 1 June 00:00 and 1 July 00:00 in Paris (summer time, UTC+2).
          createdAt: {
            gte: new Date('2026-05-31T22:00:00.000Z'),
            lt: new Date('2026-06-30T22:00:00.000Z'),
          },
        },
      }),
    );
    expect(csv).toContain('REQ-2026-0001');
    expect(csv).toContain('18/06/2026');
  });

  it('reads the clear identity, mis en cause and file names of each requête', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([]);

    await generateExportRequetesCsv('root-entite');

    const select = vi.mocked(prisma.requete.findMany).mock.calls.at(-1)?.[0]?.select as Record<string, unknown>;
    expect(select).toMatchObject({
      provenancePrecision: true,
      dematSocialId: true,
      sirecId: true,
      fichiersRequeteOriginale: { select: { fileName: true, metadata: true } },
      declarant: {
        select: expect.objectContaining({
          identite: {
            select: { civilite: { select: { label: true } }, nom: true, prenom: true, email: true, telephone: true },
          },
          adresse: { select: { codePostal: true, ville: true, numero: true, rue: true } },
          commentaire: true,
        }),
      },
      participant: {
        select: expect.objectContaining({
          dateNaissance: true,
          victimeInformeeCommentaire: true,
          autrePersonnes: true,
          commentaire: true,
        }),
      },
      situations: {
        select: expect.objectContaining({
          estLieAuSignalement: true,
          numerosSignalement: true,
          misEnCause: {
            select: expect.objectContaining({ nom: true, prenom: true, rpps: true, finess: true, commentaire: true }),
          },
          faits: {
            select: expect.objectContaining({
              commentaire: true,
              autresPrecisions: true,
              fichiers: { select: { fileName: true, metadata: true } },
            }),
          },
        }),
      },
    });
  });

  it("reads only the user's entity steps when sharing is off, with their notes and files", async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([]);

    await generateExportRequetesCsv('root-entite');

    const select = vi.mocked(prisma.requete.findMany).mock.calls.at(-1)?.[0]?.select as Record<string, unknown>;
    expect(select.etapes).toMatchObject({
      where: { entiteId: 'root-entite' },
      select: expect.objectContaining({
        notes: expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
        uploadedFiles: { select: { fileName: true, metadata: true } },
      }),
    });
  });

  it('also reads the steps other entities share when sharing is on', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([]);

    await generateExportRequetesCsv('root-entite', { includeSharedEtapes: true });

    const select = vi.mocked(prisma.requete.findMany).mock.calls.at(-1)?.[0]?.select as Record<string, unknown>;
    expect(select.etapes).toMatchObject({
      where: { OR: [{ entiteId: 'root-entite' }, { estPartagee: true }] },
    });
  });

  it('resolves the writer with the number of data rows', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([
      { id: 'REQ-2026-0001', createdAt: new Date('2026-06-18T10:00:00.000Z'), situations: [{}, {}] },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);

    const writeCsv = await prepareExportRequetesCsv(exportParams('root-entite'));

    await expect(writeCsv(async () => {})).resolves.toBe(2);
  });

  it('counts the requêtes of the period with the same filter as the export', async () => {
    vi.mocked(prisma.requete.count).mockResolvedValueOnce(3);

    await expect(countExportRequetes(exportParams('root-entite'))).resolves.toBe(3);
    expect(prisma.requete.count).toHaveBeenCalledWith({
      where: {
        requeteEntites: { some: { entiteId: 'root-entite' } },
        createdAt: {
          gte: new Date('2026-05-31T22:00:00.000Z'),
          lt: new Date('2026-06-30T22:00:00.000Z'),
        },
      },
    });
  });

  it('produces the same document as the reference row and CSV builders', async () => {
    const requete = { id: 'REQ-2026-0007', createdAt: new Date('2026-06-18T10:00:00.000Z'), situations: [{}] };
    vi.mocked(prisma.requete.findMany).mockResolvedValue([requete] as unknown as Awaited<
      ReturnType<typeof prisma.requete.findMany>
    >);

    const csv = await generateExportRequetesCsv('root-entite');

    expect(csv).toBe(
      serializeCsv([...EXPORT_REQUETES_HEADERS], buildExportRequetesRows([requete], { topEntiteId: 'root-entite' })),
    );
  });

  it('reads requêtes in two cursor-paginated passes: a light postal pass then the full pass', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([
      { id: 'REQ-2026-0001', createdAt: new Date('2026-06-18T10:00:00.000Z'), situations: [{}] },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);

    await generateExportRequetesCsv('root-entite');

    const calls = vi.mocked(prisma.requete.findMany).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);

    const firstSelect = calls[0]?.[0]?.select as Record<string, unknown>;
    expect(firstSelect).toMatchObject({ id: true });
    expect(firstSelect.receptionDate).toBeUndefined();
    expect(firstSelect.etapes).toBeUndefined();

    expect(calls.at(-1)?.[0]?.select).toMatchObject({ receptionDate: true, etapes: expect.anything() });
    for (const call of calls) {
      expect(call[0]).toMatchObject({ orderBy: { id: 'asc' }, take: expect.any(Number) });
    }
  });

  it('reads the next page with an id keyset, so a requête deleted meanwhile cannot end the export early', async () => {
    const fullPage = Array.from({ length: 500 }, (_, index) => ({
      id: `REQ-2026-${String(index).padStart(4, '0')}`,
      createdAt: new Date('2026-06-18T10:00:00.000Z'),
      situations: [{}],
    }));
    vi.mocked(prisma.requete.findMany)
      .mockResolvedValueOnce(fullPage as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValue([] as never);

    await generateExportRequetesCsv('root-entite');

    const secondCall = vi.mocked(prisma.requete.findMany).mock.calls[1]?.[0];
    expect(secondCall).not.toHaveProperty('cursor');
    expect(secondCall?.where).toEqual({
      AND: [
        expect.objectContaining({ requeteEntites: { some: { entiteId: 'root-entite' } } }),
        { id: { gt: 'REQ-2026-0499' } },
      ],
    });
  });

  it('wires department names for all exported department sources', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([
      {
        id: 'REQ-2026-0021',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        declarant: {
          estVictime: false,
          isTuteur: false,
          adresse: { codePostal: '75001' },
          veutGarderAnonymat: 'NON',
          estSignalementProfessionnel: 'NON',
        },
        participant: {
          adresse: { codePostal: '69002' },
          veutGarderAnonymat: 'NON',
          estVictimeInformee: 'NON',
          estHandicapee: 'NON',
          aAutrePersonnes: 'NON',
        },
        requeteEntites: [
          {
            entiteId: 'root-entite',
            entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
            statut: { label: 'En cours' },
          },
        ],
        etapes: [],
        situations: [
          {
            lieuDeSurvenue: {
              codePostal: '33000',
              adresse: { codePostal: '63000' },
            },
            misEnCause: { codePostal: '98000' },
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);
    vi.mocked(prisma.inseePostal.findMany).mockResolvedValueOnce([
      {
        codePostal: '75001',
        commune: { dptCodeActuel: '75' },
      },
      {
        codePostal: '69002',
        commune: { dptCodeActuel: '69' },
      },
      {
        codePostal: '63000',
        commune: { dptCodeActuel: '63' },
      },
      {
        codePostal: '98000',
        commune: { dptCodeActuel: '980' },
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.inseePostal.findMany>>);
    vi.mocked(prisma.commune.groupBy).mockResolvedValueOnce([
      {
        dptCodeActuel: '75',
        dptLibActuel: 'Paris',
      },
      {
        dptCodeActuel: '69',
        dptLibActuel: 'Rhône',
      },
      {
        dptCodeActuel: '63',
        dptLibActuel: 'Puy-de-Dôme',
      },
      {
        dptCodeActuel: '980',
        dptLibActuel: 'Monaco',
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.commune.groupBy>>);

    const csv = await generateExportRequetesCsv('root-entite');

    expect(prisma.inseePostal.findMany).toHaveBeenCalledWith({
      where: { codePostal: { in: ['75001', '69002', '63000', '98000'] } },
      select: { codePostal: true, commune: { select: { dptCodeActuel: true } } },
      distinct: ['codePostal'],
    });
    expect(prisma.commune.groupBy).toHaveBeenCalledWith({
      by: ['dptCodeActuel', 'dptLibActuel'],
      where: { OR: [{ dptCodeActuel: { in: ['75', '69', '63', '980'] } }] },
    });
    expect(csv).toContain('Paris (75)');
    expect(csv).toContain('Rhône (69)');
    expect(csv).toContain('Puy-de-Dôme (63)');
    expect(csv).toContain('Monaco (980)');
    expect(csv).not.toContain('Gironde (33)');
  });

  it('exports the authoritative department mapping for a lieu de survenue postal code', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([
      {
        id: 'REQ-2026-0035',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        requeteEntites: [
          {
            entiteId: 'root-entite',
            entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
            statut: { label: 'En cours' },
          },
        ],
        etapes: [],
        situations: [{ lieuDeSurvenue: { codePostal: '20000' } }],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);
    vi.mocked(prisma.inseePostal.findMany).mockResolvedValueOnce([
      {
        codePostal: '20000',
        commune: { dptCodeActuel: '2A' },
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.inseePostal.findMany>>);
    vi.mocked(prisma.commune.groupBy).mockResolvedValueOnce([
      {
        dptCodeActuel: '2A',
        dptLibActuel: 'Corse-du-Sud',
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.commune.groupBy>>);

    const csv = await generateExportRequetesCsv('root-entite');

    expect(csv).toContain('Corse-du-Sud (2A)');
  });

  it('exports the SIREC department of a situation that has no postal code', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([
      {
        id: 'REQ-2026-0036',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        requeteEntites: [
          {
            entiteId: 'root-entite',
            entite: { label: 'Agence régionale', entiteTypeId: 'ARS' },
            statut: { label: 'En cours' },
          },
        ],
        etapes: [],
        // A SIREC request whose mis en cause is an RPPS: its lieu de survenue is empty.
        situations: [{ sirecDepartement: 'Seine-Maritime', lieuDeSurvenue: { codePostal: '' }, misEnCause: {} }],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);
    vi.mocked(prisma.commune.groupBy).mockResolvedValueOnce([
      { dptCodeActuel: '76', dptLibActuel: 'Seine-Maritime' },
    ] as unknown as Awaited<ReturnType<typeof prisma.commune.groupBy>>);

    const csv = await generateExportRequetesCsv('root-entite');

    // No postal code to resolve, so the referential is queried on the SIREC label alone.
    expect(prisma.inseePostal.findMany).not.toHaveBeenCalled();
    expect(prisma.commune.groupBy).toHaveBeenCalledWith({
      by: ['dptCodeActuel', 'dptLibActuel'],
      where: { OR: [{ dptLibActuel: { in: ['Seine-Maritime'] } }] },
    });
    expect(csv).toContain('Seine-Maritime (76)');
  });

  it('passes the root entity scope to row building for root-scoped fields', async () => {
    vi.mocked(prisma.requete.findMany).mockResolvedValue([
      {
        id: 'REQ-2026-0002',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        receptionDate: null,
        dateDemandeDeclarant: null,
        receptionType: null,
        provenance: null,
        declarant: null,
        participant: null,
        requeteEntites: [
          {
            entiteId: 'root-entite',
            entite: { label: 'ARS Île-de-France' },
            statut: { label: 'En cours' },
            priorite: { label: 'Haute' },
          },
        ],
        etapes: [
          {
            entiteId: 'root-entite',
            statutId: 'CLOTUREE',
            createdAt: new Date('2026-06-19T10:00:00.000Z'),
            clotureEffectiveDate: new Date('2026-06-18T00:00:00.000Z'),
            clotureReason: [{ label: 'Réponse apportée' }],
          },
        ],
        situations: [{}],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);

    const csv = await generateExportRequetesCsv('root-entite');

    expect(csv).toContain('ARS Île-de-France (En cours)');
    expect(csv).toContain('Haute');
    expect(csv).toContain('18/06/2026');
    expect(csv).toContain('Réponse apportée');
  });
});
