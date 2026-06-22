import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/prisma.js';
import { getEntiteDescendantIds } from '../../entites/entites.service.js';
import { generateExportRequetesCsv } from './exportRequetes.service.js';

vi.mock('../../../libs/prisma.js', () => ({
  prisma: {
    requete: {
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
    expect(csv).toContain('REQ-2026-0001');
    expect(csv).toContain('18/06/2026');
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
