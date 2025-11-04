import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma as prismaMock } from '@/libs/__mocks__/prisma';
import {
  type Identite,
  type PersonneConcernee,
  prisma,
  type Requete,
  type RequeteEntite,
  type RequeteEtape,
} from '@/libs/prisma';
import {
  closeRequeteForEntite,
  getRequeteEntiteById,
  getRequetesEntite,
  hasAccessToRequete,
  updateRequete,
  updateRequeteDeclarant,
} from './requetesEntite.service';

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

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/libs/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    requeteEntite: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
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

const mockRequeteEntite: RequeteEntite & { requete: Requete } & { requeteEtape: RequeteEtape[] } = {
  requeteId: 'req123',
  entiteId: 'ent123',
  requete: {
    id: 'req123',
    dematSocialId: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
    commentaire: 'Commentaire',
    receptionDate: new Date(),
    receptionTypeId: 'receptionTypeId',
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
                      fichiers: true,
                    },
                  },
                  lieuDeSurvenue: true,
                  misEnCause: true,
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
                      fichiers: true,
                    },
                  },
                  lieuDeSurvenue: true,
                  misEnCause: true,
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
                      fichiers: true,
                    },
                  },
                  lieuDeSurvenue: true,
                  misEnCause: true,
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

  describe('getRequeteEntiteById', () => {
    it('should fetch requeteEntite by id with related data', async () => {
      vi.mocked(prisma.requeteEntite.findFirst).mockResolvedValueOnce(mockRequeteEntite);

      const result = await getRequeteEntiteById(mockRequeteEntite.requeteId, [mockRequeteEntite.entiteId]);

      expect(prisma.requeteEntite.findFirst).toHaveBeenCalledWith({
        where: {
          requeteId: mockRequeteEntite.requeteId,
          entiteId: { in: [mockRequeteEntite.entiteId] },
        },
        include: {
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
      const result = await getRequeteEntiteById(mockRequeteEntite.requeteId, []);
      expect(result).toBeNull();
    });

    it('should return null when entiteIds is null', async () => {
      const result = await getRequeteEntiteById(mockRequeteEntite.requeteId, null);
      expect(result).toBeNull();
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
});
