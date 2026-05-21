/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { getRequeteIdFromSirecId, saveFromSirec } from './sirecMigration.service.js';

vi.mock('@sirena/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    requete: { findFirst: vi.fn(), create: vi.fn() },
    lieuDeSurvenue: { create: vi.fn() },
    misEnCause: { create: vi.fn() },
    demarchesEngagees: { create: vi.fn() },
    situation: { create: vi.fn() },
    fait: { create: vi.fn() },
    faitMotifDeclaratif: { createMany: vi.fn() },
    requeteEntite: { createMany: vi.fn() },
    situationEntite: { createMany: vi.fn() },
    personneConcernee: { create: vi.fn() },
  },
}));

describe('sirecMigration.service.ts', () => {
  let prisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import('@sirena/db')).prisma;
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
  });

  describe('getRequeteIdFromSirecId', () => {
    it('should return the requete id when found', async () => {
      vi.mocked(prisma.requete.findFirst).mockResolvedValueOnce({ id: 'SIREC-42' });

      const result = await getRequeteIdFromSirecId(42);

      expect(result).toBe('SIREC-42');
      expect(prisma.requete.findFirst).toHaveBeenCalledWith({
        where: { sirecId: 42 },
        select: { id: true },
      });
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.requete.findFirst).mockResolvedValueOnce(null);

      const result = await getRequeteIdFromSirecId(42);

      expect(result).toBeNull();
    });
  });

  describe('saveFromSirec', () => {
    const receptionDate = new Date('2024-01-15');
    const data = {
      sirenaId: 'SIREC-42',
      sirecId: 42,
      receptionDate,
      receptionTypeId: 'EMAIL',
      prioriteId: 'HAUTE',
      estVictime: null as boolean | null,
      requeteEntiteIds: ['ars-1', 'ars-2'],
      situation: {
        fait: {
          commentaire: 'Précision prioritaire',
          autresPrecisions: 'Ma réclamation',
          motifsDeclaratifs: ['PROBLEME_FACTURATION', 'AUTRE'],
        },
        entiteIds: ['service-1', 'ars-1'],
        demarchesIds: [] as string[],
      },
    };

    beforeEach(() => {
      vi.mocked(prisma.requete.create).mockResolvedValue({ id: 'SIREC-42' } as any);
      vi.mocked(prisma.lieuDeSurvenue.create).mockResolvedValue({ id: 'lieu-1' } as any);
      vi.mocked(prisma.misEnCause.create).mockResolvedValue({ id: 'mec-1' } as any);
      vi.mocked(prisma.demarchesEngagees.create).mockResolvedValue({ id: 'dem-1' } as any);
      vi.mocked(prisma.situation.create).mockResolvedValue({ id: 'sit-1' } as any);
      vi.mocked(prisma.fait.create).mockResolvedValue({} as any);
      vi.mocked(prisma.faitMotifDeclaratif.createMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(prisma.requeteEntite.createMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(prisma.situationEntite.createMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(prisma.personneConcernee.create).mockResolvedValue({} as any);
    });

    it('should return the requete id', async () => {
      expect(await saveFromSirec(data)).toBe('SIREC-42');
    });

    it('should create Requete with correct data', async () => {
      await saveFromSirec(data);

      expect(prisma.requete.create).toHaveBeenCalledWith({
        data: { id: 'SIREC-42', sirecId: 42, receptionDate, receptionTypeId: 'EMAIL' },
        select: { id: true },
      });
    });

    it('should create Fait with commentaire and autresPrecisions', async () => {
      await saveFromSirec(data);

      expect(prisma.fait.create).toHaveBeenCalledWith({
        data: { situationId: 'sit-1', commentaire: 'Précision prioritaire', autresPrecisions: 'Ma réclamation' },
      });
    });

    it('should create FaitMotifDeclaratif for each motif', async () => {
      await saveFromSirec(data);

      expect(prisma.faitMotifDeclaratif.createMany).toHaveBeenCalledWith({
        data: [
          { situationId: 'sit-1', motifDeclaratifId: 'PROBLEME_FACTURATION' },
          { situationId: 'sit-1', motifDeclaratifId: 'AUTRE' },
        ],
      });
    });

    it('should not call faitMotifDeclaratif.createMany when motifs list is empty', async () => {
      await saveFromSirec({
        ...data,
        situation: { ...data.situation, fait: { commentaire: '', autresPrecisions: 'Test', motifsDeclaratifs: [] } },
      });

      expect(prisma.faitMotifDeclaratif.createMany).toHaveBeenCalledWith({ data: [] });
    });

    it('should throw a ZodError if the situation does not match SituationDataSchema', async () => {
      const invalidData = {
        ...data,
        situation: { fait: { autresPrecisions: 123 as any, motifsDeclaratifs: [] } },
      };

      await expect(saveFromSirec(invalidData)).rejects.toThrow(ZodError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should create one RequeteEntite per entiteId with correct data', async () => {
      await saveFromSirec(data);

      expect(prisma.requeteEntite.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ requeteId: 'SIREC-42', entiteId: 'ars-1', prioriteId: 'HAUTE' }),
          expect.objectContaining({ requeteId: 'SIREC-42', entiteId: 'ars-2', prioriteId: 'HAUTE' }),
        ],
      });
    });

    it('should create RequeteEntite with null prioriteId when not prioritaire', async () => {
      await saveFromSirec({ ...data, prioriteId: null });

      expect(prisma.requeteEntite.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([expect.objectContaining({ prioriteId: null })]),
      });
    });

    it('should create one SituationEntite per entiteId', async () => {
      await saveFromSirec(data);

      expect(prisma.situationEntite.createMany).toHaveBeenCalledWith({
        data: [
          { situationId: 'sit-1', entiteId: 'service-1' },
          { situationId: 'sit-1', entiteId: 'ars-1' },
        ],
      });
    });

    it('should create no SituationEntite when entiteIds is empty', async () => {
      await saveFromSirec({ ...data, situation: { ...data.situation, entiteIds: [] } });

      expect(prisma.situationEntite.createMany).toHaveBeenCalledWith({ data: [] });
    });

    it('should create DemarchesEngagees with no demarches when demarchesIds is empty', async () => {
      await saveFromSirec(data);

      expect(prisma.demarchesEngagees.create).toHaveBeenCalledWith({
        data: { demarches: { connect: [] } },
        select: { id: true },
      });
    });

    it('should connect PLAINTE demarche when demarchesIds contains PLAINTE', async () => {
      await saveFromSirec({ ...data, situation: { ...data.situation, demarchesIds: ['PLAINTE'] } });

      expect(prisma.demarchesEngagees.create).toHaveBeenCalledWith({
        data: { demarches: { connect: [{ id: 'PLAINTE' }] } },
        select: { id: true },
      });
    });

    it('should not create PersonneConcernee when estVictime is null', async () => {
      await saveFromSirec(data);

      expect(prisma.personneConcernee.create).not.toHaveBeenCalled();
    });

    it('should create PersonneConcernee with both participantDeId and declarantDeId when estVictime is true', async () => {
      await saveFromSirec({ ...data, estVictime: true });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: { estVictime: true, declarantDeId: 'SIREC-42', participantDeId: 'SIREC-42' },
      });
    });

    it('should create PersonneConcernee with only declarantDeId when estVictime is false', async () => {
      await saveFromSirec({ ...data, estVictime: false });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: { estVictime: false, declarantDeId: 'SIREC-42' },
      });
    });

    it('should wrap all creates in a single transaction', async () => {
      await saveFromSirec(data);

      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });
  });
});
