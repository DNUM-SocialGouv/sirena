import {
  AGE,
  AUTORITE_TYPE,
  DEMARCHES_ENGAGEES,
  LIEN_VICTIME,
  LIEU_TYPE,
  MIS_EN_CAUSE_TYPE,
  MOTIF,
  PROFESSION_DOMICILE_TYPE,
  PROFESSION_TYPE,
  RECEPTION_TYPE,
  TRANSPORT_TYPE,
} from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/__mocks__/prisma';
import type { Requete } from '../../../generated/client';
import {
  createOrGetFromDematSocial,
  createRequeteFromDematSocial,
  getRequeteByDematSocialId,
} from './requetes.service';
import type { CreateRequeteFromDematSocialDto } from './requetes.type';

vi.mock('@/libs/prisma');

const getfakeRequeteDto = () => {
  const adresse = {
    label: 'Hôpital Saint-Exemple',
    codePostal: '75001',
    ville: 'Paris',
    rue: 'Rue de la Santé',
    numero: '12',
  };

  const fakeParticipant = {
    ageId: AGE['18-29'],
    telephone: '0987654321',
    estHandicapee: false,
    estVictimeInformee: true,
    victimeInformeeCommentaire: null,
    autrePersonnes: null,
    adresse,
  };

  const fakeDeclarant = {
    ageId: AGE['-18'],
    nom: 'test',
    prenom: 'test',
    civiliteId: 'M',
    email: 'test@test.com',
    telephone: '0123456789',
    estHandicapee: false,
    lienVictimeId: LIEN_VICTIME.PROCHE,
    estVictime: false,
    estAnonyme: false,
    adresse,
  };

  const fakeSituations = [
    {
      lieuDeSurvenue: {
        codePostal: '75001',
        commentaire: 'Couloir du service.',
        adresse,
        lieuTypeId: LIEU_TYPE.ETABLISSEMENT_SANTE,
        transportTypeId: TRANSPORT_TYPE.AMBULANCE,
        societeTransport: 'TransMed',
        finess: '123456789',
      },
      misEnCause: {
        misEnCauseTypeId: MIS_EN_CAUSE_TYPE.PROFESSIONNEL,
        professionTypeId: PROFESSION_TYPE.PROF_SANTE,
        professionDomicileTypeId: PROFESSION_DOMICILE_TYPE.SSIAD,
        rpps: '1010101010',
        commentaire: 'Comportement inadapté signalé.',
      },

      demarchesEngagees: {
        demarches: [DEMARCHES_ENGAGEES.CONTACT_RESPONSABLES, DEMARCHES_ENGAGEES.CONTACT_ORGANISME],
        dateContactEtablissement: new Date(),
        etablissementARepondu: true,
        commentaire: '',
        organisme: 'ARS Île-de-France',
        datePlainte: null,
        autoriteTypeId: AUTORITE_TYPE.GENDARMERIE,
      },
      faits: [
        {
          motifs: [MOTIF.NON_RESPECT_DROITS, MOTIF.PROBLEME_LOCAUX],
          consequences: [],
          maltraitanceTypes: [],
          dateDebut: new Date(),
          dateFin: new Date(),
          commentaire: '',
        },
      ],
      entiteIds: ['entite-1', 'entite-2'],
    },
  ];

  return {
    receptionDate: new Date(),
    receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
    dematSocialId: 1,
    declarant: fakeDeclarant,
    participant: fakeParticipant,
    situations: fakeSituations,
  } satisfies CreateRequeteFromDematSocialDto;
};

const getMinimalRequeteDto = () => {
  const dto = {
    receptionDate: new Date(),
    receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
    dematSocialId: 42,
    declarant: {
      ageId: null,
      telephone: null,
      email: '',
      nom: '',
      prenom: '',
      civiliteId: null,
      estHandicapee: null,
      lienVictimeId: null,
      estVictime: false,
      estAnonyme: null,
      adresse: null,
    },
    participant: {
      telephone: null,
      ageId: null,
      adresse: null,
      estHandicapee: null,
      estVictimeInformee: null,
      victimeInformeeCommentaire: null,
      autrePersonnes: null,
    },
    situations: [
      {
        lieuDeSurvenue: {
          codePostal: '',
          commentaire: '',
          adresse: null,
          lieuTypeId: null,
          transportTypeId: null,
          societeTransport: '',
          finess: '',
        },
        misEnCause: {
          misEnCauseTypeId: null,
          professionTypeId: null,
          professionDomicileTypeId: null,
          rpps: null,
          commentaire: null,
        },
        demarchesEngagees: {
          demarches: [],
          dateContactEtablissement: null,
          etablissementARepondu: false,
          organisme: '',
          datePlainte: null,
          autoriteTypeId: null,
        },
        faits: [
          {
            motifs: [],
            consequences: [],
            maltraitanceTypes: [],
            dateDebut: null,
            dateFin: null,
            commentaire: null,
          },
        ],
        entiteIds: [],
      },
    ],
  };
  return dto satisfies CreateRequeteFromDematSocialDto;
};

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
        const receptionTypeId = RECEPTION_TYPE.FORMULAIRE;

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
              numero: '123',
            },
            nom: 'test',
            prenom: 'test',
            email: 'test@test.fr',
            civiliteId: 'M',
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
              numero: '123',
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
        id: '1',
        dematSocialId: 123,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Requête créée automatiquement',
        receptionDate: new Date(),
        receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
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

  describe('createRequeteFromDematSocial()', () => {
    it('should create a requete in a transition', async () => {
      const fakeRequeteDto = getfakeRequeteDto();

      const transactionSpy = vi.mocked(prisma.$transaction);
      transactionSpy.mockImplementation(async (cb) => cb(prisma));

      vi.mocked(prisma.requete.create).mockResolvedValueOnce({
        id: '1',
        dematSocialId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Requête créée automatiquement',
        receptionDate: new Date(),
        receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      });

      vi.mocked(prisma.personneConcernee.create).mockResolvedValueOnce({
        ...fakeRequeteDto.declarant,
        id: '1',
        estNonIdentifiee: null,
        estIdentifie: null,
        estVictimeInformee: null,
        victimeInformeeCommentaire: '',
        veutGarderAnonymat: null,
        commentaire: '',
        autrePersonnes: '',
        declarantDeId: '1',
        participantDeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.adresse.create).mockResolvedValueOnce({
        ...fakeRequeteDto.declarant.adresse,
        id: '1',
        personneConcerneeId: '1',
        lieuDeSurvenueId: null,
      });

      vi.mocked(prisma.personneConcernee.create).mockResolvedValueOnce({
        ...fakeRequeteDto.participant,
        id: '2',
        estHandicapee: null,
        lienVictimeId: LIEN_VICTIME.PROCHE,
        estNonIdentifiee: null,
        estIdentifie: null,
        estVictimeInformee: null,
        victimeInformeeCommentaire: '',
        estVictime: true,
        estAnonyme: false,
        veutGarderAnonymat: null,
        commentaire: '',
        autrePersonnes: '',
        declarantDeId: '1',
        participantDeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.adresse.create).mockResolvedValueOnce({
        ...fakeRequeteDto.declarant.adresse,
        id: '2',
        personneConcerneeId: '2',
        lieuDeSurvenueId: null,
      });

      fakeRequeteDto.situations.forEach((situation) => {
        vi.mocked(prisma.lieuDeSurvenue.create).mockResolvedValueOnce({
          ...situation.lieuDeSurvenue,
          id: '1',
        });

        if (situation.lieuDeSurvenue.adresse) {
          vi.mocked(prisma.adresse.create).mockResolvedValueOnce({
            ...fakeRequeteDto.declarant.adresse,
            id: '1',
            personneConcerneeId: null,
            lieuDeSurvenueId: '1',
          });
        }

        vi.mocked(prisma.misEnCause.create).mockResolvedValueOnce({
          ...situation.misEnCause,
          id: '1',
        });

        vi.mocked(prisma.demarchesEngagees.create).mockResolvedValueOnce({
          ...situation.demarchesEngagees,
          id: '1',
          autoriteTypeId: situation.demarchesEngagees.autoriteTypeId,
        });

        vi.mocked(prisma.situation.create).mockResolvedValueOnce({
          id: '1',
          requeteId: '1',
          lieuDeSurvenueId: '1',
          misEnCauseId: '1',
          demarchesEngageesId: '1',
        });

        situation.faits.forEach((fait) => {
          vi.mocked(prisma.fait.create).mockResolvedValueOnce({
            ...fait,
            situationId: '1',
          });

          vi.mocked(prisma.faitMotif.createMany).mockResolvedValueOnce({
            count: fait.motifs.length,
          });

          vi.mocked(prisma.faitConsequence.createMany).mockResolvedValueOnce({
            count: fait.consequences.length,
          });

          vi.mocked(prisma.faitMaltraitanceType.createMany).mockResolvedValueOnce({
            count: fait.maltraitanceTypes.length,
          });
        });

        vi.mocked(prisma.requete.findUniqueOrThrow).mockResolvedValueOnce({
          id: '1',
          commentaire: '',
          receptionDate: fakeRequeteDto.receptionDate,
          dematSocialId: fakeRequeteDto.dematSocialId,
          receptionTypeId: fakeRequeteDto.receptionTypeId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      const requete = await createRequeteFromDematSocial(fakeRequeteDto);

      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(requete).toBeDefined();

      expect(prisma.requete.create).toHaveBeenCalledWith({
        data: {
          dematSocialId: fakeRequeteDto.dematSocialId,
          receptionDate: fakeRequeteDto.receptionDate,
          receptionType: { connect: { id: fakeRequeteDto.receptionTypeId } },
          requeteEntites: {
            create: {
              entite: {
                connect: {
                  id: undefined,
                },
              },
            },
          },
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenNthCalledWith(1, {
        data: {
          age: { connect: { id: fakeRequeteDto.declarant.ageId } },
          estVictime: false,
          estAnonyme: false,
          declarantDe: { connect: { id: '1' } },
          lienVictime: { connect: { id: fakeRequeteDto.declarant.lienVictimeId } },
          estHandicapee: fakeRequeteDto.declarant.estHandicapee,
          identite: {
            create: {
              nom: fakeRequeteDto.declarant.nom,
              prenom: fakeRequeteDto.declarant.prenom,
              civilite: { connect: { id: fakeRequeteDto.declarant.civiliteId } },
              email: fakeRequeteDto.declarant.email,
              telephone: fakeRequeteDto.declarant.telephone,
            },
          },
        },
      });

      expect(prisma.personneConcernee.create).toHaveBeenNthCalledWith(2, {
        data: {
          age: { connect: { id: fakeRequeteDto.participant.ageId } },
          participantDe: { connect: { id: '1' } },
          autrePersonnes: '',
          estHandicapee: fakeRequeteDto.participant.estHandicapee,
          estVictimeInformee: fakeRequeteDto.participant.estVictimeInformee,
          identite: {
            create: {
              telephone: fakeRequeteDto.participant.telephone,
            },
          },
          victimeInformeeCommentaire: '',
        },
        select: { id: true },
      });
    });

    it('should create a requete with minimal info', async () => {
      const dto = getMinimalRequeteDto();

      const transactionSpy = vi.mocked(prisma.$transaction);
      transactionSpy.mockImplementation(async (cb) => cb(prisma));

      vi.mocked(prisma.requete.create).mockResolvedValueOnce({
        id: '1',
        dematSocialId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Requête créée automatiquement',
        receptionDate: new Date(),
        receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      });

      vi.mocked(prisma.personneConcernee.create).mockResolvedValueOnce({
        ...dto.declarant,
        id: '1',
        estNonIdentifiee: null,
        estIdentifie: null,
        estVictimeInformee: null,
        victimeInformeeCommentaire: '',
        veutGarderAnonymat: null,
        commentaire: '',
        autrePersonnes: '',
        declarantDeId: '1',
        participantDeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.personneConcernee.create).mockResolvedValueOnce({
        ...dto.participant,
        ageId: dto.participant?.ageId ?? null,
        id: '2',
        estHandicapee: null,
        lienVictimeId: LIEN_VICTIME.PROCHE,
        estNonIdentifiee: null,
        estIdentifie: null,
        estVictimeInformee: null,
        victimeInformeeCommentaire: '',
        estVictime: true,
        estAnonyme: false,
        veutGarderAnonymat: null,
        commentaire: '',
        autrePersonnes: '',
        declarantDeId: null,
        participantDeId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      dto.situations.forEach((situation) => {
        vi.mocked(prisma.lieuDeSurvenue.create).mockResolvedValueOnce({
          ...situation.lieuDeSurvenue,
          id: '1',
        });

        vi.mocked(prisma.misEnCause.create).mockResolvedValueOnce({
          ...situation.misEnCause,
          commentaire: '',
          id: '1',
        });

        vi.mocked(prisma.demarchesEngagees.create).mockResolvedValueOnce({
          ...situation.demarchesEngagees,
          id: '1',
          commentaire: '',
          autoriteTypeId: situation.demarchesEngagees.autoriteTypeId,
        });

        vi.mocked(prisma.situation.create).mockResolvedValueOnce({
          id: '1',
          requeteId: '1',
          lieuDeSurvenueId: '1',
          misEnCauseId: '1',
          demarchesEngageesId: '1',
        });

        situation.faits.forEach((fait) => {
          vi.mocked(prisma.fait.create).mockResolvedValueOnce({
            ...fait,
            situationId: '1',
            commentaire: '',
          });

          vi.mocked(prisma.faitMotif.createMany).mockResolvedValueOnce({
            count: fait.motifs.length,
          });

          vi.mocked(prisma.faitConsequence.createMany).mockResolvedValueOnce({
            count: fait.consequences.length,
          });

          vi.mocked(prisma.faitMaltraitanceType.createMany).mockResolvedValueOnce({
            count: fait.maltraitanceTypes.length,
          });
        });

        vi.mocked(prisma.requete.findUniqueOrThrow).mockResolvedValueOnce({
          id: '1',
          commentaire: '',
          receptionDate: dto.receptionDate,
          dematSocialId: dto.dematSocialId,
          receptionTypeId: dto.receptionTypeId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
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
        receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      };

      mockedFindFirst.mockResolvedValueOnce(existing);

      const result = await createOrGetFromDematSocial({
        dematSocialId: 123,
        receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
        receptionDate: new Date(),
        declarant: {
          adresse: {
            label: '123 Main St',
            codePostal: '12345',
            ville: 'Anytown',
            rue: 'Main St',
            numero: '123',
          },
          nom: 'test',
          prenom: 'test',
          email: 'test@test.fr',
          civiliteId: 'M',
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
            numero: '123',
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
        receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
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
        receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
        receptionDate: new Date(),
        declarant: {
          adresse: {
            label: '123 Main St',
            codePostal: '12345',
            ville: 'Anytown',
            rue: 'Main St',
            numero: '123',
          },
          nom: 'test',
          prenom: 'test',
          email: 'test@test.fr',
          civiliteId: 'M',
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
            numero: '123',
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
          receptionType: { connect: { id: RECEPTION_TYPE.FORMULAIRE } },
          requeteEntites: {
            create: {
              entite: {
                connect: {
                  id: undefined,
                },
              },
            },
          },
        },
      });
      expect(result).toBe(created);
    });
  });
});
