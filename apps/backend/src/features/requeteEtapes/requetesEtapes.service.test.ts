import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFileFromMinio } from '../../libs/minio.js';
import {
  type ChangeLog,
  prisma,
  type Requete,
  type RequeteEntite,
  type RequeteEtape,
  type RequeteEtapeNote,
  type UploadedFile,
} from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { setEtapeFile } from '../uploadedFiles/uploadedFiles.service.js';
import {
  addClotureEtapeFiles,
  createDefaultRequeteEtapes,
  createProcessingEtape,
  deleteRequeteEtape,
  EtapeNotEditableError,
  FilesNotOwnedError,
  getEtapePermissions,
  getRequeteEtapeById,
  getRequeteEtapes,
  resolveEtapeRappel,
  updateAcknowledgmentStep,
  updateProcessingEtape,
} from './requetesEtapes.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    requete: {
      findUnique: vi.fn(),
    },
    requeteEntite: {
      count: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    requeteEtape: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    uploadedFile: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../../libs/minio.js', () => ({
  deleteFileFromMinio: vi.fn(),
}));

vi.mock('../uploadedFiles/uploadedFiles.service.js', () => ({
  FilesNotOwnedError: class FilesNotOwnedError extends Error {},
  setEtapeFile: vi.fn(() => Promise.resolve([])),
}));

const requeteEtape: RequeteEtape = {
  id: 'requeteEtapeId',
  requeteId: 'requeteId',
  entiteId: 'entiteId',
  nom: 'Etape 1',
  type: 'MANUAL',
  estPartagee: false,
  acknowledgmentSendMode: null,
  acknowledgmentSendOperationId: null,
  dateRealisation: null,
  statutId: 'A_FAIRE',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: null,
  clotureEffectiveDate: null,
  rappelType: null,
  rappelDate: null,
};

const uploadedFile: Pick<UploadedFile, 'id' | 'fileName' | 'size' | 'metadata' | 'filePath'> = {
  id: 'uploadedFileId',
  fileName: 'stored-uuid.pdf',
  size: 1024,
  metadata: { originalName: 'rapport.pdf' },
  filePath: 'path/to/file1.pdf',
};

const requeteEtapeWithNotesAndFiles: RequeteEtape & {
  notes: RequeteEtapeNote[];
  uploadedFiles: Pick<UploadedFile, 'id' | 'fileName' | 'size' | 'metadata' | 'filePath'>[];
  requeteEntite: {
    entite: { id: string; nomComplet: string; entiteTypeId: string };
  };
  requete: {
    createdAt: Date;
    createdById: string | null;
    createdBy: { prenom: string; nom: string } | null;
    dematSocialId: number | null;
    sirecId: number | null;
    thirdPartyAccountId: string | null;
  };
} = {
  ...requeteEtape,
  notes: [
    {
      id: 'noteId',
      texte: 'Note 1',
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: 'authorId',
      requeteEtapeId: 'requeteEtapeId',
    },
  ],
  uploadedFiles: [uploadedFile],
  requeteEntite: {
    entite: { id: 'entiteId', nomComplet: 'ARS Normandie', entiteTypeId: 'ARS' },
  },
  requete: {
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    createdById: null,
    createdBy: null,
    dematSocialId: null,
    sirecId: null,
    thirdPartyAccountId: null,
  },
};

describe('RequeteEtapes.service.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma)) as never);
    vi.mocked(prisma.requeteEntite.count).mockResolvedValue(1);
  });

  describe('createDefaultRequeteEtapes()', () => {
    it('should create two default etapes with acknowledgment always as A_FAIRE', async () => {
      const requeteId = 'requeteId';
      const entiteId = 'entiteId';
      const createdAt = new Date('2024-01-15T10:00:00Z');

      const mockRequeteEntite = {
        requeteId,
        entiteId,
        statutId: 'EN_COURS',
        prioriteId: null,
        requete: { dematSocialId: null, createdAt, createdBy: null },
      };

      const mockEtape1: RequeteEtape = {
        id: 'etape1Id',
        requeteId,
        entiteId,
        nom: 'Création de la requête',
        type: 'CREATION',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'A_FAIRE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.requeteEtape.create).mockResolvedValueOnce(mockEtape1).mockResolvedValueOnce(mockEtape2);

      const result = await createDefaultRequeteEtapes(requeteId, entiteId);

      expect(result).toEqual({ etape1: mockEtape1, etape2: mockEtape2 });
      expect(prisma.requeteEtape.create).toHaveBeenCalledTimes(2);

      expect(prisma.requeteEtape.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          requeteId,
          entiteId,
          statutId: 'FAIT',
          nom: expect.stringContaining('Création de la requête'),
          type: 'CREATION',
          estPartagee: true,
        }),
      });

      expect(prisma.requeteEtape.create).toHaveBeenNthCalledWith(2, {
        data: {
          requeteId,
          entiteId,
          statutId: 'A_FAIRE',
          nom: "Envoi de l'accusé de réception",
          type: 'ACKNOWLEDGMENT',
          estPartagee: false,
        },
      });
    });

    it('should fall back to current date when requete createdAt is missing', async () => {
      const requeteId = 'requeteId';
      const entiteId = 'entiteId';
      const currentDate = new Date();

      const mockRequeteEntite: RequeteEntite = {
        requeteId,
        entiteId,
        statutId: 'EN_COURS',
        prioriteId: null,
      };

      const mockEtape1: RequeteEtape = {
        id: 'etape1Id',
        requeteId,
        entiteId,
        nom: 'Création de la requête',
        type: 'CREATION',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: currentDate,
        updatedAt: currentDate,
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'A_FAIRE',
        createdAt: currentDate,
        updatedAt: currentDate,
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.requeteEtape.create).mockResolvedValueOnce(mockEtape1).mockResolvedValueOnce(mockEtape2);

      const result = await createDefaultRequeteEtapes(requeteId, entiteId);

      expect(result).toEqual({ etape1: mockEtape1, etape2: mockEtape2 });
      expect(prisma.requeteEtape.create).toHaveBeenCalledTimes(2);
    });

    it('should use transaction client when provided', async () => {
      const requeteId = 'requeteId';
      const entiteId = 'entiteId';
      const createdAt = new Date('2024-02-10T09:00:00Z');

      const mockRequeteEntite = {
        requeteId,
        entiteId,
        statutId: 'EN_COURS',
        prioriteId: null,
        requete: { dematSocialId: null, createdAt, createdBy: null },
      };

      const mockFindUnique = vi.fn();
      const mockFindMany = vi.fn();
      const mockCreate = vi.fn();
      const mockTx = {
        requeteEntite: {
          findUnique: mockFindUnique,
        },
        requeteEtape: {
          findMany: mockFindMany,
          create: mockCreate,
        },
      } as unknown as NonNullable<Parameters<typeof createDefaultRequeteEtapes>[2]>;

      const mockEtape1: RequeteEtape = {
        id: 'etape1Id',
        requeteId,
        entiteId,
        nom: 'Création de la requête',
        type: 'CREATION',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'A_FAIRE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      mockFindUnique.mockResolvedValueOnce(mockRequeteEntite);
      mockFindMany.mockResolvedValueOnce([]);
      mockCreate.mockResolvedValueOnce(mockEtape1).mockResolvedValueOnce(mockEtape2);

      const result = await createDefaultRequeteEtapes(requeteId, entiteId, mockTx);

      expect(result).toEqual({ etape1: mockEtape1, etape2: mockEtape2 });
      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            requeteId_entiteId: {
              requeteId,
              entiteId,
            },
          },
        }),
      );
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(prisma.requeteEtape.create).not.toHaveBeenCalled();

      expect(mockCreate).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          requeteId,
          entiteId,
          statutId: 'FAIT',
          nom: expect.stringContaining('Création de la requête'),
          type: 'CREATION',
        }),
      });

      expect(mockCreate).toHaveBeenNthCalledWith(2, {
        data: {
          requeteId,
          entiteId,
          statutId: 'A_FAIRE',
          nom: "Envoi de l'accusé de réception",
          type: 'ACKNOWLEDGMENT',
          estPartagee: false,
        },
      });
    });

    it('should format date correctly in French locale', async () => {
      const requeteId = 'requeteId';
      const entiteId = 'entiteId';
      const createdAt = new Date('2024-12-25T00:00:00Z');

      const mockRequeteEntite = {
        requeteId,
        entiteId,
        statutId: 'EN_COURS',
        prioriteId: null,
        requete: { dematSocialId: null, createdAt, createdBy: null },
      };

      const mockEtape1: RequeteEtape = {
        id: 'etape1Id',
        requeteId,
        entiteId,
        nom: 'Création de la requête',
        type: 'CREATION',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.requeteEtape.create).mockResolvedValueOnce(mockEtape1).mockResolvedValueOnce(mockEtape2);

      await createDefaultRequeteEtapes(requeteId, entiteId);

      const firstCall = vi.mocked(prisma.requeteEtape.create).mock.calls[0];
      expect(firstCall[0].data.nom).toContain('Création de la requête');
    });

    it('should create etapes with correct order (FAIT for creation, A_FAIRE for acknowledgment)', async () => {
      const requeteId = 'requeteId';
      const entiteId = 'entiteId';
      const createdAt = new Date('2024-06-01T12:00:00Z');

      const mockRequeteEntite = {
        requeteId,
        entiteId,
        statutId: 'EN_COURS',
        prioriteId: null,
        requete: { dematSocialId: null, createdAt, createdBy: null },
      };

      const mockEtape1: RequeteEtape = {
        id: 'etape1Id',
        requeteId,
        entiteId,
        nom: 'Création de la requête',
        type: 'CREATION',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        acknowledgmentSendMode: null,
        acknowledgmentSendOperationId: null,
        dateRealisation: null,
        statutId: 'A_FAIRE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
        rappelType: null,
        rappelDate: null,
      };

      vi.mocked(prisma.requeteEntite.findUnique).mockResolvedValueOnce(mockRequeteEntite);
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.requeteEtape.create).mockResolvedValueOnce(mockEtape1).mockResolvedValueOnce(mockEtape2);

      const result = await createDefaultRequeteEtapes(requeteId, entiteId);

      expect(result).not.toBeNull();
      expect(result?.etape1.statutId).toBe('FAIT');
      expect(result?.etape2.statutId).toBe('A_FAIRE');
      expect(result?.etape1.nom).toContain('Création de la requête');
      expect(result?.etape2.nom).toBe("Envoi de l'accusé de réception");
    });
  });

  describe('getRequeteEtapes()', () => {
    it('should retrieve RequeteEtapes for a given RequeteEntite', async () => {
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([requeteEtapeWithNotesAndFiles]);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(1);

      const result = await getRequeteEtapes('requeteId', 'entiteId', { offset: 0, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ id: 'requeteEtapeId', editable: true, canOnlyEditNotes: false });
      // metadata (encryption keys) is stripped and the original filename is resolved from metadata.originalName
      expect(result.data[0].uploadedFiles).toEqual([
        { id: 'uploadedFileId', fileName: 'rapport.pdf', size: 1024, filePath: 'path/to/file1.pdf' },
      ]);
      expect(result.total).toBe(1);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith({
        where: {
          requeteId: 'requeteId',
          entiteId: 'entiteId',
          requete: { requeteEntites: { some: { entiteId: 'entiteId' } } },
        },
        select: {
          id: true,
          nom: true,
          type: true,
          estPartagee: true,
          acknowledgmentSendMode: true,
          acknowledgmentSendOperationId: true,
          statutId: true,
          clotureEffectiveDate: true,
          dateRealisation: true,
          rappelType: true,
          rappelDate: true,
          createdAt: true,
          updatedAt: true,
          clotureReason: {
            select: {
              label: true,
            },
          },
          createdBy: {
            select: {
              prenom: true,
              nom: true,
            },
          },
          notes: {
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              texte: true,
              createdAt: true,
              author: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
            },
          },
          uploadedFiles: {
            select: {
              id: true,
              fileName: true,
              metadata: true,
              size: true,
              status: true,
              scanStatus: true,
              sanitizeStatus: true,
              canDelete: true,
              createdAt: true,
              uploadedBy: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          requete: {
            select: {
              createdAt: true,
              createdById: true,
              createdBy: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
              dematSocialId: true,
              sirecId: true,
              thirdPartyAccountId: true,
            },
          },
          requeteId: true,
          entiteId: true,
          requeteEntite: {
            select: {
              entite: {
                select: {
                  id: true,
                  nomComplet: true,
                  entiteTypeId: true,
                },
              },
            },
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should retrieve RequeteEtapes for a given RequeteEntite with no limit', async () => {
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([requeteEtapeWithNotesAndFiles]);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(1);

      const result = await getRequeteEtapes('requeteId', 'entiteId', { offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ id: 'requeteEtapeId', editable: true, canOnlyEditNotes: false });
      // metadata (encryption keys) is stripped and the original filename is resolved from metadata.originalName
      expect(result.data[0].uploadedFiles).toEqual([
        { id: 'uploadedFileId', fileName: 'rapport.pdf', size: 1024, filePath: 'path/to/file1.pdf' },
      ]);
      expect(result.total).toBe(1);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith({
        where: {
          requeteId: 'requeteId',
          entiteId: 'entiteId',
          requete: { requeteEntites: { some: { entiteId: 'entiteId' } } },
        },
        select: {
          id: true,
          nom: true,
          type: true,
          estPartagee: true,
          acknowledgmentSendMode: true,
          acknowledgmentSendOperationId: true,
          statutId: true,
          clotureEffectiveDate: true,
          dateRealisation: true,
          rappelType: true,
          rappelDate: true,
          createdAt: true,
          updatedAt: true,
          clotureReason: {
            select: {
              label: true,
            },
          },
          createdBy: {
            select: {
              prenom: true,
              nom: true,
            },
          },
          notes: {
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              texte: true,
              createdAt: true,
              author: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
            },
          },
          uploadedFiles: {
            select: {
              id: true,
              fileName: true,
              metadata: true,
              size: true,
              status: true,
              scanStatus: true,
              sanitizeStatus: true,
              canDelete: true,
              createdAt: true,
              uploadedBy: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          requete: {
            select: {
              createdAt: true,
              createdById: true,
              createdBy: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
              dematSocialId: true,
              sirecId: true,
              thirdPartyAccountId: true,
            },
          },
          requeteId: true,
          entiteId: true,
          requeteEntite: {
            select: {
              entite: {
                select: {
                  id: true,
                  nomComplet: true,
                  entiteTypeId: true,
                },
              },
            },
          },
        },
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should expose editability flags per step type', async () => {
      const closedEtape = {
        ...requeteEtape,
        requeteEntite: requeteEtapeWithNotesAndFiles.requeteEntite,
        type: 'MANUAL',
        statutId: 'CLOTUREE',
        notes: [],
        uploadedFiles: [],
        requete: { createdById: 'agent-1' },
      };
      const sentAckEtape = {
        ...requeteEtape,
        requeteEntite: requeteEtapeWithNotesAndFiles.requeteEntite,
        id: 'ackEtapeId',
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        notes: [],
        // A sent ACR carries its non-deletable AR PDF → status/name/date locked.
        uploadedFiles: [{ id: 'ar', fileName: 'AR.pdf', metadata: null, size: 10, canDelete: false }],
        requete: { createdById: null },
      };
      const automaticAckWithoutPdf = {
        ...requeteEtape,
        requeteEntite: requeteEtapeWithNotesAndFiles.requeteEntite,
        id: 'automaticAckEtapeId',
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        acknowledgmentSendMode: 'AUTOMATIC' as const,
        acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
        notes: [],
        uploadedFiles: [],
        requete: { createdById: null },
      };
      const handMarkedAckEtape = {
        ...requeteEtape,
        requeteEntite: requeteEtapeWithNotesAndFiles.requeteEntite,
        id: 'handAckEtapeId',
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        notes: [],
        // Marked "Fait" by hand, no AR PDF → stays fully editable.
        uploadedFiles: [],
        requete: { createdById: 'agent-1' },
      };
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([
        closedEtape,
        sentAckEtape,
        automaticAckWithoutPdf,
        handMarkedAckEtape,
      ]);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(4);

      const result = await getRequeteEtapes('requeteId', 'entiteId', { offset: 0 });

      expect(result.data[0]).toMatchObject({ editable: false, canOnlyEditNotes: false });
      expect(result.data[1]).toMatchObject({ editable: true, canOnlyEditNotes: true });
      expect(result.data[2]).toMatchObject({ editable: false, canOnlyEditNotes: false });
      expect(result.data[3]).toMatchObject({ editable: true, canOnlyEditNotes: false });
    });

    it('exposes current multi-entity metadata and each owner Entité administrative identity', async () => {
      const foreignEtapePartagee = {
        ...requeteEtapeWithNotesAndFiles,
        id: 'foreign-etape-partagee',
        entiteId: 'foreign-entite',
        estPartagee: true,
        requeteEntite: {
          entite: { id: 'foreign-entite', nomComplet: 'CD du Calvados', entiteTypeId: 'CD' },
        },
      };
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([foreignEtapePartagee]);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.requeteEntite.count).mockResolvedValueOnce(2);

      const result = await getRequeteEtapes('requeteId', 'reader-entite', {}, true);

      expect(result.isMultiEntite).toBe(true);
      expect(result.data[0]).toMatchObject({
        id: 'foreign-etape-partagee',
        entiteId: 'foreign-entite',
        entiteAdministrative: {
          id: 'foreign-entite',
          nomComplet: 'CD du Calvados',
          entiteTypeId: 'CD',
        },
      });
      expect(result.data[0]).not.toHaveProperty('requeteEntite');
      expect(prisma.requeteEntite.count).toHaveBeenCalledWith({
        where: {
          requeteId: 'requeteId',
          requete: { requeteEntites: { some: { entiteId: 'reader-entite' } } },
        },
      });
    });

    it('returns owner steps and foreign Étapes partagées in one chronology, with the latter read-only', async () => {
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([
        { ...requeteEtapeWithNotesAndFiles, id: 'owner-step', entiteId: 'reader-entite' },
        {
          ...requeteEtapeWithNotesAndFiles,
          id: 'foreign-shared-step',
          entiteId: 'foreign-entite',
          estPartagee: true,
        },
      ]);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(2);

      const result = await getRequeteEtapes('requeteId', 'reader-entite', {}, true);

      expect(result.data).toMatchObject([
        { id: 'owner-step', entiteId: 'reader-entite', editable: true, canOnlyEditNotes: false },
        { id: 'foreign-shared-step', entiteId: 'foreign-entite', editable: false, canOnlyEditNotes: false },
      ]);
      expect(result.total).toBe(2);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('keeps entity-specific creation sources unchanged when the shared chronology is disabled', async () => {
      const creationSources = [
        {
          ...requeteEtapeWithNotesAndFiles,
          id: 'owner-creation',
          type: 'CREATION' as const,
          createdAt: new Date('2026-01-02T08:00:00.000Z'),
        },
        {
          ...requeteEtapeWithNotesAndFiles,
          id: 'later-creation',
          type: 'CREATION' as const,
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
        },
      ];
      vi.mocked(prisma.requeteEntite.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce(creationSources);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(2);

      const result = await getRequeteEtapes('requeteId', 'entiteId', { offset: 0, limit: 10 }, false);

      expect(result.data.map((step) => step.id)).toEqual(['owner-creation', 'later-creation']);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            timelineItemType: 'ENTITY_STEP',
            attributedEntiteAdministrative: expect.any(Object),
          }),
        ]),
      );
      expect(result.total).toBe(2);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('projects one neutral creation at the original request date before sorting and pagination', async () => {
      const requestCreatedAt = new Date('2026-01-01T08:00:00.000Z');
      const makeTimelineStep = ({
        id,
        type = 'MANUAL',
        createdAt,
        dateRealisation = null,
        entiteId = 'reader-entite',
      }: {
        id: string;
        type?: RequeteEtape['type'];
        createdAt: Date;
        dateRealisation?: Date | null;
        entiteId?: string;
      }) => ({
        ...requeteEtapeWithNotesAndFiles,
        id,
        type,
        entiteId,
        createdAt,
        dateRealisation,
        requeteEntite: {
          entite: {
            id: entiteId,
            nomComplet: entiteId === 'reader-entite' ? 'ARS Normandie' : 'CD du Calvados',
            entiteTypeId: entiteId === 'reader-entite' ? 'ARS' : 'CD',
          },
        },
        requete: {
          createdAt: requestCreatedAt,
          createdById: 'agent-1',
          createdBy: { prenom: 'Camille', nom: 'Dupont' },
          dematSocialId: null,
          sirecId: null,
          thirdPartyAccountId: null,
        },
      });

      const sourceTimeline = [
        makeTimelineStep({
          id: 'creation-late-assignment',
          type: 'CREATION',
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
          entiteId: 'foreign-entite',
        }),
        makeTimelineStep({
          id: 'most-recent-by-created-at',
          createdAt: new Date('2026-06-01T08:00:00.000Z'),
          dateRealisation: new Date('2025-01-01T08:00:00.000Z'),
        }),
        makeTimelineStep({ id: 'same-date-b', createdAt: new Date('2026-05-01T08:00:00.000Z') }),
        makeTimelineStep({
          id: 'creation-initial-assignment',
          type: 'CREATION',
          createdAt: new Date('2026-01-02T08:00:00.000Z'),
        }),
        makeTimelineStep({ id: 'same-date-a', createdAt: new Date('2026-05-01T08:00:00.000Z') }),
      ];
      vi.mocked(prisma.requeteEntite.count).mockResolvedValueOnce(3).mockResolvedValueOnce(3);
      vi.mocked(prisma.requeteEtape.findMany)
        .mockResolvedValueOnce(sourceTimeline)
        .mockResolvedValueOnce(sourceTimeline);

      const firstPage = await getRequeteEtapes('requeteId', 'reader-entite', { offset: 0, limit: 2 }, true);
      const secondPage = await getRequeteEtapes('requeteId', 'reader-entite', { offset: 2, limit: 2 }, true);

      expect(firstPage.total).toBe(4);
      expect(secondPage.total).toBe(4);
      expect(firstPage.data.map((step) => step.id)).toEqual(['most-recent-by-created-at', 'same-date-a']);
      expect(secondPage.data.map((step) => step.id)).toEqual(['same-date-b', 'creation-initial-assignment']);
      expect(secondPage.data[1]).toMatchObject({
        id: 'creation-initial-assignment',
        type: 'CREATION',
        createdAt: requestCreatedAt,
        timelineItemType: 'NEUTRAL_EVENT',
        attributedEntiteAdministrative: null,
      });
      expect([...firstPage.data, ...secondPage.data].filter((step) => step.type === 'CREATION')).toHaveLength(1);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ skip: expect.anything(), take: expect.anything() }),
      );
      expect(prisma.requeteEtape.update).not.toHaveBeenCalled();
      expect(prisma.requeteEtape.delete).not.toHaveBeenCalled();
    });

    it('groups automatic acknowledgments by durable send operation before sorting, totals, and pagination', async () => {
      const requestCreatedAt = new Date('2026-01-01T08:00:00.000Z');
      const firstSendOperationId = '11111111-1111-4111-8111-111111111111';
      const laterSendOperationId = '22222222-2222-4222-8222-222222222222';
      const makeTimelineStep = ({
        id,
        entiteId,
        createdAt,
        acknowledgmentSendMode,
        acknowledgmentSendOperationId,
        uploadedFiles = [],
      }: {
        id: string;
        entiteId: string;
        createdAt: Date;
        acknowledgmentSendMode: RequeteEtape['acknowledgmentSendMode'];
        acknowledgmentSendOperationId: string | null;
        uploadedFiles?: typeof requeteEtapeWithNotesAndFiles.uploadedFiles;
      }) => ({
        ...requeteEtapeWithNotesAndFiles,
        id,
        type: 'ACKNOWLEDGMENT' as const,
        entiteId,
        estPartagee: true,
        statutId: 'FAIT',
        createdAt,
        dateRealisation: new Date('2025-01-01T08:00:00.000Z'),
        acknowledgmentSendMode,
        acknowledgmentSendOperationId,
        uploadedFiles,
        requeteEntite: {
          entite: {
            id: entiteId,
            nomComplet: entiteId === 'reader-entite' ? 'ARS Normandie' : 'CD du Calvados',
            entiteTypeId: entiteId === 'reader-entite' ? 'ARS' : 'CD',
          },
        },
        requete: {
          createdAt: requestCreatedAt,
          createdById: 'agent-1',
          createdBy: { prenom: 'Camille', nom: 'Dupont' },
          dematSocialId: null,
          sirecId: null,
          thirdPartyAccountId: null,
        },
      });
      const makeAcknowledgmentFile = (id: string) => ({
        ...uploadedFile,
        id,
        fileName: `${id}.pdf`,
        metadata: { originalName: 'accuse-reception.pdf' },
        canDelete: false,
        status: 'READY',
        scanStatus: 'CLEAN',
        sanitizeStatus: 'COMPLETED',
        createdAt: new Date('2026-06-10T08:00:00.000Z'),
        uploadedBy: null,
      });
      const sourceTimeline = [
        makeTimelineStep({
          id: 'later-automatic-send',
          entiteId: 'third-entite',
          createdAt: new Date('2026-06-20T08:00:00.000Z'),
          acknowledgmentSendMode: 'AUTOMATIC',
          acknowledgmentSendOperationId: laterSendOperationId,
          uploadedFiles: [makeAcknowledgmentFile('later-document')],
        }),
        makeTimelineStep({
          id: 'manual-send',
          entiteId: 'reader-entite',
          createdAt: new Date('2026-06-15T08:00:00.000Z'),
          acknowledgmentSendMode: 'MANUAL',
          acknowledgmentSendOperationId: firstSendOperationId,
          uploadedFiles: [makeAcknowledgmentFile('manual-document')],
        }),
        makeTimelineStep({
          id: 'first-send-foreign-source',
          entiteId: 'foreign-entite',
          createdAt: new Date('2026-06-02T08:00:00.000Z'),
          acknowledgmentSendMode: 'AUTOMATIC',
          acknowledgmentSendOperationId: firstSendOperationId,
          uploadedFiles: [makeAcknowledgmentFile('foreign-document-copy')],
        }),
        makeTimelineStep({
          id: 'first-send-owner-source',
          entiteId: 'reader-entite',
          createdAt: new Date('2026-06-01T08:00:00.000Z'),
          acknowledgmentSendMode: 'AUTOMATIC',
          acknowledgmentSendOperationId: firstSendOperationId,
          uploadedFiles: [],
        }),
        {
          ...requeteEtapeWithNotesAndFiles,
          id: 'creation-source',
          type: 'CREATION' as const,
          entiteId: 'reader-entite',
          createdAt: new Date('2026-01-02T08:00:00.000Z'),
          requete: {
            createdAt: requestCreatedAt,
            createdById: 'agent-1',
            createdBy: { prenom: 'Camille', nom: 'Dupont' },
            dematSocialId: null,
            sirecId: null,
            thirdPartyAccountId: null,
          },
        },
      ];
      const sourceIdsBeforeProjection = sourceTimeline.map((step) => step.id);
      const sourceFilesBeforeProjection = sourceTimeline.map((step) => step.uploadedFiles.map((file) => file.id));
      vi.mocked(prisma.requeteEntite.count).mockResolvedValueOnce(3).mockResolvedValueOnce(3);
      vi.mocked(prisma.requeteEtape.findMany)
        .mockResolvedValueOnce(sourceTimeline)
        .mockResolvedValueOnce(sourceTimeline);

      const firstPage = await getRequeteEtapes('requeteId', 'reader-entite', { offset: 0, limit: 2 }, true);
      const secondPage = await getRequeteEtapes('requeteId', 'reader-entite', { offset: 2, limit: 2 }, true);

      expect(firstPage.total).toBe(4);
      expect(secondPage.total).toBe(4);
      expect(firstPage.data.map((step) => step.id)).toEqual(['later-automatic-send', 'manual-send']);
      expect(secondPage.data.map((step) => step.id)).toEqual(['first-send-foreign-source', 'creation-source']);
      expect(firstPage.data[0]).toMatchObject({
        timelineItemType: 'NEUTRAL_EVENT',
        attributedEntiteAdministrative: null,
        uploadedFiles: [{ id: 'later-document', fileName: 'accuse-reception.pdf' }],
        editable: false,
        canOnlyEditNotes: false,
      });
      expect(firstPage.data[1]).toMatchObject({
        timelineItemType: 'ENTITY_STEP',
        attributedEntiteAdministrative: { id: 'reader-entite' },
        acknowledgmentSendMode: 'MANUAL',
      });
      expect(secondPage.data[0]).toMatchObject({
        id: 'first-send-foreign-source',
        createdAt: new Date('2026-06-01T08:00:00.000Z'),
        timelineItemType: 'NEUTRAL_EVENT',
        attributedEntiteAdministrative: null,
        entiteAdministrative: { id: 'foreign-entite' },
        uploadedFiles: [{ id: 'foreign-document-copy', fileName: 'accuse-reception.pdf' }],
        editable: false,
        canOnlyEditNotes: false,
      });
      expect(secondPage.data[0].uploadedFiles).toHaveLength(1);
      expect(
        [...firstPage.data, ...secondPage.data].filter((step) => step.acknowledgmentSendMode === 'AUTOMATIC'),
      ).toHaveLength(2);
      expect(sourceTimeline.map((step) => step.id)).toEqual(sourceIdsBeforeProjection);
      expect(sourceTimeline.map((step) => step.uploadedFiles.map((file) => file.id))).toEqual(
        sourceFilesBeforeProjection,
      );
      expect(prisma.requeteEtape.update).not.toHaveBeenCalled();
      expect(prisma.requeteEtape.delete).not.toHaveBeenCalled();
    });

    it('selects only owner steps or Étapes partagées for a currently affected reader', async () => {
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(0);

      await getRequeteEtapes('requeteId', 'reader-entite', { offset: 5, limit: 10 }, true);

      const sharedWhere = {
        requeteId: 'requeteId',
        requete: { requeteEntites: { some: { entiteId: 'reader-entite' } } },
        OR: [{ entiteId: 'reader-entite' }, { estPartagee: true }],
      };
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: sharedWhere, skip: 5, take: 10 }),
      );
      expect(prisma.requeteEtape.count).toHaveBeenCalledWith({ where: sharedWhere });
    });
  });

  describe('updateAcknowledgmentStep()', () => {
    it('assigns one durable identity and automatic mode to every step completed by one send operation', async () => {
      const sentDate = new Date('2026-07-31T09:30:00.000Z');
      const pendingEtapes = [
        { ...requeteEtape, id: 'ack-1', entiteId: 'entite-1', type: 'ACKNOWLEDGMENT' },
        { ...requeteEtape, id: 'ack-2', entiteId: 'entite-2', type: 'ACKNOWLEDGMENT' },
      ];
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce(pendingEtapes);
      vi.mocked(prisma.requeteEtape.update).mockImplementation((async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => ({
        ...pendingEtapes.find((etape) => etape.id === where.id),
        ...data,
        updatedAt: sentDate,
      })) as never);

      const operationId = await updateAcknowledgmentStep('requeteId', ['entite-1', 'entite-2'], sentDate);

      expect(operationId).toMatch(/^[0-9a-f-]{36}$/);
      expect(prisma.requeteEtape.update).toHaveBeenCalledTimes(2);
      for (const pendingEtape of pendingEtapes) {
        expect(prisma.requeteEtape.update).toHaveBeenCalledWith({
          where: { id: pendingEtape.id },
          data: {
            statutId: 'FAIT',
            dateRealisation: sentDate,
            estPartagee: true,
            acknowledgmentSendMode: 'AUTOMATIC',
            acknowledgmentSendOperationId: operationId,
          },
        });
      }
      expect(createChangeLog).toHaveBeenCalledTimes(2);
      expect(createChangeLog).toHaveBeenCalledWith(
        expect.objectContaining({
          changedById: null,
          before: expect.objectContaining({
            estPartagee: false,
            acknowledgmentSendMode: null,
            acknowledgmentSendOperationId: null,
          }),
          after: expect.objectContaining({
            estPartagee: true,
            acknowledgmentSendMode: 'AUTOMATIC',
            acknowledgmentSendOperationId: operationId,
          }),
        }),
      );
    });

    it('uses a new operation identity for a later automatic send', async () => {
      vi.mocked(prisma.requeteEtape.findMany)
        .mockResolvedValueOnce([{ ...requeteEtape, id: 'ack-1', type: 'ACKNOWLEDGMENT' }])
        .mockResolvedValueOnce([{ ...requeteEtape, id: 'ack-3', type: 'ACKNOWLEDGMENT' }]);
      vi.mocked(prisma.requeteEtape.update).mockImplementation((async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => ({
        ...requeteEtape,
        id: where.id,
        ...data,
      })) as never);

      const firstOperationId = await updateAcknowledgmentStep('requeteId', ['entite-1']);
      const laterOperationId = await updateAcknowledgmentStep('requeteId', ['entite-3']);

      expect(firstOperationId).not.toBe(laterOperationId);
    });

    it('does not reinterpret an already completed historical Accusé de réception', async () => {
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([]);

      await updateAcknowledgmentStep('requeteId', ['entiteId']);

      expect(prisma.requeteEtape.update).not.toHaveBeenCalled();
      expect(createChangeLog).not.toHaveBeenCalled();
    });
  });

  describe('getRequeteEtapeById()', () => {
    it('should return a RequeteEtape by id', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(requeteEtape);

      const result = await getRequeteEtapeById('requeteEtapeId');

      expect(result).toEqual({
        ...requeteEtape,
      });
      expect(prisma.requeteEtape.findUnique).toHaveBeenCalledWith({
        where: { id: 'requeteEtapeId' },
      });
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(null);

      const result = await getRequeteEtapeById('missing');

      expect(result).toBeNull();
      expect(prisma.requeteEtape.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
      });
    });
  });

  describe('addClotureEtapeFiles()', () => {
    const closureEtape: RequeteEtape = { ...requeteEtape, statutId: 'CLOTUREE' };

    it('atomically attaches eligible files at the step level on a closure step', async () => {
      const tx = {};
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(closureEtape).mockResolvedValueOnce(closureEtape);
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);

      const result = await addClotureEtapeFiles('requeteEtapeId', 'userId', 'entiteId', ['file1', 'file2']);

      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(setEtapeFile).toHaveBeenCalledWith('requeteEtapeId', ['file1', 'file2'], 'entiteId', 'userId', tx);
      expect(result).toEqual(closureEtape);
    });

    it('should return null if RequeteEtape not found', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(null);

      const result = await addClotureEtapeFiles('999', 'userId', 'entiteId', ['file1']);

      expect(result).toBeNull();
      expect(setEtapeFile).not.toHaveBeenCalled();
    });

    it('should throw EtapeNotEditableError when the step is not a closure step', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(requeteEtape);

      await expect(addClotureEtapeFiles('requeteEtapeId', 'userId', 'entiteId', ['file1'])).rejects.toBeInstanceOf(
        EtapeNotEditableError,
      );
      expect(setEtapeFile).not.toHaveBeenCalled();
    });

    it('rejects a closure attachment when a file is not eligible', async () => {
      const tx = {};
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(closureEtape);
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);
      vi.mocked(setEtapeFile).mockRejectedValueOnce(new FilesNotOwnedError('FILES_NOT_OWNED'));

      await expect(addClotureEtapeFiles('requeteEtapeId', 'userId', 'entiteId', ['file1'])).rejects.toBeInstanceOf(
        FilesNotOwnedError,
      );
    });
  });

  describe('deleteRequeteEtape()', () => {
    const mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    } as unknown as PinoLogger;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should delete RequeteEtape with notes and files successfully', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue(requeteEtapeWithNotesAndFiles);
      vi.mocked(prisma.requeteEtape.delete).mockResolvedValue({} as RequeteEtape);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteRequeteEtape('requeteEtapeId', mockLogger, 'user-1');

      expect(prisma.requeteEtape.findUnique).toHaveBeenCalledWith({
        where: { id: 'requeteEtapeId' },
        include: {
          notes: true,
          uploadedFiles: true,
          requete: {
            select: { dematSocialId: true, sirecId: true, thirdPartyAccountId: true },
          },
        },
      });
      expect(prisma.requeteEtape.delete).toHaveBeenCalledWith({ where: { id: requeteEtapeWithNotesAndFiles.id } });
      expect(createChangeLog).toHaveBeenCalledTimes(2);
      expect(deleteFileFromMinio).toHaveBeenCalledWith('path/to/file1.pdf');
    });

    it('rejects deleting an automatically sent acknowledgment even when its PDF is missing', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue({
        ...requeteEtapeWithNotesAndFiles,
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        acknowledgmentSendMode: 'AUTOMATIC',
        acknowledgmentSendOperationId: '11111111-1111-4111-8111-111111111111',
        uploadedFiles: [],
      } as never);

      await expect(deleteRequeteEtape('requeteEtapeId', mockLogger, 'user-1')).rejects.toBeInstanceOf(
        EtapeNotEditableError,
      );
      expect(prisma.requeteEtape.delete).not.toHaveBeenCalled();
      expect(deleteFileFromMinio).not.toHaveBeenCalled();
    });

    it('should handle RequeteEtape not found', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue(null);

      await deleteRequeteEtape('non-existent', mockLogger, 'user-1');

      expect(prisma.requeteEtape.findUnique).toHaveBeenCalled();
      expect(prisma.requeteEtape.delete).not.toHaveBeenCalled();
    });

    it('should handle RequeteEtape with no notes', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue({
        ...requeteEtapeWithNotesAndFiles,
        notes: [],
        uploadedFiles: [],
      } as typeof requeteEtapeWithNotesAndFiles);
      vi.mocked(prisma.requeteEtape.delete).mockResolvedValue({} as RequeteEtape);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);

      await deleteRequeteEtape('etape-1', mockLogger, 'user-1');

      expect(prisma.requeteEtape.delete).toHaveBeenCalled();
      expect(createChangeLog).toHaveBeenCalledTimes(0); // No changelog
    });

    it('should handle RequeteEtape with notes but no files', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue({
        ...requeteEtapeWithNotesAndFiles,
        notes: [
          {
            id: 'noteId',
            texte: 'Note 1',
            createdAt: new Date(),
            updatedAt: new Date(),
            authorId: 'authorId',
            requeteEtapeId: 'requeteEtapeId',
          },
        ],
        uploadedFiles: [],
      } as typeof requeteEtapeWithNotesAndFiles);
      vi.mocked(prisma.requeteEtape.delete).mockResolvedValue({} as RequeteEtape);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);

      await deleteRequeteEtape('etape-1', mockLogger, 'user-1');

      expect(prisma.requeteEtape.delete).toHaveBeenCalled();
      expect(createChangeLog).toHaveBeenCalledTimes(1); // 1 note
    });

    it('should handle changelog creation errors gracefully', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue(requeteEtapeWithNotesAndFiles);
      vi.mocked(prisma.requeteEtape.delete).mockResolvedValue({} as RequeteEtape);
      vi.mocked(createChangeLog).mockRejectedValueOnce(new Error('Changelog error'));
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteRequeteEtape('etape-1', mockLogger, 'user-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), noteId: 'noteId' }),
        'Failed to create changelog for note',
      );
    });

    it('should handle MinIO deletion errors gracefully', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue(requeteEtapeWithNotesAndFiles);
      vi.mocked(prisma.requeteEtape.delete).mockResolvedValue({} as RequeteEtape);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockRejectedValueOnce(new Error('MinIO error'));

      await deleteRequeteEtape('etape-1', mockLogger, 'user-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), filePath: 'path/to/file1.pdf' }),
        'Failed to delete MinIO file',
      );
    });

    it('should not create changelogs when changedById is not provided', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue(requeteEtapeWithNotesAndFiles);
      vi.mocked(prisma.requeteEtape.delete).mockResolvedValue({} as RequeteEtape);

      await deleteRequeteEtape('etape-1', mockLogger);

      expect(prisma.requeteEtape.delete).toHaveBeenCalled();
      expect(createChangeLog).not.toHaveBeenCalled();
    });

    it('should handle multiple notes and files correctly', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue(requeteEtapeWithNotesAndFiles);
      vi.mocked(prisma.requeteEtape.delete).mockResolvedValue({} as RequeteEtape);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteRequeteEtape('etape-1', mockLogger, 'user-1');

      expect(createChangeLog).toHaveBeenCalledTimes(2); // 1 notes + 1 files
      expect(deleteFileFromMinio).toHaveBeenCalledTimes(1);
    });

    it('should handle RequeteEtape with all related entities', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValue(requeteEtapeWithNotesAndFiles);
      vi.mocked(prisma.requeteEtape.delete).mockResolvedValue({} as RequeteEtape);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteRequeteEtape('etape-1', mockLogger, 'user-1');

      expect(createChangeLog).toHaveBeenCalledTimes(2); // 1 note + 1 file
      expect(deleteFileFromMinio).toHaveBeenCalledWith('path/to/file1.pdf');
    });
  });

  describe('getEtapePermissions', () => {
    const arPdf = { canDelete: false };
    const userFile = { canDelete: true };

    it('MANUAL step is fully editable', () => {
      expect(getEtapePermissions({ type: 'MANUAL', statutId: 'A_FAIRE', uploadedFiles: [] })).toEqual({
        editable: true,
        canOnlyEditNotes: false,
      });
    });

    it('CLOTUREE step is not editable', () => {
      expect(getEtapePermissions({ type: 'MANUAL', statutId: 'CLOTUREE', uploadedFiles: [] })).toEqual({
        editable: false,
        canOnlyEditNotes: false,
      });
    });

    it('CREATION and REOPEN steps are not editable', () => {
      expect(getEtapePermissions({ type: 'CREATION', statutId: 'FAIT', uploadedFiles: [] }).editable).toBe(false);
      expect(getEtapePermissions({ type: 'REOPEN', statutId: 'FAIT', uploadedFiles: [] }).editable).toBe(false);
    });

    it('makes an explicitly automatic acknowledgment fully immutable without relying on a PDF', () => {
      expect(
        getEtapePermissions({
          type: 'ACKNOWLEDGMENT',
          statutId: 'FAIT',
          acknowledgmentSendMode: 'AUTOMATIC',
          uploadedFiles: [],
        }),
      ).toEqual({ editable: false, canOnlyEditNotes: false });
    });

    it('keeps an explicitly manually sent acknowledgment editable for notes and attachments', () => {
      expect(
        getEtapePermissions({
          type: 'ACKNOWLEDGMENT',
          statutId: 'FAIT',
          acknowledgmentSendMode: 'MANUAL',
          uploadedFiles: [],
        }),
      ).toEqual({ editable: true, canOnlyEditNotes: true });
    });

    it('conservatively identifies a historical automatic acknowledgment from its system PDF', () => {
      expect(
        getEtapePermissions({
          type: 'ACKNOWLEDGMENT',
          statutId: 'FAIT',
          acknowledgmentSendMode: null,
          requeteIsAutomatic: true,
          uploadedFiles: [{ ...arPdf, uploadedById: null }],
        }),
      ).toEqual({ editable: false, canOnlyEditNotes: false });
    });

    it('preserves manual rights for historical and ambiguous acknowledgments', () => {
      expect(
        getEtapePermissions({
          type: 'ACKNOWLEDGMENT',
          statutId: 'FAIT',
          acknowledgmentSendMode: null,
          uploadedFiles: [{ ...arPdf, uploadedById: 'agent-1' }],
        }),
      ).toEqual({ editable: true, canOnlyEditNotes: true });
      expect(
        getEtapePermissions({
          type: 'ACKNOWLEDGMENT',
          statutId: 'FAIT',
          acknowledgmentSendMode: null,
          requeteIsAutomatic: false,
          uploadedFiles: [{ ...arPdf, uploadedById: null }],
        }),
      ).toEqual({ editable: true, canOnlyEditNotes: true });
      expect(
        getEtapePermissions({
          type: 'ACKNOWLEDGMENT',
          statutId: 'FAIT',
          acknowledgmentSendMode: null,
          uploadedFiles: [],
        }),
      ).toEqual({ editable: true, canOnlyEditNotes: false });
      expect(
        getEtapePermissions({
          type: 'ACKNOWLEDGMENT',
          statutId: 'A_FAIRE',
          acknowledgmentSendMode: null,
          uploadedFiles: [userFile],
        }),
      ).toEqual({ editable: true, canOnlyEditNotes: false });
    });
  });

  describe('resolveEtapeRappel', () => {
    it('disables the reminder when no type is selected', () => {
      expect(resolveEtapeRappel({})).toEqual({ rappelType: null, rappelDate: null });
      expect(resolveEtapeRappel({ rappelType: null })).toEqual({ rappelType: null, rappelDate: null });
    });

    it('disables the reminder when a custom date is expected but missing', () => {
      expect(resolveEtapeRappel({ rappelType: 'PERSONNALISE' })).toEqual({ rappelType: null, rappelDate: null });
    });

    it('ignores a date sent along a precalculated delay and computes the due date itself', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-20T10:00:00Z'));

      expect(resolveEtapeRappel({ rappelType: 'JOURS_30', rappelDate: '2030-01-01' })).toEqual({
        rappelType: 'JOURS_30',
        rappelDate: new Date('2026-06-19T00:00:00.000Z'),
      });

      vi.useRealTimers();
    });

    it('rolls over month and year boundaries', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-12-20T10:00:00Z'));

      expect(resolveEtapeRappel({ rappelType: 'JOURS_30' }).rappelDate).toEqual(new Date('2027-01-19T00:00:00.000Z'));

      vi.useRealTimers();
    });

    it('anchors « today » on the Paris day, not on UTC', () => {
      vi.useFakeTimers();
      // 23:30 UTC on 19 May is already 20 May in Paris (UTC+2).
      vi.setSystemTime(new Date('2026-05-19T23:30:00Z'));

      expect(resolveEtapeRappel({ rappelType: 'JOURS_7' }).rappelDate).toEqual(new Date('2026-05-27T00:00:00.000Z'));

      vi.useRealTimers();
    });
  });

  describe('createProcessingEtape', () => {
    const logger = { error: vi.fn(), info: vi.fn() } as unknown as PinoLogger;

    it('returns null when entiteId is missing', async () => {
      expect(
        await createProcessingEtape('req-1', null, 'user-1', { nom: 'X', notes: [], fileIds: [] }, logger),
      ).toBeNull();
    });

    it('creates the step, its notes and attaches files in one transaction', async () => {
      const createdEtape = { ...requeteEtape, id: 'new-step' };
      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({ id: 'req-1' } as Requete);
      vi.mocked(prisma.requeteEntite.upsert).mockResolvedValueOnce({} as RequeteEntite);

      const tx = {
        requeteEtape: { create: vi.fn().mockResolvedValue(createdEtape) },
        requeteEtapeNote: {
          create: vi
            .fn()
            .mockResolvedValue({ id: 'note-1', texte: 'note 1', authorId: 'user-1', requeteEtapeId: 'new-step' }),
        },
        uploadedFile: { updateMany: vi.fn() },
      };
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);

      const result = await createProcessingEtape(
        'req-1',
        'e1',
        'user-1',
        {
          nom: 'Analyse',
          statutId: 'FAIT',
          dateRealisation: new Date('2026-05-20'),
          notes: [{ texte: 'note 1' }],
          fileIds: ['file-1'],
          estPartagee: true,
        },
        logger,
      );

      expect(result).toEqual(createdEtape);
      expect(tx.requeteEtape.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ estPartagee: true }),
      });
      expect(tx.requeteEtapeNote.create).toHaveBeenCalledTimes(1);
      expect(setEtapeFile).toHaveBeenCalledWith('new-step', ['file-1'], 'e1', 'user-1', tx);
    });

    it('stores the reminder due date computed from the selected delay', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-20T10:00:00Z'));

      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({ id: 'req-1' } as Requete);
      vi.mocked(prisma.requeteEntite.upsert).mockResolvedValueOnce({} as RequeteEntite);

      const tx = {
        requeteEtape: { create: vi.fn().mockResolvedValue({ ...requeteEtape, id: 'new-step' }) },
        requeteEtapeNote: { create: vi.fn() },
      };
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);

      await createProcessingEtape(
        'req-1',
        'e1',
        'user-1',
        { nom: 'Relance', rappelType: 'JOURS_7', notes: [], fileIds: [] },
        logger,
      );

      expect(tx.requeteEtape.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rappelType: 'JOURS_7', rappelDate: new Date('2026-05-27T00:00:00.000Z') }),
        }),
      );

      vi.useRealTimers();
    });

    it('stores the custom reminder date as selected by the agent', async () => {
      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({ id: 'req-1' } as Requete);
      vi.mocked(prisma.requeteEntite.upsert).mockResolvedValueOnce({} as RequeteEntite);

      const tx = {
        requeteEtape: { create: vi.fn().mockResolvedValue({ ...requeteEtape, id: 'new-step' }) },
        requeteEtapeNote: { create: vi.fn() },
      };
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);

      await createProcessingEtape(
        'req-1',
        'e1',
        'user-1',
        { nom: 'Relance', rappelType: 'PERSONNALISE', rappelDate: '2026-09-01', notes: [], fileIds: [] },
        logger,
      );

      expect(tx.requeteEtape.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rappelType: 'PERSONNALISE',
            rappelDate: new Date('2026-09-01T00:00:00.000Z'),
          }),
        }),
      );
    });

    it('rejects step creation when a file is not eligible', async () => {
      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({ id: 'req-1' } as Requete);
      vi.mocked(prisma.requeteEntite.upsert).mockResolvedValueOnce({} as RequeteEntite);
      vi.mocked(setEtapeFile).mockRejectedValueOnce(new FilesNotOwnedError('FILES_NOT_OWNED'));

      const tx = {
        requeteEtape: { create: vi.fn().mockResolvedValue({ ...requeteEtape, id: 'new-step' }) },
        requeteEtapeNote: { create: vi.fn() },
      };
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);

      await expect(
        createProcessingEtape('req-1', 'e1', 'user-1', { nom: 'X', notes: [], fileIds: ['not-mine'] }, logger),
      ).rejects.toBeInstanceOf(FilesNotOwnedError);
    });
  });

  describe('updateProcessingEtape', () => {
    const logger = { error: vi.fn(), info: vi.fn() } as unknown as PinoLogger;
    const makeTx = () => ({
      requeteEtape: { update: vi.fn() },
      requeteEtapeNote: {
        update: vi.fn(),
        create: vi
          .fn()
          .mockResolvedValue({ id: 'new-note', texte: 'new note', authorId: 'user-1', requeteEtapeId: 'step-1' }),
        delete: vi.fn(),
      },
      uploadedFile: { updateMany: vi.fn(), deleteMany: vi.fn() },
    });

    it('returns null when the step does not exist', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(null);
      const result = await updateProcessingEtape(
        'nope',
        'user-1',
        { nom: 'X', statutId: 'A_FAIRE', notes: [], fileIds: [] },
        logger,
      );
      expect(result).toBeNull();
    });

    it('throws EtapeNotEditableError for a closed step', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce({
        id: 'c',
        type: 'MANUAL',
        statutId: 'CLOTUREE',
        entiteId: 'e1',
        notes: [],
        uploadedFiles: [],
        requete: { createdById: 'a' },
      } as never);
      await expect(
        updateProcessingEtape('c', 'user-1', { nom: 'X', statutId: 'A_FAIRE', notes: [], fileIds: [] }, logger),
      ).rejects.toBeInstanceOf(EtapeNotEditableError);
    });

    it.each([
      {
        label: 'explicit automatic mode without a PDF',
        acknowledgmentSendMode: 'AUTOMATIC',
        uploadedFiles: [],
      },
      {
        label: 'historical automatic send with a system PDF',
        acknowledgmentSendMode: null,
        uploadedFiles: [{ id: 'ar', canDelete: false, filePath: 'AR.pdf', uploadedById: null }],
      },
    ])('rejects updates to an automatic acknowledgment: $label', async ({ acknowledgmentSendMode, uploadedFiles }) => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce({
        id: 'ack',
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        acknowledgmentSendMode,
        entiteId: 'e1',
        requete: { dematSocialId: 123, sirecId: null, thirdPartyAccountId: null },
        notes: [],
        uploadedFiles,
      } as never);

      await expect(
        updateProcessingEtape(
          'ack',
          'user-1',
          { nom: 'X', statutId: 'FAIT', dateRealisation: new Date(), notes: [], fileIds: [] },
          logger,
        ),
      ).rejects.toBeInstanceOf(EtapeNotEditableError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a step update when a newly attached file is not eligible', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce({
        id: 'step-1',
        type: 'MANUAL',
        statutId: 'A_FAIRE',
        entiteId: 'e1',
        notes: [],
        uploadedFiles: [],
      } as never);
      const tx = makeTx();
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);
      vi.mocked(setEtapeFile).mockRejectedValueOnce(new FilesNotOwnedError('FILES_NOT_OWNED'));

      await expect(
        updateProcessingEtape(
          'step-1',
          'user-1',
          { nom: 'X', statutId: 'A_FAIRE', notes: [], fileIds: ['already-attached'] },
          logger,
        ),
      ).rejects.toBeInstanceOf(FilesNotOwnedError);
    });

    it('diffs notes (update/create/delete, protecting system notes) and files', async () => {
      vi.mocked(prisma.requeteEtape.findUnique)
        .mockResolvedValueOnce({
          id: 'step-1',
          type: 'MANUAL',
          statutId: 'A_FAIRE',
          entiteId: 'e1',
          notes: [
            { id: 'keep', authorId: 'u' },
            { id: 'remove', authorId: 'u' },
            { id: 'system', authorId: null },
          ],
          uploadedFiles: [
            { id: 'fA', canDelete: true, filePath: 'a.pdf' },
            { id: 'fB', canDelete: true, filePath: 'b.pdf' },
          ],
          requete: { createdById: 'agent' },
        } as never)
        .mockResolvedValueOnce({ ...requeteEtape, id: 'step-1' });

      const tx = makeTx();
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await updateProcessingEtape(
        'step-1',
        'user-1',
        {
          nom: 'X',
          statutId: 'A_FAIRE',
          estPartagee: false,
          notes: [{ id: 'keep', texte: 'updated' }, { texte: 'new note' }],
          fileIds: ['fA', 'fC'],
        },
        logger,
      );

      expect(tx.requeteEtape.update).toHaveBeenCalledWith({
        where: { id: 'step-1' },
        data: {
          nom: 'X',
          statutId: 'A_FAIRE',
          dateRealisation: null,
          rappelType: null,
          rappelDate: null,
          estPartagee: false,
        },
      });
      expect(tx.requeteEtapeNote.update).toHaveBeenCalledWith({ where: { id: 'keep' }, data: { texte: 'updated' } });
      expect(tx.requeteEtapeNote.create).toHaveBeenCalledTimes(1);
      expect(tx.requeteEtapeNote.delete).toHaveBeenCalledWith({ where: { id: 'remove' } });
      expect(tx.requeteEtapeNote.delete).toHaveBeenCalledTimes(1);
      expect(setEtapeFile).toHaveBeenCalledWith('step-1', ['fC'], 'e1', 'user-1', tx);
      expect(tx.uploadedFile.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['fB'] } } });
      expect(deleteFileFromMinio).toHaveBeenCalledWith('b.pdf');
    });

    it('clears the reminder when the agent selects « Désactivé »', async () => {
      vi.mocked(prisma.requeteEtape.findUnique)
        .mockResolvedValueOnce({
          id: 'step-1',
          type: 'MANUAL',
          statutId: 'A_FAIRE',
          entiteId: 'e1',
          notes: [],
          uploadedFiles: [],
          requete: { createdById: 'agent' },
        } as never)
        .mockResolvedValueOnce({ ...requeteEtape, id: 'step-1' });

      const tx = makeTx();
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);

      await updateProcessingEtape(
        'step-1',
        'user-1',
        { nom: 'X', statutId: 'A_FAIRE', rappelType: null, notes: [], fileIds: [] },
        logger,
      );

      expect(tx.requeteEtape.update).toHaveBeenCalledWith({
        where: { id: 'step-1' },
        data: expect.objectContaining({ rappelType: null, rappelDate: null }),
      });
    });

    it('ACR: locks step fields but still applies notes and file changes, preserving the AR PDF', async () => {
      vi.mocked(prisma.requeteEtape.findUnique)
        .mockResolvedValueOnce({
          id: 'ack',
          type: 'ACKNOWLEDGMENT',
          statutId: 'FAIT',
          entiteId: 'e1',
          notes: [],
          uploadedFiles: [
            { id: 'ar', canDelete: false, filePath: 'ar.pdf' },
            { id: 'old', canDelete: true, filePath: 'old.pdf' },
          ],
          requete: { createdById: null },
        } as never)
        .mockResolvedValueOnce({ ...requeteEtape, id: 'ack' });

      const tx = makeTx();
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await updateProcessingEtape(
        'ack',
        'user-1',
        { nom: 'Changed', statutId: 'A_FAIRE', notes: [{ texte: 'note added' }], fileIds: ['ar', 'new'] },
        logger,
      );

      // Step metadata stays locked (name/status/date untouched)...
      expect(tx.requeteEtape.update).not.toHaveBeenCalled();
      // ...but notes and attachments are applied.
      expect(tx.requeteEtapeNote.create).toHaveBeenCalledTimes(1);
      expect(setEtapeFile).toHaveBeenCalledWith('ack', ['new'], 'e1', 'user-1', tx);
      // The deletable file is removed; the AR PDF (canDelete === false) is preserved.
      expect(tx.uploadedFile.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['old'] } } });
      expect(deleteFileFromMinio).toHaveBeenCalledWith('old.pdf');
      expect(deleteFileFromMinio).not.toHaveBeenCalledWith('ar.pdf');
    });
  });
});
