import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/prisma.js';
import { getEntiteDescendantIds } from '../../entites/entites.service.js';
import { generateExportRequetesCsv } from './exportRequetes.service.js';

vi.mock('../../../libs/prisma.js', () => ({
  prisma: {
    requete: {
      findMany: vi.fn(),
    },
    inseePostal: {
      findMany: vi.fn(),
    },
    commune: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../entites/entites.service.js', () => ({
  getEntiteDescendantIds: vi.fn(),
}));

describe('generateExportRequetesCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports requêtes scoped to the root entity and its descendants', async () => {
    vi.mocked(getEntiteDescendantIds).mockResolvedValueOnce(['root-entite', 'direction-1', 'service-1']);
    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce([
      {
        id: 'REQ-2026-0001',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{}],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.requete.findMany>>);

    const csv = await generateExportRequetesCsv('root-entite');

    expect(getEntiteDescendantIds).toHaveBeenCalledWith('root-entite');
    expect(prisma.requete.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          requeteEntites: {
            some: {
              entiteId: { in: ['root-entite', 'direction-1', 'service-1'] },
            },
          },
        },
      }),
    );
    expect(vi.mocked(prisma.requete.findMany).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        include: expect.objectContaining({
          etapes: expect.objectContaining({
            include: expect.objectContaining({
              notes: {
                select: expect.objectContaining({
                  texte: true,
                  authorId: true,
                }),
              },
            }),
          }),
        }),
      }),
    );
    expect(csv).toContain('REQ-2026-0001');
    expect(csv).toContain('18/06/2026');
  });

  it('wires department names for all exported department sources', async () => {
    vi.mocked(getEntiteDescendantIds).mockResolvedValueOnce(['root-entite']);
    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce([
      {
        id: 'REQ-2026-0021',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        declarant: {
          estVictime: false,
          isTuteur: false,
          adresse: { codePostal: '75001' },
          veutGarderAnonymat: false,
          estSignalementProfessionnel: false,
        },
        participant: {
          adresse: { codePostal: '69002' },
          veutGarderAnonymat: false,
          estVictimeInformee: false,
          estHandicapee: false,
          aAutrePersonnes: false,
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
    vi.mocked(prisma.commune.findMany).mockResolvedValueOnce([
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
    ] as unknown as Awaited<ReturnType<typeof prisma.commune.findMany>>);

    const csv = await generateExportRequetesCsv('root-entite');

    expect(prisma.inseePostal.findMany).toHaveBeenCalledWith({
      where: { codePostal: { in: ['75001', '69002', '63000', '98000'] } },
      select: { codePostal: true, commune: { select: { dptCodeActuel: true } } },
      distinct: ['codePostal'],
    });
    expect(prisma.commune.findMany).toHaveBeenCalledWith({
      where: { dptCodeActuel: { in: ['75', '69', '63', '980'] } },
      select: { dptCodeActuel: true, dptLibActuel: true },
      distinct: ['dptCodeActuel'],
    });
    expect(csv).toContain('Paris (75)');
    expect(csv).toContain('Rhône (69)');
    expect(csv).toContain('Puy-de-Dôme (63)');
    expect(csv).toContain('Monaco (980)');
    expect(csv).not.toContain('Gironde (33)');
  });

  it('passes the root entity scope to row building for root-scoped fields', async () => {
    vi.mocked(getEntiteDescendantIds).mockResolvedValueOnce(['root-entite']);
    vi.mocked(prisma.requete.findMany).mockResolvedValueOnce([
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
