/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { getRequeteIdFromSirecId, saveFromSirec } from './sirecMigration.service.js';

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

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
    requeteEtape: { create: vi.fn() },
    situationEntite: { createMany: vi.fn() },
    personneConcernee: { create: vi.fn() },
    identite: { create: vi.fn() },
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
      declarant: null as {
        estVictime: boolean | null;
        veutGarderAnonymat: boolean | null;
        lienVictimeId: string | null;
        lienAutrePrecision: string | null;
        adresse: { rue: string | null; codePostal: string | null; ville: string | null } | null;
        identite: {
          nom: string | null;
          prenom: string | null;
          email: string | null;
          telephone: string | null;
          civiliteId: string | null;
        } | null;
        commentaire: string;
      } | null,
      victime: null as {
        identite: {
          nom: string | null;
          prenom: string | null;
          email: string | null;
          telephone: string | null;
          civiliteId: string | null;
        } | null;
        adresse: { rue: string | null; codePostal: string | null; ville: string | null } | null;
        commentaire: string;
        ageId: string | null;
      } | null,
      requeteStatutId: 'EN_COURS',
      requeteEntiteIds: ['ars-1', 'ars-2'],
      etapes: [] as {
        nom: string;
        entiteId: string;
        statutId: string;
        createdAt?: Date;
        note: string | null;
        clotureReason?: string;
      }[],
      situations: [
        {
          fait: {
            commentaire: 'Précision prioritaire',
            autresPrecisions: 'Ma réclamation',
            motifsDeclaratifs: ['PROBLEME_FACTURATION', 'AUTRE'],
          },
          entiteIds: ['service-1', 'ars-1'],
          demarchesIds: [] as string[],
          misEnCauseData: null as any,
          lieuDeSurvenueData: null as any,
        },
      ],
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
      vi.mocked(prisma.requeteEtape.create).mockResolvedValue({} as any);
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
        situations: [
          { ...data.situations[0], fait: { commentaire: '', autresPrecisions: 'Test', motifsDeclaratifs: [] } },
        ],
      });

      expect(prisma.faitMotifDeclaratif.createMany).toHaveBeenCalledWith({ data: [] });
    });

    it('should throw a ZodError if the situation does not match SituationDataSchema', async () => {
      const invalidData = {
        ...data,
        situations: [{ fait: { autresPrecisions: 123 as any, motifsDeclaratifs: [] } }],
      };

      await expect(saveFromSirec(invalidData as any)).rejects.toThrow(ZodError);
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
      await saveFromSirec({ ...data, situations: [{ ...data.situations[0], entiteIds: [] }] });

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
      await saveFromSirec({ ...data, situations: [{ ...data.situations[0], demarchesIds: ['PLAINTE'] }] });

      expect(prisma.demarchesEngagees.create).toHaveBeenCalledWith({
        data: { demarches: { connect: [{ id: 'PLAINTE' }] } },
        select: { id: true },
      });
    });

    it('should not create PersonneConcernee when declarant is null', async () => {
      await saveFromSirec(data);

      expect(prisma.personneConcernee.create).not.toHaveBeenCalled();
    });

    it('should create PersonneConcernee with both participantDeId and declarantDeId when estVictime is true', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: true,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: null,
          commentaire: '',
        },
        victime: { identite: null, adresse: null, commentaire: '', ageId: null },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledOnce();
      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          estVictime: true,
          commentaire: '',
          ageId: null,
          declarantDeId: 'SIREC-42',
          participantDeId: 'SIREC-42',
        },
      });
    });

    it('should create PersonneConcernee for victime with participantDeId when victime is not null', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: false,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: null,
          commentaire: '',
        },
        victime: { identite: null, adresse: null, commentaire: '', ageId: null },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledTimes(2);
      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: { participantDeId: 'SIREC-42', estVictime: true, commentaire: '', ageId: null },
      });
    });

    it('should pass victime.commentaire to PersonneConcernee when victime_non_identifiee=1', async () => {
      await saveFromSirec({
        ...data,
        victime: { identite: null, adresse: null, commentaire: 'Usager (Victime) non identifié : oui', ageId: null },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          participantDeId: 'SIREC-42',
          estVictime: true,
          commentaire: 'Usager (Victime) non identifié : oui',
          ageId: null,
        },
      });
    });

    it('should create PersonneConcernee with nested identite when victime has identite', async () => {
      await saveFromSirec({
        ...data,
        victime: {
          identite: {
            nom: 'Martin',
            prenom: 'Alice',
            email: 'alice@example.com',
            telephone: '0612345678',
            civiliteId: null,
          },
          adresse: null,
          commentaire: '',
          ageId: null,
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          participantDeId: 'SIREC-42',
          estVictime: true,
          commentaire: '',
          ageId: null,
          identite: {
            create: {
              nom: 'Martin',
              prenom: 'Alice',
              email: 'alice@example.com',
              telephone: '0612345678',
              civiliteId: null,
            },
          },
        },
      });
    });

    it('should pass civiliteId to victime identite create when set', async () => {
      await saveFromSirec({
        ...data,
        victime: {
          identite: {
            nom: 'Martin',
            prenom: 'Alice',
            email: 'alice@example.com',
            telephone: '0612345678',
            civiliteId: 'M',
          },
          adresse: null,
          commentaire: '',
          ageId: null,
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          participantDeId: 'SIREC-42',
          estVictime: true,
          commentaire: '',
          ageId: null,
          identite: {
            create: {
              nom: 'Martin',
              prenom: 'Alice',
              email: 'alice@example.com',
              telephone: '0612345678',
              civiliteId: 'M',
            },
          },
        },
      });
    });

    it('should pass ageId to victime PersonneConcernee when set', async () => {
      await saveFromSirec({
        ...data,
        victime: { identite: null, adresse: null, commentaire: 'Age de la victime : 45', ageId: '30-59' },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: { participantDeId: 'SIREC-42', estVictime: true, commentaire: 'Age de la victime : 45', ageId: '30-59' },
      });
    });

    it('should not add identite to victime PersonneConcernee when identite is null', async () => {
      await saveFromSirec({
        ...data,
        victime: { identite: null, adresse: null, commentaire: '', ageId: null },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ identite: expect.anything() }),
      });
    });

    it('should not create victime PersonneConcernee when victime is null', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: false,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: null,
          commentaire: '',
        },
        victime: null,
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledOnce();
    });

    it('should create PersonneConcernee with only declarantDeId when estVictime is false', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: false,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: null,
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          estVictime: false,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          commentaire: '',
          declarantDeId: 'SIREC-42',
        },
      });
    });

    it('should pass commentaire to PersonneConcernee when declarant is anonymous', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: null,
          commentaire: 'Le requérant est anonyme : oui',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          commentaire: 'Le requérant est anonyme : oui',
          declarantDeId: 'SIREC-42',
        },
      });
    });

    it('should pass veutGarderAnonymat to PersonneConcernee', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: true,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: null,
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          estVictime: null,
          veutGarderAnonymat: true,
          lienVictimeId: null,
          lienAutrePrecision: null,
          commentaire: '',
          declarantDeId: 'SIREC-42',
        },
      });
    });

    it('should create PersonneConcernee with nested adresse when adresse is set', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: { rue: '12 rue de la Paix', codePostal: '75001', ville: 'Paris' },
          identite: null,
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          commentaire: '',
          declarantDeId: 'SIREC-42',
          adresse: { create: { rue: '12 rue de la Paix', codePostal: '75001', ville: 'Paris' } },
        },
      });
    });

    it('should create PersonneConcernee with empty strings for null adresse fields', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: { rue: '12 rue de la Paix', codePostal: null, ville: null },
          identite: null,
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          commentaire: '',
          declarantDeId: 'SIREC-42',
          adresse: { create: { rue: '12 rue de la Paix', codePostal: '', ville: '' } },
        },
      });
    });

    it('should create PersonneConcernee with nested identite when identite is set', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: {
            nom: 'Dupont',
            prenom: 'Jean',
            email: 'jean@example.com',
            telephone: '0612345678',
            civiliteId: null,
          },
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          commentaire: '',
          declarantDeId: 'SIREC-42',
          identite: {
            create: {
              nom: 'Dupont',
              prenom: 'Jean',
              email: 'jean@example.com',
              telephone: '0612345678',
              civiliteId: null,
            },
          },
        },
      });
    });

    it('should use empty strings for null identite fields', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: { nom: 'Dupont', prenom: null, email: null, telephone: null, civiliteId: null },
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          commentaire: '',
          declarantDeId: 'SIREC-42',
          identite: { create: { nom: 'Dupont', prenom: '', email: '', telephone: '', civiliteId: null } },
        },
      });
    });

    it('should not add identite to PersonneConcernee when identite is null', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: null,
          lienAutrePrecision: null,
          adresse: null,
          identite: null,
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ identite: expect.anything() }),
      });
    });

    it('should create PersonneConcernee with nested adresse when victime has adresse', async () => {
      await saveFromSirec({
        ...data,
        victime: {
          identite: null,
          adresse: { rue: '5 rue des Lilas', codePostal: '69001', ville: 'Lyon' },
          commentaire: '',
          ageId: null,
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          participantDeId: 'SIREC-42',
          estVictime: true,
          commentaire: '',
          ageId: null,
          adresse: { create: { rue: '5 rue des Lilas', codePostal: '69001', ville: 'Lyon' } },
        },
      });
    });

    it('should use empty strings for null victime adresse fields', async () => {
      await saveFromSirec({
        ...data,
        victime: {
          identite: null,
          adresse: { rue: '5 rue des Lilas', codePostal: null, ville: null },
          commentaire: '',
          ageId: null,
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: {
          participantDeId: 'SIREC-42',
          estVictime: true,
          commentaire: '',
          ageId: null,
          adresse: { create: { rue: '5 rue des Lilas', codePostal: '', ville: '' } },
        },
      });
    });

    it('should not add adresse to victime PersonneConcernee when adresse is null', async () => {
      await saveFromSirec({
        ...data,
        victime: { identite: null, adresse: null, commentaire: '', ageId: null },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ adresse: expect.anything() }),
      });
    });

    it('should pass lienVictimeId to declarant PersonneConcernee when set', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: 'MEMBRE_FAMILLE',
          lienAutrePrecision: null,
          adresse: null,
          identite: null,
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ lienVictimeId: 'MEMBRE_FAMILLE', declarantDeId: 'SIREC-42' }),
      });
    });

    it('should pass lienAutrePrecision to declarant PersonneConcernee when set', async () => {
      await saveFromSirec({
        ...data,
        declarant: {
          estVictime: null,
          veutGarderAnonymat: null,
          lienVictimeId: 'AUTRE',
          lienAutrePrecision: 'Voisin',
          adresse: null,
          identite: null,
          commentaire: '',
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ lienAutrePrecision: 'Voisin', declarantDeId: 'SIREC-42' }),
      });
    });

    it('should wrap all creates in a single transaction', async () => {
      await saveFromSirec(data);

      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('should not call requeteEtape.create when etapes is empty', async () => {
      await saveFromSirec(data);

      expect(prisma.requeteEtape.create).not.toHaveBeenCalled();
    });

    it('should create one RequeteEtape per etape with correct data', async () => {
      await saveFromSirec({
        ...data,
        etapes: [
          {
            nom: "Réception à l'institution de provenance : Institution 1",
            entiteId: 'ars-1',
            statutId: 'FAIT',
            note: 'Note ligne 1\nNote ligne 2',
          },
        ],
      });

      expect(prisma.requeteEtape.create).toHaveBeenCalledOnce();
      expect(prisma.requeteEtape.create).toHaveBeenCalledWith({
        data: {
          requeteId: 'SIREC-42',
          entiteId: 'ars-1',
          statutId: 'FAIT',
          nom: "Réception à l'institution de provenance : Institution 1",
          notes: { create: [{ texte: 'Note ligne 1\nNote ligne 2' }] },
        },
      });
    });

    it('should create RequeteEtape with createdAt when set', async () => {
      const date = new Date('2024-06-10');
      await saveFromSirec({
        ...data,
        etapes: [
          {
            nom: 'Envoyer un accusé de réception au déclarant',
            entiteId: 'ars-1',
            statutId: 'FAIT',
            createdAt: date,
            note: "Date d'envoi de l'accusé de réception au requérant : 10/06/2024",
          },
        ],
      });

      expect(prisma.requeteEtape.create).toHaveBeenCalledWith({
        data: {
          requeteId: 'SIREC-42',
          entiteId: 'ars-1',
          statutId: 'FAIT',
          nom: 'Envoyer un accusé de réception au déclarant',
          createdAt: date,
          notes: { create: [{ texte: "Date d'envoi de l'accusé de réception au requérant : 10/06/2024" }] },
        },
      });
    });

    it('should create RequeteEtape without notes when note is null', async () => {
      await saveFromSirec({
        ...data,
        etapes: [
          { nom: 'Envoyer un accusé de réception au déclarant', entiteId: 'ars-1', statutId: 'A_FAIRE', note: null },
        ],
      });

      expect(prisma.requeteEtape.create).toHaveBeenCalledWith({
        data: {
          requeteId: 'SIREC-42',
          entiteId: 'ars-1',
          statutId: 'A_FAIRE',
          nom: 'Envoyer un accusé de réception au déclarant',
        },
      });
    });

    it('should create one RequeteEtape per etape when multiple', async () => {
      await saveFromSirec({
        ...data,
        etapes: [
          { nom: "Réception à l'institution de provenance : A", entiteId: 'ars-1', statutId: 'FAIT', note: '' },
          { nom: "Réception à l'institution de provenance : B", entiteId: 'ars-2', statutId: 'FAIT', note: '' },
        ],
      });

      expect(prisma.requeteEtape.create).toHaveBeenCalledTimes(2);
    });

    it('should connect clotureReason when set on etape', async () => {
      await saveFromSirec({
        ...data,
        etapes: [{ nom: 'Clôture', entiteId: 'ars-1', statutId: 'FAIT', note: null, clotureReason: 'SANS_SUITE' }],
      });

      expect(prisma.requeteEtape.create).toHaveBeenCalledWith({
        data: {
          requeteId: 'SIREC-42',
          entiteId: 'ars-1',
          statutId: 'FAIT',
          nom: 'Clôture',
          clotureReason: { connect: [{ id: 'SANS_SUITE' }] },
        },
      });
    });

    it('should not include clotureReason when not set on etape', async () => {
      await saveFromSirec({
        ...data,
        etapes: [{ nom: 'Clôture', entiteId: 'ars-1', statutId: 'FAIT', note: null }],
      });

      expect(prisma.requeteEtape.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ clotureReason: expect.anything() }),
      });
    });

    it('should use requeteStatutId from data for requeteEntite', async () => {
      await saveFromSirec({ ...data, requeteStatutId: 'CLOTUREE' });

      expect(prisma.requeteEntite.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([expect.objectContaining({ statutId: 'CLOTUREE' })]),
      });
    });

    it('should use EN_COURS statutId for requeteEntite by default', async () => {
      await saveFromSirec(data);

      expect(prisma.requeteEntite.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([expect.objectContaining({ statutId: 'EN_COURS' })]),
      });
    });

    describe('misEnCause RPPS', () => {
      const rppsData = {
        kind: 'rpps' as const,
        rpps: '12345678901',
        civilite: 'M',
        nom: 'Dupont',
        prenom: 'Jean',
        codePostal: '76000',
        ville: 'Rouen',
        misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
        misEnCauseTypePrecisionId: 'PROF_SANTE',
      };

      it('should always create MisEnCause with RPPS data', async () => {
        await saveFromSirec({ ...data, situations: [{ ...data.situations[0], misEnCauseData: rppsData }] });

        expect(prisma.misEnCause.create).toHaveBeenCalledWith({
          data: {
            rpps: '12345678901',
            civilite: 'M',
            nom: 'Dupont',
            prenom: 'Jean',
            codePostal: '76000',
            ville: 'Rouen',
            misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
            misEnCauseTypePrecisionId: 'PROF_SANTE',
          },
          select: { id: true },
        });
      });

      it('should create empty MisEnCause when misEnCauseData is null', async () => {
        await saveFromSirec(data);

        expect(prisma.misEnCause.create).toHaveBeenCalledWith({ data: {}, select: { id: true } });
      });
    });

    describe('misEnCause FINESS', () => {
      const finessData = {
        kind: 'finess' as const,
        finess: '750000001',
        misEnCauseTypeId: 'ETABLISSEMENT',
        misEnCauseTypePrecisionId: 'ETABLISSEMENT',
        nomService: 'Hôpital A',
        codePostal: '75010',
        ville: 'Paris',
      };

      it('should always create MisEnCause with FINESS data', async () => {
        await saveFromSirec({ ...data, situations: [{ ...data.situations[0], misEnCauseData: finessData }] });

        expect(prisma.misEnCause.create).toHaveBeenCalledWith({
          data: {
            finess: '750000001',
            misEnCauseTypeId: 'ETABLISSEMENT',
            misEnCauseTypePrecisionId: 'ETABLISSEMENT',
            nomService: 'Hôpital A',
            codePostal: '75010',
            ville: 'Paris',
          },
          select: { id: true },
        });
      });
    });

    describe('LieuDeSurvenue avec données (Case B FINESS)', () => {
      const lieuData = {
        finess: '750000001',
        codePostal: '75010',
        categCode: '355',
        categLib: 'CH',
        lieuTypeId: 'ETABLISSEMENT_SANTE',
        lieuPrecision: 'CH',
        adresse: { label: 'Hôpital A', numero: '1', rue: 'RUE de la Paix', codePostal: '75010', ville: 'Paris' },
      };

      it('should always create LieuDeSurvenue with all fields and nested adresse', async () => {
        await saveFromSirec({ ...data, situations: [{ ...data.situations[0], lieuDeSurvenueData: lieuData }] });

        expect(prisma.lieuDeSurvenue.create).toHaveBeenCalledWith({
          data: {
            finess: '750000001',
            codePostal: '75010',
            categCode: '355',
            categLib: 'CH',
            lieuTypeId: 'ETABLISSEMENT_SANTE',
            lieuPrecision: 'CH',
            adresse: {
              create: { label: 'Hôpital A', numero: '1', rue: 'RUE de la Paix', codePostal: '75010', ville: 'Paris' },
            },
          },
          select: { id: true },
        });
      });

      it('should create empty LieuDeSurvenue when lieuDeSurvenueData is null', async () => {
        await saveFromSirec(data);

        expect(prisma.lieuDeSurvenue.create).toHaveBeenCalledWith({ data: {}, select: { id: true } });
      });
    });

    describe('misEnCause AUTRE', () => {
      const autreDataWithType = {
        kind: 'autre' as const,
        misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
        misEnCauseTypePrecisionId: 'ACUPUNCTEUR',
        autrePrecision: 'Type de mis en cause : Acuponcteur\nNom / structure : Dr Test\nAdresse : Non renseigné',
      };

      const autreDataNoType = {
        kind: 'autre' as const,
        misEnCauseTypeId: null,
        misEnCauseTypePrecisionId: null,
        autrePrecision: 'Type de mis en cause : Autre\nNom / structure : Non renseigné\nAdresse : Non renseigné',
      };

      it('should create MisEnCause with type, precision and autrePrecision', async () => {
        await saveFromSirec({ ...data, situations: [{ ...data.situations[0], misEnCauseData: autreDataWithType }] });

        expect(prisma.misEnCause.create).toHaveBeenCalledWith({
          data: {
            misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
            misEnCauseTypePrecisionId: 'ACUPUNCTEUR',
            autrePrecision: 'Type de mis en cause : Acuponcteur\nNom / structure : Dr Test\nAdresse : Non renseigné',
          },
          select: { id: true },
        });
      });

      it('should create MisEnCause without type and precision when both are null', async () => {
        await saveFromSirec({ ...data, situations: [{ ...data.situations[0], misEnCauseData: autreDataNoType }] });

        expect(prisma.misEnCause.create).toHaveBeenCalledWith({
          data: {
            misEnCauseTypeId: undefined,
            misEnCauseTypePrecisionId: undefined,
            autrePrecision: 'Type de mis en cause : Autre\nNom / structure : Non renseigné\nAdresse : Non renseigné',
          },
          select: { id: true },
        });
      });
    });

    describe('misEnCause observation (autrePrecision sur RPPS/FINESS)', () => {
      const rppsWithObs = {
        kind: 'rpps' as const,
        rpps: '12345678901',
        civilite: 'M',
        nom: 'Dupont',
        prenom: 'Jean',
        codePostal: '76000',
        ville: 'Rouen',
        misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
        misEnCauseTypePrecisionId: 'PROF_SANTE',
        autrePrecision: 'Observations : Texte important',
      };

      it('should include autrePrecision in RPPS MisEnCause when set', async () => {
        await saveFromSirec({ ...data, situations: [{ ...data.situations[0], misEnCauseData: rppsWithObs }] });

        expect(prisma.misEnCause.create).toHaveBeenCalledWith({
          data: {
            rpps: '12345678901',
            civilite: 'M',
            nom: 'Dupont',
            prenom: 'Jean',
            codePostal: '76000',
            ville: 'Rouen',
            misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
            misEnCauseTypePrecisionId: 'PROF_SANTE',
            autrePrecision: 'Observations : Texte important',
          },
          select: { id: true },
        });
      });

      it('should not include autrePrecision in RPPS MisEnCause when absent', async () => {
        const rppsData = {
          kind: 'rpps' as const,
          rpps: '12345678901',
          civilite: 'M',
          nom: 'Dupont',
          prenom: 'Jean',
          codePostal: '76000',
          ville: 'Rouen',
          misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
          misEnCauseTypePrecisionId: 'PROF_SANTE',
        };
        await saveFromSirec({ ...data, situations: [{ ...data.situations[0], misEnCauseData: rppsData }] });

        const call = vi.mocked(prisma.misEnCause.create).mock.calls[0][0];
        expect(call.data).not.toHaveProperty('autrePrecision');
      });
    });
  });
});
