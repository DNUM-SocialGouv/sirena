import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma as prismaMock } from '../../libs/__mocks__/prisma.js';
import {
  type Identite,
  type PersonneConcernee,
  prisma,
  type Requete,
  type RequeteEntite,
  type RequeteEtape,
} from '../../libs/prisma.js';
import {
  closeRequeteForEntite,
  enrichSituationWithTraitementDesFaits,
  getOtherEntitesAffected,
  getRequeteEntiteById,
  getRequetesEntite,
  hasAccessToRequete,
  updatePrioriteRequete,
  updateRequete,
  updateRequeteDeclarant,
  updateRequeteSituation,
  updateStatusRequete,
} from './requetesEntite.service.js';

vi.mock('@sirena/backend-utils', () => ({
  helpers: {
    throwHTTPException409Conflict: vi.fn((message: string, options?: { cause?: unknown }) => {
      const error = new Error(message);
      if (options?.cause) {
        (error as Error & { cause?: unknown }).cause = options.cause;
      }
      throw error;
    }),
  },
}));

vi.mock('../changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../helpers/sse.js', () => ({
  sseEventManager: {
    emitRequeteUpdated: vi.fn(),
  },
}));

vi.mock('../entites/entites.service.js', () => ({
  buildEntitesTraitement: vi.fn(),
  getEntiteAscendanteId: vi.fn(),
}));

vi.mock('../../libs/minio.js', () => ({
  deleteFileFromMinio: vi.fn(),
  getFileBuffer: vi.fn(),
  getFileStream: vi.fn(),
  uploadFileToMinio: vi.fn(),
}));

import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { createChangeLog } from '../changelog/changelog.service.js';
import { buildEntitesTraitement, getEntiteAscendanteId } from '../entites/entites.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    requeteEntite: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    requete: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    requeteClotureReasonEnum: {
      findUnique: vi.fn(),
    },
    requeteEtape: {
      findFirst: vi.fn(),
    },
    uploadedFile: {
      findMany: vi.fn(),
    },
  },
}));

export const mockRequeteEntite: RequeteEntite & { requete: Requete & { situations?: unknown[] } } & {
  requeteEtape: RequeteEtape[];
} = {
  requeteId: 'req123',
  entiteId: 'ent123',
  statutId: 'EN_COURS',
  prioriteId: null,
  requete: {
    id: 'req123',
    dematSocialId: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
    commentaire: 'Commentaire',
    receptionDate: new Date(),
    receptionTypeId: 'receptionTypeId',
    situations: [],
  },
  requeteEtape: [
    {
      id: 'etape1',
      statutId: 'A_QUALIFIER',
      createdAt: new Date(),
      updatedAt: new Date(),
      entiteId: 'ent123',
      estPartagee: false,
      nom: 'Etape 1',
      requeteId: 'req123',
      clotureReasonId: null,
      createdById: 'user123',
    },
  ],
};

const mockedRequeteEntite = vi.mocked(prisma.requeteEntite);

const fakeEtape = {
  id: 'etape1',
  statutId: 'CLOTUREE',
  requeteId: 'req123',
  entiteId: 'ent123',
  nom: 'Etape 1',
  estPartagee: false,
  clotureReasonId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: 'user123',
};

describe('requetesEntite.service', () => {
  describe('getRequetesEntite', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch requetesEntite with default sort and pagination', async () => {
      mockedRequeteEntite.findMany.mockResolvedValueOnce([mockRequeteEntite]);
      mockedRequeteEntite.count.mockResolvedValueOnce(1);

      const result = await getRequetesEntite(null, {});

      expect(mockedRequeteEntite.findMany).toHaveBeenCalledWith({
        skip: 0,
        orderBy: {
          requete: {
            createdAt: 'desc',
          },
        },
        where: {},
        include: {
          requete: {
            include: {
              declarant: {
                include: {
                  identite: true,
                  adresse: true,
                },
              },
              participant: {
                include: {
                  adresse: true,
                  identite: true,
                },
              },
              situations: {
                include: {
                  faits: {
                    include: {
                      consequences: true,
                      maltraitanceTypes: true,
                      motifs: {
                        include: {
                          motif: true,
                        },
                      },
                      motifsDeclaratifs: {
                        include: {
                          motifDeclaratif: true,
                        },
                      },
                      fichiers: true,
                    },
                  },
                  lieuDeSurvenue: {
                    include: {
                      adresse: true,
                      lieuType: true,
                      transportType: true,
                    },
                  },
                  misEnCause: {
                    include: {
                      misEnCauseType: true,
                      misEnCauseTypePrecision: {
                        include: {
                          misEnCauseType: true,
                        },
                      },
                    },
                  },
                  situationEntites: {
                    include: {
                      entite: true,
                    },
                  },
                },
              },
            },
          },
          requeteEtape: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(mockedRequeteEntite.count).toHaveBeenCalled();
      expect(result).toEqual({ data: [mockRequeteEntite], total: 1 });
    });

    it('should respect offset, limit, sort and order', async () => {
      mockedRequeteEntite.findMany.mockResolvedValueOnce([mockRequeteEntite]);
      mockedRequeteEntite.count.mockResolvedValueOnce(1);

      const result = await getRequetesEntite(null, {
        offset: 10,
        limit: 5,
        sort: 'id',
        order: 'asc',
      });

      expect(mockedRequeteEntite.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        orderBy: {
          id: 'asc',
        },
        where: {},
        include: {
          requete: {
            include: {
              declarant: {
                include: {
                  identite: true,
                  adresse: true,
                },
              },
              participant: {
                include: {
                  adresse: true,
                  identite: true,
                },
              },
              situations: {
                include: {
                  faits: {
                    include: {
                      consequences: true,
                      maltraitanceTypes: true,
                      motifs: {
                        include: {
                          motif: true,
                        },
                      },
                      motifsDeclaratifs: {
                        include: {
                          motifDeclaratif: true,
                        },
                      },
                      fichiers: true,
                    },
                  },
                  lieuDeSurvenue: {
                    include: {
                      adresse: true,
                      lieuType: true,
                      transportType: true,
                    },
                  },
                  misEnCause: {
                    include: {
                      misEnCauseType: true,
                      misEnCauseTypePrecision: {
                        include: {
                          misEnCauseType: true,
                        },
                      },
                    },
                  },
                  situationEntites: {
                    include: {
                      entite: true,
                    },
                  },
                },
              },
            },
          },
          requeteEtape: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(result.total).toBe(1);
    });

    it('should call prisma with where conditions when search is provided', async () => {
      mockedRequeteEntite.findMany.mockResolvedValueOnce([mockRequeteEntite]);
      mockedRequeteEntite.count.mockResolvedValueOnce(1);

      const result = await getRequetesEntite(null, {
        offset: 10,
        limit: 5,
        sort: 'id',
        order: 'asc',
        search: 'test-search',
      });

      expect(mockedRequeteEntite.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        orderBy: {
          id: 'asc',
        },
        where: expect.objectContaining({ OR: expect.any(Array) }),
        include: {
          requete: {
            include: {
              declarant: {
                include: {
                  identite: true,
                  adresse: true,
                },
              },
              participant: {
                include: {
                  adresse: true,
                  identite: true,
                },
              },
              situations: {
                include: {
                  faits: {
                    include: {
                      consequences: true,
                      maltraitanceTypes: true,
                      motifs: {
                        include: {
                          motif: true,
                        },
                      },
                      motifsDeclaratifs: {
                        include: {
                          motifDeclaratif: true,
                        },
                      },
                      fichiers: true,
                    },
                  },
                  lieuDeSurvenue: {
                    include: {
                      adresse: true,
                      lieuType: true,
                      transportType: true,
                    },
                  },
                  misEnCause: {
                    include: {
                      misEnCauseType: true,
                      misEnCauseTypePrecision: {
                        include: {
                          misEnCauseType: true,
                        },
                      },
                    },
                  },
                  situationEntites: {
                    include: {
                      entite: true,
                    },
                  },
                },
              },
            },
          },
          requeteEtape: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(result.total).toBe(1);
    });
  });

  describe('hasAccessToRequete', () => {
    it('should return true if requeteEntite exists for given id and entiteIds', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      const result = await hasAccessToRequete({
        requeteId: mockRequeteEntite.requeteId,
        entiteId: mockRequeteEntite.entiteId,
      });
      expect(result).toBe(true);
    });

    it('should return false if requeteEntite does not exist for given id', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(null);
      const result = await hasAccessToRequete({
        requeteId: mockRequeteEntite.requeteId,
        entiteId: mockRequeteEntite.entiteId,
      });
      expect(result).toBe(false);
    });
  });

  describe('getOtherEntitesAffected', () => {
    it('should return other entites affected by the requete', async () => {
      const mockOtherEntite = {
        prioriteId: mockRequeteEntite.prioriteId,
        entiteId: mockRequeteEntite.entiteId,
        requeteId: mockRequeteEntite.requeteId,
        statutId: mockRequeteEntite.statutId,
        entite: {
          id: 'Entite 1',
          label: 'Entite 1',
          nomComplet: 'Entite 1',
          entiteTypeId: 'Entite 1',
        },
        requeteEtape: [],
      };
      const mockSecondOtherEntite = {
        prioriteId: mockRequeteEntite.prioriteId,
        entiteId: 'entite-2',
        requeteId: mockRequeteEntite.requeteId,
        statutId: mockRequeteEntite.statutId,
        entite: {
          id: 'Entite 2',
          label: 'Entite 2',
          nomComplet: 'Entite 2',
          entiteTypeId: 'Entite 2',
        },
      };
      vi.mocked(prisma.requeteEntite.findMany).mockResolvedValueOnce([mockOtherEntite, mockSecondOtherEntite]);
      const result = await getOtherEntitesAffected(mockRequeteEntite.requeteId, mockRequeteEntite.entiteId);

      expect(prisma.requeteEntite.findMany).toHaveBeenCalled();

      expect(result).toEqual([
        {
          ...mockOtherEntite.entite,
          statutId: mockOtherEntite.statutId,
        },
        {
          ...mockSecondOtherEntite.entite,
          statutId: mockOtherEntite.statutId,
        },
      ]);
    });
  });

  describe('getRequeteEntiteById', () => {
    it('should fetch requeteEntite by id with related data', async () => {
      vi.mocked(prisma.requeteEntite.findFirst).mockResolvedValueOnce(mockRequeteEntite);

      const result = await getRequeteEntiteById(mockRequeteEntite.requeteId, mockRequeteEntite.entiteId);

      expect(prisma.requeteEntite.findFirst).toHaveBeenCalledWith({
        where: {
          requeteId: mockRequeteEntite.requeteId,
          entiteId: mockRequeteEntite.entiteId,
        },
        include: {
          entite: true,
          requete: {
            include: {
              declarant: {
                include: {
                  identite: {
                    include: {
                      civilite: true,
                    },
                  },
                  adresse: true,
                  lienVictime: true,
                },
              },
              participant: {
                include: {
                  adresse: true,
                  age: true,
                  identite: true,
                  lienVictime: true,
                  participantDe: true,
                },
              },
              fichiersRequeteOriginale: true,
              situations: {
                include: {
                  lieuDeSurvenue: {
                    include: { adresse: true, lieuType: true, transportType: true },
                  },
                  misEnCause: {
                    include: {
                      misEnCauseType: true,
                      misEnCauseTypePrecision: {
                        include: {
                          misEnCauseType: true,
                        },
                      },
                    },
                  },
                  faits: {
                    include: {
                      motifs: { include: { motif: true } },
                      motifsDeclaratifs: { include: { motifDeclaratif: true } },
                      consequences: { include: { consequence: true } },
                      maltraitanceTypes: { include: { maltraitanceType: true } },
                      fichiers: true,
                    },
                  },
                  demarchesEngagees: {
                    include: {
                      demarches: true,
                      autoriteType: true,
                      etablissementReponse: true,
                    },
                  },
                  situationEntites: {
                    include: {
                      entite: true,
                    },
                  },
                },
              },
            },
          },
          requeteEtape: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(result).toEqual(mockRequeteEntite);
    });

    it('should return null when entiteIds is empty', async () => {
      const result = await getRequeteEntiteById(mockRequeteEntite.requeteId, null);
      expect(result).toBeNull();
    });

    it('should return null when entiteIds is null', async () => {
      const result = await getRequeteEntiteById(mockRequeteEntite.requeteId, null);
      expect(result).toBeNull();
    });

    it('should call enrichSituationWithTraitementDesFaits for each situation', async () => {
      const mockEntite1 = { id: 'ent1', nomComplet: 'Entité 1', entiteMereId: null };
      const mockEntite2 = { id: 'ent2', nomComplet: 'Entité 2', entiteMereId: null };
      const mockEntite3 = { id: 'ent3', nomComplet: 'Entité 3', entiteMereId: null };

      const mockSituation1 = {
        id: 'sit1',
        situationEntites: [
          {
            entite: mockEntite1,
          },
        ],
      };
      const mockSituation2 = {
        id: 'sit2',
        situationEntites: [
          {
            entite: mockEntite2,
          },
        ],
      };
      const mockSituation3 = {
        id: 'sit3',
        situationEntites: [
          {
            entite: mockEntite3,
          },
        ],
      };

      const mockRequeteEntiteWithSituations = {
        ...mockRequeteEntite,
        requete: {
          ...mockRequeteEntite.requete,
          situations: [mockSituation1, mockSituation2, mockSituation3],
        },
      };

      vi.mocked(buildEntitesTraitement)
        .mockResolvedValueOnce([{ entiteId: 'root1', entiteName: 'Root 1', chain: [] }])
        .mockResolvedValueOnce([{ entiteId: 'root2', entiteName: 'Root 2', chain: [] }])
        .mockResolvedValueOnce([{ entiteId: 'root3', entiteName: 'Root 3', chain: [] }]);

      vi.mocked(prisma.requeteEntite.findFirst).mockResolvedValueOnce(mockRequeteEntiteWithSituations);

      const result = await getRequeteEntiteById(mockRequeteEntite.requeteId, mockRequeteEntite.entiteId);

      expect(result).toBeDefined();
      expect(result?.requete.situations).toHaveLength(3);
      expect(buildEntitesTraitement).toHaveBeenCalledTimes(3);
      expect(buildEntitesTraitement).toHaveBeenCalledWith([mockEntite1]);
      expect(buildEntitesTraitement).toHaveBeenCalledWith([mockEntite2]);
      expect(buildEntitesTraitement).toHaveBeenCalledWith([mockEntite3]);
      expect(result?.requete.situations[0]).toHaveProperty('traitementDesFaits');
      expect(result?.requete.situations[1]).toHaveProperty('traitementDesFaits');
      expect(result?.requete.situations[2]).toHaveProperty('traitementDesFaits');
    });
  });

  describe('updateRequeteDeclarant', () => {
    it('should throw conflict error when identite updatedAt timestamp does not match', async () => {
      const oldTimestamp = new Date('2024-01-01T10:00:00Z');
      const newTimestamp = new Date('2024-01-01T10:05:00Z');

      const mockIdentite = {
        id: 'identite123',
        prenom: 'John',
        nom: 'Doe',
        email: '',
        telephone: '',
        commentaire: '',
        civiliteId: null,
        personneConcerneeId: 'declarant123',
        createdAt: oldTimestamp,
        updatedAt: newTimestamp,
      };

      const mockDeclarant: PersonneConcernee = {
        id: 'declarant123',
        estNonIdentifiee: null,
        estHandicapee: null,
        estIdentifie: true,
        estVictime: false,
        estVictimeInformee: null,
        victimeInformeeCommentaire: '',
        veutGarderAnonymat: false,
        commentaire: '',
        autrePersonnes: '',
        ageId: null,
        lienVictimeId: null,
        lienAutrePrecision: null,
        declarantDeId: 'req123',
        participantDeId: null,
        createdAt: oldTimestamp,
        updatedAt: oldTimestamp,
        estSignalementProfessionnel: null,
        aAutrePersonnes: null,
      };

      type RequeteWithDeclarant = Requete & {
        declarant: PersonneConcernee & {
          identite: Identite;
        };
      };

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: 'req123',
        dematSocialId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: '',
        receptionDate: new Date(),
        receptionTypeId: 'EMAIL',
        declarant: {
          ...mockDeclarant,
          identite: mockIdentite,
        },
      } satisfies RequeteWithDeclarant as RequeteWithDeclarant);

      await expect(
        updateRequeteDeclarant(
          'req123',
          { nom: 'Updated Name' },
          {
            declarant: { updatedAt: oldTimestamp.toISOString() },
          },
        ),
      ).rejects.toThrow('The declarant identity has been modified by another user.');
    });

    it('should update declarant when identite updatedAt timestamp matches', async () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');

      const mockIdentite = {
        id: 'identite123',
        prenom: 'John',
        nom: 'Doe',
        email: '',
        telephone: '',
        commentaire: '',
        civiliteId: null,
        personneConcerneeId: 'declarant123',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const mockDeclarant: PersonneConcernee = {
        id: 'declarant123',
        estNonIdentifiee: null,
        estHandicapee: null,
        estIdentifie: true,
        estVictime: false,
        estVictimeInformee: null,
        victimeInformeeCommentaire: '',
        veutGarderAnonymat: false,
        commentaire: '',
        autrePersonnes: '',
        ageId: null,
        lienVictimeId: null,
        lienAutrePrecision: null,
        declarantDeId: 'req123',
        participantDeId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        estSignalementProfessionnel: null,
        aAutrePersonnes: null,
      };

      type RequeteWithDeclarant = Requete & {
        declarant: PersonneConcernee & {
          identite: Identite;
        };
      };

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: 'req123',
        dematSocialId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: '',
        receptionDate: new Date(),
        receptionTypeId: 'EMAIL',
        declarant: {
          ...mockDeclarant,
          identite: mockIdentite,
        },
      } satisfies RequeteWithDeclarant as RequeteWithDeclarant);

      vi.mocked(prisma.requete.update).mockResolvedValueOnce({} as Requete);

      await updateRequeteDeclarant(
        'req123',
        { nom: 'Updated Name' },
        {
          declarant: { updatedAt: timestamp.toISOString() },
        },
      );

      expect(prisma.requete.update).toHaveBeenCalled();
    });
  });

  describe('updateRequete', () => {
    it('should update requete with declarant data', async () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');

      const mockIdentite = {
        id: 'identite123',
        prenom: 'John',
        nom: 'Doe',
        email: '',
        telephone: '',
        commentaire: '',
        civiliteId: null,
        personneConcerneeId: 'declarant123',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const mockDeclarant: PersonneConcernee = {
        id: 'declarant123',
        estNonIdentifiee: null,
        estHandicapee: null,
        estSignalementProfessionnel: null,
        estIdentifie: true,
        estVictime: false,
        estVictimeInformee: null,
        victimeInformeeCommentaire: '',
        veutGarderAnonymat: false,
        commentaire: '',
        autrePersonnes: '',
        ageId: null,
        lienVictimeId: null,
        lienAutrePrecision: null,
        declarantDeId: 'req123',
        participantDeId: null,
        aAutrePersonnes: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      type RequeteWithDeclarant = Requete & {
        declarant: PersonneConcernee & {
          identite: Identite;
        };
      };

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: 'req123',
        dematSocialId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: '',
        receptionDate: new Date(),
        receptionTypeId: 'EMAIL',
        declarant: {
          ...mockDeclarant,
          identite: mockIdentite,
        },
      } satisfies RequeteWithDeclarant as RequeteWithDeclarant);

      vi.mocked(prisma.requete.update).mockResolvedValueOnce({} as Requete);

      await updateRequete(
        'req123',
        { declarant: { nom: 'Updated Name' } },
        {
          declarant: { updatedAt: timestamp.toISOString() },
        },
      );

      expect(prisma.requete.update).toHaveBeenCalled();
    });

    it('should return requete unchanged when no data provided', async () => {
      vi.clearAllMocks();

      const mockRequete = {
        id: 'req123',
        dematSocialId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: '',
        receptionDate: new Date(),
        receptionTypeId: 'EMAIL',
        declarant: null,
      } as Requete;

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce(mockRequete);

      const result = await updateRequete('req123', {});

      expect(result).toEqual(mockRequete);
      expect(prisma.requete.update).not.toHaveBeenCalled();
    });
  });

  describe('closeRequeteForEntite', () => {
    it('should throw error if requeteEntite is not found', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(null);
      await expect(closeRequeteForEntite('req123', 'ent123', 'reason123', 'user123')).rejects.toThrow(
        'REQUETE_NOT_FOUND',
      );
    });

    it('should throw error if reason is not found', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteClotureReasonEnum.findUnique).mockResolvedValueOnce(null);
      await expect(closeRequeteForEntite('req123', 'ent123', 'reason123', 'user123')).rejects.toThrow('REASON_INVALID');
    });

    it('should throw error if last etape is closed', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteClotureReasonEnum.findUnique).mockResolvedValueOnce({
        id: 'reason123',
        label: 'Reason 123',
      });
      vi.mocked(prisma.requeteEtape.findFirst).mockResolvedValueOnce(fakeEtape);
      await expect(closeRequeteForEntite('req123', 'ent123', 'reason123', 'user123')).rejects.toThrow(
        'READONLY_FOR_ENTITY',
      );
    });

    it('should throw error if files are invalid', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteClotureReasonEnum.findUnique).mockResolvedValueOnce({
        id: 'reason123',
        label: 'Reason 123',
      });
      vi.mocked(prisma.uploadedFile.findMany).mockResolvedValue([
        {
          id: 'file123',
          fileName: 'File 123',
          filePath: 'file123.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          entiteId: 'ent123',
          requeteId: 'req123',
          metadata: null,
          uploadedById: 'user123',
          requeteEtapeNoteId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          canDelete: true,
          scanStatus: 'PENDING',
          sanitizeStatus: 'PENDING',
          safeFilePath: 'file1.pdf',
          scanResult: null,
          processingError: null,
        },
      ]);
      await expect(
        closeRequeteForEntite('req123', 'ent123', 'reason123', 'user123', '', ['fileid1', 'fileid2']),
      ).rejects.toThrow('FILES_INVALID');
    });

    it('should successfully close requete with precision and files', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteClotureReasonEnum.findUnique).mockResolvedValueOnce({
        id: 'reason123',
        label: 'Reason 123',
      });
      vi.mocked(prisma.requeteEtape.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.uploadedFile.findMany).mockResolvedValue([
        {
          id: 'fileid1',
          fileName: 'File 1',
          filePath: 'file1.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          entiteId: 'ent123',
          requeteId: 'req123',
          metadata: null,
          uploadedById: 'user123',
          requeteEtapeNoteId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          canDelete: true,
          scanStatus: 'PENDING',
          sanitizeStatus: 'PENDING',
          safeFilePath: 'file1.pdf',
          scanResult: null,
          processingError: null,
        },
        {
          id: 'fileid2',
          fileName: 'File 2',
          filePath: 'file2.pdf',
          mimeType: 'application/pdf',
          size: 2000,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          entiteId: 'ent123',
          requeteId: 'req123',
          metadata: null,
          uploadedById: 'user123',
          requeteEtapeNoteId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          canDelete: true,
          scanStatus: 'PENDING',
          sanitizeStatus: 'PENDING',
          safeFilePath: 'file2.pdf',
          scanResult: null,
          processingError: null,
        },
      ]);
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);

      const transactionSpy = vi.mocked(prisma.$transaction);
      const mockEtape = {
        id: 'etape123',
        nom: 'Requête clôturée le 01/01/2024',
        estPartagee: false,
        statutId: 'CLOTUREE',
        requeteId: 'req123',
        entiteId: 'ent123',
        clotureReasonId: 'reason123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };
      const mockNote = {
        id: 'note123',
        texte: 'Test precision',
        authorId: 'user123',
        requeteEtapeId: 'etape123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      transactionSpy.mockImplementation(async (cb) => {
        const mockTx = {
          ...prismaMock,
          requeteEtape: {
            ...prismaMock.requeteEtape,
            create: vi.fn().mockResolvedValue(mockEtape),
          },
          requeteEtapeNote: {
            create: vi.fn().mockResolvedValue(mockNote),
          },
          uploadedFile: {
            ...prismaMock.uploadedFile,
            updateMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        } as typeof prismaMock;
        return cb(mockTx);
      });

      const result = await closeRequeteForEntite('req123', 'ent123', 'reason123', 'user123', 'Test precision', [
        'fileid1',
        'fileid2',
      ]);

      expect(result).toEqual({
        etapeId: 'etape123',
        closedAt: '2024-01-01T10:00:00.000Z',
        noteId: 'note123',
        etape: mockEtape,
        note: mockNote,
      });
    });

    it('should successfully close requete without precision and files', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteClotureReasonEnum.findUnique).mockResolvedValueOnce({
        id: 'reason123',
        label: 'Reason 123',
      });
      vi.mocked(prisma.requeteEtape.findFirst).mockResolvedValueOnce(null);

      const transactionSpy = vi.mocked(prisma.$transaction);
      const mockEtape = {
        id: 'etape123',
        nom: 'Requête clôturée le 01/01/2024',
        estPartagee: false,
        statutId: 'CLOTUREE',
        requeteId: 'req123',
        entiteId: 'ent123',
        clotureReasonId: 'reason123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      const mockNote = {
        id: 'note123',
        texte: 'Test precision',
        authorId: 'user123',
        requeteEtapeId: 'etape123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      transactionSpy.mockImplementation(async (cb) => {
        const mockTx = {
          ...prismaMock,
          requeteEtape: {
            ...prismaMock.requeteEtape,
            create: vi.fn().mockResolvedValue(mockEtape),
          },
          requeteEtapeNote: {
            ...prismaMock.requeteEtapeNote,
            create: vi.fn().mockResolvedValue(mockNote),
          },
        } as typeof prismaMock;
        return cb(mockTx);
      });

      const result = await closeRequeteForEntite('req123', 'ent123', 'reason123', 'user123');

      expect(result).toEqual({
        etapeId: 'etape123',
        closedAt: '2024-01-01T10:00:00.000Z',
        noteId: 'note123',
        etape: mockEtape,
        note: mockNote,
      });
    });

    it('should successfully close requete with precision but no files', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteClotureReasonEnum.findUnique).mockResolvedValueOnce({
        id: 'reason123',
        label: 'Reason 123',
      });
      vi.mocked(prisma.requeteEtape.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.uploadedFile.findMany).mockResolvedValue([]);

      const transactionSpy = vi.mocked(prisma.$transaction);
      const mockEtape = {
        id: 'etape123',
        nom: 'Requête clôturée le 01/01/2024',
        estPartagee: false,
        statutId: 'CLOTUREE',
        requeteId: 'req123',
        entiteId: 'ent123',
        clotureReasonId: 'reason123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };
      const mockNote = {
        id: 'note123',
        texte: 'Test precision',
        authorId: 'user123',
        requeteEtapeId: 'etape123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      transactionSpy.mockImplementation(async (cb) => {
        const mockTx = {
          ...prismaMock,
          requeteEtape: {
            ...prismaMock.requeteEtape,
            create: vi.fn().mockResolvedValue(mockEtape),
          },
          requeteEtapeNote: {
            create: vi.fn().mockResolvedValue(mockNote),
          },
        } as typeof prismaMock;
        return cb(mockTx);
      });

      const result = await closeRequeteForEntite('req123', 'ent123', 'reason123', 'user123', 'Test precision');

      expect(result).toEqual({
        etapeId: 'etape123',
        closedAt: '2024-01-01T10:00:00.000Z',
        noteId: 'note123',
        etape: mockEtape,
        note: mockNote,
      });
    });

    it('should successfully close requete with files but no precision', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteClotureReasonEnum.findUnique).mockResolvedValueOnce({
        id: 'reason123',
        label: 'Reason 123',
      });
      vi.mocked(prisma.requeteEtape.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.uploadedFile.findMany).mockResolvedValue([
        {
          id: 'fileid1',
          fileName: 'File 1',
          filePath: 'file1.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          entiteId: 'ent123',
          requeteId: 'req123',
          metadata: null,
          uploadedById: 'user123',
          requeteEtapeNoteId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          canDelete: true,
          scanStatus: 'PENDING',
          sanitizeStatus: 'PENDING',
          safeFilePath: 'file1.pdf',
          scanResult: null,
          processingError: null,
        },
      ]);

      const transactionSpy = vi.mocked(prisma.$transaction);
      const mockEtape = {
        id: 'etape123',
        nom: 'Requête clôturée le 01/01/2024',
        estPartagee: false,
        statutId: 'CLOTUREE',
        requeteId: 'req123',
        entiteId: 'ent123',
        clotureReasonId: 'reason123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };
      const mockNote = {
        id: 'note123',
        texte: 'Test precision',
        authorId: 'user123',
        requeteEtapeId: 'etape123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      };

      transactionSpy.mockImplementation(async (cb) => {
        const mockTx = {
          ...prismaMock,
          requeteEtape: {
            ...prismaMock.requeteEtape,
            create: vi.fn().mockResolvedValue(mockEtape),
          },
          requeteEtapeNote: {
            create: vi.fn().mockResolvedValue(mockNote),
          },
          uploadedFile: {
            ...prismaMock.uploadedFile,
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        } as typeof prismaMock;
        return cb(mockTx);
      });

      const result = await closeRequeteForEntite('req123', 'ent123', 'reason123', 'user123', undefined, ['fileid1']);

      expect(result).toEqual({
        etapeId: 'etape123',
        closedAt: '2024-01-01T10:00:00.000Z',
        noteId: 'note123',
        etape: mockEtape,
        note: mockNote,
      });
    });
  });

  describe('updateSituationEntites', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const createMockTx = (overrides: Partial<Record<string, Record<string, unknown>>> = {}) => {
      const base = {
        situation: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue([]),
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          upsert: vi.fn().mockResolvedValue({}),
        },
        requeteEntite: {
          findUnique: vi.fn().mockResolvedValue({ requeteId: 'req1', entiteId: 'root1', statutId: 'EN_COURS' }),
          upsert: vi.fn().mockResolvedValue({}),
        },
        requeteEtape: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi
            .fn()
            .mockResolvedValueOnce({
              id: 'etape1',
              requeteId: 'req1',
              entiteId: 'root1',
              nom: 'Création de la requête le 01/01/2024',
              statutId: 'FAIT',
              estPartagee: false,
              clotureReasonId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .mockResolvedValueOnce({
              id: 'etape2',
              requeteId: 'req1',
              entiteId: 'root1',
              nom: 'Envoyer un accusé de réception au déclarant',
              statutId: 'A_FAIRE',
              estPartagee: false,
              clotureReasonId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      return {
        ...base,
        ...Object.fromEntries(
          Object.entries(overrides).map(([key, value]) => [key, { ...base[key as keyof typeof base], ...value }]),
        ),
      };
    };

    it('should delete user situationEntites when no entities are provided but other entities exist', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';
      const userTopEntiteId = 'root1';
      const otherTopEntiteId = 'root2';
      // ent1 belongs to user, ent2 belongs to other entity
      const existingSituationEntites = [{ entiteId: 'ent1' }, { entiteId: 'ent2' }];

      const mockSituation = {
        id: situationId,
        requeteId,
      };

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(mockSituation),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue(existingSituationEntites),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue({
            id: requeteId,
            situations: [],
          }),
        },
      });

      vi.mocked(getEntiteAscendanteId).mockImplementation(async (entiteId: string) => {
        if (entiteId === 'ent1') return userTopEntiteId;
        if (entiteId === 'ent2') return otherTopEntiteId;
        return null;
      });

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      await updateRequeteSituation(
        requeteId,
        situationId,
        {
          traitementDesFaits: {
            entites: [],
          },
        } as Parameters<typeof updateRequeteSituation>[2],
        userTopEntiteId,
      );

      // Should only delete user's entity (ent1), not other entity (ent2)
      expect(mockTx.situationEntite.deleteMany).toHaveBeenCalledWith({
        where: { situationId, entiteId: { in: ['ent1'] } },
      });
      expect(mockTx.situationEntite.findMany).toHaveBeenCalledWith({
        where: { situationId },
        select: { entiteId: true },
      });
    });

    it('should add new situationEntites when entities are provided', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';
      const userTopEntiteId = 'root1';
      const existingSituationEntites: Array<{ entiteId: string }> = [];

      const mockSituation = {
        id: situationId,
        requeteId,
      };

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(mockSituation),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue(existingSituationEntites),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue({
            id: requeteId,
            situations: [],
          }),
        },
      });

      vi.mocked(getEntiteAscendanteId).mockResolvedValue(userTopEntiteId);

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      await updateRequeteSituation(
        requeteId,
        situationId,
        {
          traitementDesFaits: {
            entites: [{ entiteId: 'ent1' }],
          },
        } as Parameters<typeof updateRequeteSituation>[2],
        userTopEntiteId,
      );

      expect(mockTx.situationEntite.upsert).toHaveBeenCalledWith({
        where: {
          situationId_entiteId: { situationId, entiteId: 'ent1' },
        },
        update: {},
        create: {
          situationId,
          entiteId: 'ent1',
        },
      });
      expect(getEntiteAscendanteId).toHaveBeenCalledWith('ent1');
      expect(mockTx.requeteEntite.upsert).toHaveBeenCalledWith({
        where: {
          requeteId_entiteId: { requeteId, entiteId: 'root1' },
        },
        update: {},
        create: {
          requeteId,
          statutId: REQUETE_STATUT_TYPES.NOUVEAU,
          entiteId: 'root1',
        },
      });
    });

    it('should remove obsolete situationEntites and add new ones within user hierarchy', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';
      const userTopEntiteId = 'root1';
      // All entities belong to user's hierarchy
      const existingSituationEntites = [{ entiteId: 'ent1' }, { entiteId: 'ent2' }];

      const mockSituation = {
        id: situationId,
        requeteId,
      };

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(mockSituation),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue(existingSituationEntites),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue({
            id: requeteId,
            situations: [],
          }),
        },
      });

      // All entities belong to user's hierarchy
      vi.mocked(getEntiteAscendanteId).mockResolvedValue(userTopEntiteId);

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      await updateRequeteSituation(
        requeteId,
        situationId,
        {
          traitementDesFaits: {
            entites: [{ entiteId: 'ent2' }, { entiteId: 'ent3' }],
          },
        } as Parameters<typeof updateRequeteSituation>[2],
        userTopEntiteId,
      );

      // Should remove ent1 (no longer in the list)
      expect(mockTx.situationEntite.deleteMany).toHaveBeenCalledWith({
        where: {
          situationId,
          entiteId: { in: ['ent1'] },
        },
      });

      // Should upsert ent2 and ent3
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledTimes(2);
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledWith({
        where: {
          situationId_entiteId: { situationId, entiteId: 'ent2' },
        },
        update: {},
        create: {
          situationId,
          entiteId: 'ent2',
        },
      });
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledWith({
        where: {
          situationId_entiteId: { situationId, entiteId: 'ent3' },
        },
        update: {},
        create: {
          situationId,
          entiteId: 'ent3',
        },
      });
    });

    it('should use directionServiceId when provided in addition to entiteId', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';
      const userTopEntiteId = 'root1';
      const existingSituationEntites: Array<{ entiteId: string }> = [];

      const mockSituation = {
        id: situationId,
        requeteId,
      };

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(mockSituation),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue(existingSituationEntites),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue({
            id: requeteId,
            situations: [],
          }),
        },
      });

      vi.mocked(getEntiteAscendanteId).mockResolvedValue(userTopEntiteId);

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      await updateRequeteSituation(
        requeteId,
        situationId,
        {
          traitementDesFaits: {
            entites: [{ entiteId: userTopEntiteId, directionServiceId: 'dir1' }],
          },
        } as Parameters<typeof updateRequeteSituation>[2],
        userTopEntiteId,
      );

      // Should upsert both entiteId (root1) and directionServiceId (dir1)
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledTimes(2);
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledWith({
        where: {
          situationId_entiteId: { situationId, entiteId: userTopEntiteId },
        },
        update: {},
        create: {
          situationId,
          entiteId: userTopEntiteId,
        },
      });
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledWith({
        where: {
          situationId_entiteId: { situationId, entiteId: 'dir1' },
        },
        update: {},
        create: {
          situationId,
          entiteId: 'dir1',
        },
      });
    });

    it('should throw error if situation does not have requeteId', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({}),
        },
      });

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      await expect(
        updateRequeteSituation(
          requeteId,
          situationId,
          {
            traitementDesFaits: {
              entites: [{ entiteId: 'ent1' }],
            },
          } as Parameters<typeof updateRequeteSituation>[2],
          'ent1',
        ),
      ).rejects.toThrow(`Situation ${situationId} does not have a requeteId`);
    });

    it('should only modify affectations belonging to user entity and preserve others', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';
      const userTopEntiteId = 'root1';
      const otherTopEntiteId = 'root2';

      // Existing affectations: one from user's entity (ent1 -> root1), one from other entity (ent2 -> root2)
      const existingSituationEntites = [{ entiteId: 'ent1' }, { entiteId: 'ent2' }];

      const mockSituation = {
        id: situationId,
        requeteId,
      };

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(mockSituation),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue(existingSituationEntites),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue({
            id: requeteId,
            situations: [],
          }),
        },
      });

      // Mock getEntiteAscendanteId to return different roots for different entities
      vi.mocked(getEntiteAscendanteId).mockImplementation(async (entiteId: string) => {
        if (entiteId === 'ent1' || entiteId === 'ent3') return userTopEntiteId;
        if (entiteId === 'ent2') return otherTopEntiteId;
        return null;
      });

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      // User tries to replace ent1 with ent3 (both in their hierarchy)
      await updateRequeteSituation(
        requeteId,
        situationId,
        {
          traitementDesFaits: {
            entites: [{ entiteId: 'ent3' }],
          },
        } as Parameters<typeof updateRequeteSituation>[2],
        userTopEntiteId,
      );

      // Should only delete ent1 (user's entity), not ent2 (other entity)
      expect(mockTx.situationEntite.deleteMany).toHaveBeenCalledWith({
        where: {
          situationId,
          entiteId: { in: ['ent1'] },
        },
      });

      // Should add ent3 (user's new affectation)
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledWith({
        where: {
          situationId_entiteId: { situationId, entiteId: 'ent3' },
        },
        update: {},
        create: {
          situationId,
          entiteId: 'ent3',
        },
      });
    });

    it('should allow adding new entities from other hierarchies', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';
      const userTopEntiteId = 'root1';
      const otherTopEntiteId = 'root2';

      const existingSituationEntites = [{ entiteId: 'ent1' }];

      const mockSituation = {
        id: situationId,
        requeteId,
      };

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(mockSituation),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue(existingSituationEntites),
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue({
            id: requeteId,
            situations: [],
          }),
        },
      });

      // Mock getEntiteAscendanteId
      vi.mocked(getEntiteAscendanteId).mockImplementation(async (entiteId: string) => {
        if (entiteId === 'ent1') return userTopEntiteId;
        if (entiteId === 'ent-from-other') return otherTopEntiteId;
        return null;
      });

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      // User adds an entity from another hierarchy (should be allowed)
      await updateRequeteSituation(
        requeteId,
        situationId,
        {
          traitementDesFaits: {
            entites: [{ entiteId: 'ent1' }, { entiteId: 'ent-from-other' }],
          },
        } as Parameters<typeof updateRequeteSituation>[2],
        userTopEntiteId,
      );

      // Should upsert both ent1 (user's entity) and ent-from-other (new entity from other hierarchy)
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledTimes(2);
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledWith({
        where: {
          situationId_entiteId: { situationId, entiteId: 'ent1' },
        },
        update: {},
        create: {
          situationId,
          entiteId: 'ent1',
        },
      });
      expect(mockTx.situationEntite.upsert).toHaveBeenCalledWith({
        where: {
          situationId_entiteId: { situationId, entiteId: 'ent-from-other' },
        },
        update: {},
        create: {
          situationId,
          entiteId: 'ent-from-other',
        },
      });
    });

    it('should throw error when no entities remain after update', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';
      const userTopEntiteId = 'root1';

      // Only user's entity exists
      const existingSituationEntites = [{ entiteId: 'ent1' }];

      const mockSituation = {
        id: situationId,
        requeteId,
      };

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(mockSituation),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue(existingSituationEntites),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue({
            id: requeteId,
            situations: [],
          }),
        },
      });

      vi.mocked(getEntiteAscendanteId).mockResolvedValue(userTopEntiteId);

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      // User tries to remove all entities
      await expect(
        updateRequeteSituation(
          requeteId,
          situationId,
          {
            traitementDesFaits: {
              entites: [],
            },
          } as Parameters<typeof updateRequeteSituation>[2],
          userTopEntiteId,
        ),
      ).rejects.toThrow('Au moins une entité administrative doit être affectée à la situation');
    });

    it('should allow removing user entity when other entities exist', async () => {
      const situationId = 'sit1';
      const requeteId = 'req1';
      const userTopEntiteId = 'root1';
      const otherTopEntiteId = 'root2';

      // Both user's and other's entities exist
      const existingSituationEntites = [{ entiteId: 'ent1' }, { entiteId: 'ent2' }];

      const mockSituation = {
        id: situationId,
        requeteId,
      };

      const mockTx = createMockTx({
        situation: {
          findUnique: vi.fn().mockResolvedValue(mockSituation),
          update: vi.fn().mockResolvedValue({}),
        },
        situationEntite: {
          findMany: vi.fn().mockResolvedValue(existingSituationEntites),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        requete: {
          findUnique: vi.fn().mockResolvedValue({
            id: requeteId,
            situations: [],
          }),
        },
      });

      vi.mocked(getEntiteAscendanteId).mockImplementation(async (entiteId: string) => {
        if (entiteId === 'ent1') return userTopEntiteId;
        if (entiteId === 'ent2') return otherTopEntiteId;
        return null;
      });

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: requeteId,
        situations: [
          {
            id: situationId,
            faits: [],
          },
        ],
      } as unknown as Awaited<ReturnType<typeof prisma.requete.findUnique>>);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(mockTx as unknown as Parameters<Parameters<typeof prisma.$transaction>[0]>[0]);
      });

      // User removes their own entity (other entity still exists)
      await updateRequeteSituation(
        requeteId,
        situationId,
        {
          traitementDesFaits: {
            entites: [],
          },
        } as Parameters<typeof updateRequeteSituation>[2],
        userTopEntiteId,
      );

      // Should delete user's entity
      expect(mockTx.situationEntite.deleteMany).toHaveBeenCalledWith({
        where: {
          situationId,
          entiteId: { in: ['ent1'] },
        },
      });

      // Should not add any new entities
      expect(mockTx.situationEntite.upsert).not.toHaveBeenCalled();
    });
  });

  describe('enrichSituationWithTraitementDesFaits', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return situation with traitementDesFaits for root entity', async () => {
      const mockSituation = {
        id: 'sit1',
        situationEntites: [
          {
            entite: {
              id: 'ent1',
              nomComplet: 'Entité Racine',
              entiteMereId: null,
            },
          },
        ],
      } as Parameters<typeof enrichSituationWithTraitementDesFaits>[0];

      vi.mocked(buildEntitesTraitement).mockResolvedValueOnce([
        {
          entiteId: 'root1',
          entiteName: 'Root Entity',
          directionServiceId: undefined,
          directionServiceName: undefined,
          chain: [{ id: 'root1', nomComplet: 'Root Entity', label: 'Root Entity' }],
        },
      ]);

      const result = await enrichSituationWithTraitementDesFaits(mockSituation);

      expect(result.traitementDesFaits).toBeDefined();
      expect(result.traitementDesFaits?.entites).toHaveLength(1);
      expect(result.traitementDesFaits?.entites?.[0]).toEqual({
        entiteId: 'root1',
        entiteName: 'Root Entity',
        directionServiceId: undefined,
        directionServiceName: undefined,
        chain: [{ id: 'root1', nomComplet: 'Root Entity', label: 'Root Entity' }],
      });
      expect(buildEntitesTraitement).toHaveBeenCalledWith([
        {
          id: 'ent1',
          nomComplet: 'Entité Racine',
          entiteMereId: null,
        },
      ]);
    });

    it('should return situation with traitementDesFaits for non-root entity', async () => {
      const mockSituation = {
        id: 'sit1',
        situationEntites: [
          {
            entite: {
              id: 'dir1',
              nomComplet: 'Direction Service',
              entiteMereId: 'root1',
            },
          },
        ],
      } as Parameters<typeof enrichSituationWithTraitementDesFaits>[0];

      vi.mocked(buildEntitesTraitement).mockResolvedValueOnce([
        {
          entiteId: 'root1',
          entiteName: 'Root Entity',
          directionServiceId: 'dir1',
          directionServiceName: 'Direction Service',
          chain: [
            { id: 'root1', nomComplet: 'Root Entity', label: 'Root Entity' },
            { id: 'dir1', nomComplet: 'Direction Service', label: 'Direction Service' },
          ],
        },
      ]);

      const result = await enrichSituationWithTraitementDesFaits(mockSituation);

      expect(result.traitementDesFaits).toBeDefined();
      expect(result.traitementDesFaits?.entites).toHaveLength(1);
      expect(result.traitementDesFaits?.entites?.[0]).toEqual({
        entiteId: 'root1',
        entiteName: 'Root Entity',
        directionServiceId: 'dir1',
        directionServiceName: 'Direction Service',
        chain: [
          { id: 'root1', nomComplet: 'Root Entity', label: 'Root Entity' },
          { id: 'dir1', nomComplet: 'Direction Service', label: 'Direction Service' },
        ],
      });
      expect(buildEntitesTraitement).toHaveBeenCalledWith([
        {
          id: 'dir1',
          nomComplet: 'Direction Service',
          entiteMereId: 'root1',
        },
      ]);
    });

    it('should skip entities with empty chain', async () => {
      const mockSituation = {
        id: 'sit1',
        situationEntites: [
          {
            entite: {
              id: 'ent1',
              nomComplet: 'Entité',
              entiteMereId: null,
            },
          },
        ],
      } as Parameters<typeof enrichSituationWithTraitementDesFaits>[0];

      vi.mocked(buildEntitesTraitement).mockResolvedValueOnce([]);

      const result = await enrichSituationWithTraitementDesFaits(mockSituation);

      expect(result.traitementDesFaits).toBeDefined();
      expect(result.traitementDesFaits?.entites).toHaveLength(0);
    });

    it('should handle multiple situationEntites', async () => {
      const mockSituation = {
        id: 'sit1',
        situationEntites: [
          {
            entite: {
              id: 'root1',
              nomComplet: 'Root 1',
              entiteMereId: null,
            },
          },
          {
            entite: {
              id: 'dir1',
              nomComplet: 'Direction 1',
              entiteMereId: 'root1',
            },
          },
        ],
      } as Parameters<typeof enrichSituationWithTraitementDesFaits>[0];

      vi.mocked(buildEntitesTraitement).mockResolvedValueOnce([
        {
          entiteId: 'root1',
          entiteName: 'Root 1',
          directionServiceId: undefined,
          directionServiceName: undefined,
          chain: [{ id: 'root1', nomComplet: 'Root 1', label: 'Root 1' }],
        },
        {
          entiteId: 'root1',
          entiteName: 'Root 1',
          directionServiceId: 'dir1',
          directionServiceName: 'Direction 1',
          chain: [
            { id: 'root1', nomComplet: 'Root 1', label: 'Root 1' },
            { id: 'dir1', nomComplet: 'Direction 1', label: 'Direction 1' },
          ],
        },
      ]);

      const result = await enrichSituationWithTraitementDesFaits(mockSituation);

      expect(result.traitementDesFaits?.entites).toHaveLength(2);
      expect(result.traitementDesFaits?.entites?.[0]).toEqual({
        entiteId: 'root1',
        entiteName: 'Root 1',
        directionServiceId: undefined,
        directionServiceName: undefined,
        chain: [{ id: 'root1', nomComplet: 'Root 1', label: 'Root 1' }],
      });
      expect(result.traitementDesFaits?.entites?.[1]).toEqual({
        entiteId: 'root1',
        entiteName: 'Root 1',
        directionServiceId: 'dir1',
        directionServiceName: 'Direction 1',
        chain: [
          { id: 'root1', nomComplet: 'Root 1', label: 'Root 1' },
          { id: 'dir1', nomComplet: 'Direction 1', label: 'Direction 1' },
        ],
      });
    });

    it('should avoid duplicates with same entiteId and directionServiceId', async () => {
      const mockSituation = {
        id: 'sit1',
        situationEntites: [
          {
            entite: {
              id: 'dir1',
              nomComplet: 'Direction 1',
              entiteMereId: 'root1',
            },
          },
          {
            entite: {
              id: 'dir1',
              nomComplet: 'Direction 1',
              entiteMereId: 'root1',
            },
          },
        ],
      } as Parameters<typeof enrichSituationWithTraitementDesFaits>[0];

      vi.mocked(buildEntitesTraitement).mockResolvedValueOnce([
        {
          entiteId: 'root1',
          entiteName: 'Root 1',
          directionServiceId: 'dir1',
          directionServiceName: 'Direction 1',
          chain: [
            { id: 'root1', nomComplet: 'Root 1', label: 'Root 1' },
            { id: 'dir1', nomComplet: 'Direction 1', label: 'Direction 1' },
          ],
        },
      ]);

      const result = await enrichSituationWithTraitementDesFaits(mockSituation);

      expect(result.traitementDesFaits?.entites).toHaveLength(1);
      expect(result.traitementDesFaits?.entites?.[0]).toEqual({
        entiteId: 'root1',
        entiteName: 'Root 1',
        directionServiceId: 'dir1',
        directionServiceName: 'Direction 1',
        chain: [
          { id: 'root1', nomComplet: 'Root 1', label: 'Root 1' },
          { id: 'dir1', nomComplet: 'Direction 1', label: 'Direction 1' },
        ],
      });
    });

    it('should preserve all other situation properties', async () => {
      const createdAt = new Date();
      const updatedAt = new Date();
      const mockSituation = {
        id: 'sit1',
        createdAt,
        updatedAt,
        situationEntites: [
          {
            entite: {
              id: 'ent1',
              nomComplet: 'Entité',
              entiteMereId: null,
            },
          },
        ],
      } as unknown as Parameters<typeof enrichSituationWithTraitementDesFaits>[0];

      vi.mocked(buildEntitesTraitement).mockResolvedValueOnce([
        {
          entiteId: 'root1',
          entiteName: 'Root Entity',
          directionServiceId: undefined,
          directionServiceName: undefined,
          chain: [{ id: 'root1', nomComplet: 'Root Entity', label: 'Root Entity' }],
        },
      ]);

      const result = await enrichSituationWithTraitementDesFaits(mockSituation);

      expect(result.id).toBe('sit1');
      expect(result.situationEntites).toEqual(mockSituation.situationEntites);
      expect(result.traitementDesFaits).toBeDefined();
    });
  });
  describe('updateStatusRequete', () => {
    it('should update the status of the requeteEntite', async () => {
      vi.clearAllMocks();
      vi.mocked(prisma.requeteEntite.update).mockResolvedValueOnce({
        ...mockRequeteEntite,
        statutId: 'CLOTUREE',
      });

      const result = await updateStatusRequete('req123', 'ent123', 'CLOTUREE');

      expect(prisma.requeteEntite.update).toHaveBeenCalledOnce();

      expect(result.statutId).toBe('CLOTUREE');
    });
  });

  describe('updatePrioriteRequete', () => {
    it('should update the priority of the requeteEntite to HAUTE', async () => {
      vi.clearAllMocks();
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce({
        requeteId: 'req123',
        entiteId: 'ent123',
        statutId: 'CLOTUREE',
        prioriteId: null,
      });
      vi.mocked(prisma.requeteEntite.update).mockResolvedValueOnce({
        ...mockRequeteEntite,
        prioriteId: 'HAUTE',
      });

      const result = await updatePrioriteRequete('req123', 'ent123', 'HAUTE');

      expect(prisma.requeteEntite.update).toHaveBeenCalledWith({
        where: { requeteId_entiteId: { requeteId: 'req123', entiteId: 'ent123' } },
        data: { prioriteId: 'HAUTE' },
      });

      expect(result.prioriteId).toBe('HAUTE');
    });

    it('should update the priority of the requeteEntite to MOYENNE', async () => {
      vi.clearAllMocks();
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce({
        requeteId: 'req123',
        entiteId: 'ent123',
        statutId: 'CLOTUREE',
        prioriteId: null,
      });
      vi.mocked(prisma.requeteEntite.update).mockResolvedValueOnce({
        ...mockRequeteEntite,
        prioriteId: 'MOYENNE',
      });

      const result = await updatePrioriteRequete('req123', 'ent123', 'MOYENNE');

      expect(prisma.requeteEntite.update).toHaveBeenCalledWith({
        where: { requeteId_entiteId: { requeteId: 'req123', entiteId: 'ent123' } },
        data: { prioriteId: 'MOYENNE' },
      });

      expect(result.prioriteId).toBe('MOYENNE');
    });

    it('should update the priority of the requeteEntite to BASSE', async () => {
      vi.clearAllMocks();
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce({
        requeteId: 'req123',
        entiteId: 'ent123',
        statutId: 'CLOTUREE',
        prioriteId: null,
      });
      vi.mocked(prisma.requeteEntite.update).mockResolvedValueOnce({
        ...mockRequeteEntite,
        prioriteId: 'BASSE',
      });

      const result = await updatePrioriteRequete('req123', 'ent123', 'BASSE');

      expect(prisma.requeteEntite.update).toHaveBeenCalledWith({
        where: { requeteId_entiteId: { requeteId: 'req123', entiteId: 'ent123' } },
        data: { prioriteId: 'BASSE' },
      });

      expect(result.prioriteId).toBe('BASSE');
    });

    it('should set priority to null when null is provided', async () => {
      vi.clearAllMocks();
      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce({
        requeteId: 'req123',
        entiteId: 'ent123',
        statutId: 'CLOTUREE',
        prioriteId: 'HAUTE',
      });
      vi.mocked(prisma.requeteEntite.update).mockResolvedValueOnce({
        ...mockRequeteEntite,
        prioriteId: null,
      });

      const result = await updatePrioriteRequete('req123', 'ent123', null);

      expect(prisma.requeteEntite.update).toHaveBeenCalledWith({
        where: { requeteId_entiteId: { requeteId: 'req123', entiteId: 'ent123' } },
        data: { prioriteId: null },
      });

      expect(result.prioriteId).toBeNull();
    });

    it('should create changelog when changedById is provided and priority changes', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockReset();
      vi.mocked(prisma.requeteEntite.update).mockReset();
      vi.mocked(createChangeLog).mockReset();

      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce({
        requeteId: 'req123',
        entiteId: 'ent123',
        statutId: 'CLOTUREE',
        prioriteId: 'BASSE',
      });
      vi.mocked(prisma.requeteEntite.update).mockResolvedValueOnce({
        ...mockRequeteEntite,
        prioriteId: 'HAUTE',
      });

      await updatePrioriteRequete('req123', 'ent123', 'HAUTE', 'user123');

      expect(vi.mocked(createChangeLog)).toHaveBeenCalledWith({
        entity: 'RequeteEntite',
        entityId: 'req123:ent123',
        action: 'UPDATED',
        before: { prioriteId: 'BASSE' },
        after: { prioriteId: 'HAUTE' },
        changedById: 'user123',
      });
    });

    it('should not create changelog when priority does not change', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockReset();
      vi.mocked(prisma.requeteEntite.update).mockReset();
      vi.mocked(createChangeLog).mockReset();

      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce({
        requeteId: 'req123',
        entiteId: 'ent123',
        statutId: 'CLOTUREE',
        prioriteId: 'HAUTE',
      });
      vi.mocked(prisma.requeteEntite.update).mockResolvedValueOnce({
        ...mockRequeteEntite,
        prioriteId: 'HAUTE',
      });

      await updatePrioriteRequete('req123', 'ent123', 'HAUTE', 'user123');

      expect(vi.mocked(createChangeLog)).not.toHaveBeenCalled();
    });

    it('should not create changelog when changedById is not provided', async () => {
      vi.mocked(prisma.requeteEntite.findUnique).mockReset();
      vi.mocked(prisma.requeteEntite.update).mockReset();
      vi.mocked(createChangeLog).mockReset();

      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce({
        requeteId: 'req123',
        entiteId: 'ent123',
        statutId: 'CLOTUREE',
        prioriteId: 'BASSE',
      });
      vi.mocked(prisma.requeteEntite.update).mockResolvedValueOnce({
        ...mockRequeteEntite,
        prioriteId: 'HAUTE',
      });

      await updatePrioriteRequete('req123', 'ent123', 'HAUTE');

      expect(vi.mocked(createChangeLog)).not.toHaveBeenCalled();
    });
  });
});
