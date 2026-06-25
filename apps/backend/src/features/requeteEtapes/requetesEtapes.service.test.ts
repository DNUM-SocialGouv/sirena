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
import { isUserOwner, setEtapeFile } from '../uploadedFiles/uploadedFiles.service.js';
import {
  createDefaultRequeteEtapes,
  createProcessingEtape,
  deleteRequeteEtape,
  EtapeNotEditableError,
  FilesNotOwnedError,
  getEtapeEditability,
  getRequeteEtapeById,
  getRequeteEtapes,
  updateProcessingEtape,
  updateRequeteEtapeNom,
  updateRequeteEtapeStatut,
} from './requetesEtapes.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    requete: {
      findUnique: vi.fn(),
    },
    requeteEntite: {
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

vi.mock('../../libs/minio.js', () => ({
  deleteFileFromMinio: vi.fn(),
}));

vi.mock('../uploadedFiles/uploadedFiles.service.js', () => ({
  isUserOwner: vi.fn(() => Promise.resolve(true)),
  setEtapeFile: vi.fn(() => Promise.resolve([])),
}));

const requeteEtape: RequeteEtape = {
  id: 'requeteEtapeId',
  requeteId: 'requeteId',
  entiteId: 'entiteId',
  nom: 'Etape 1',
  type: 'MANUAL',
  estPartagee: false,
  dateRealisation: null,
  statutId: 'A_FAIRE',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: null,
  clotureEffectiveDate: null,
};

const uploadedFile: Pick<UploadedFile, 'id' | 'size' | 'metadata' | 'filePath'> = {
  id: 'uploadedFileId',
  size: 1024,
  metadata: null,
  filePath: 'path/to/file1.pdf',
};

const requeteEtapeWithNotesAndFiles: RequeteEtape & {
  notes: (RequeteEtapeNote & { uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[] })[];
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
      uploadedFiles: [uploadedFile],
    },
  ],
};

const _requeteEntite: RequeteEntite & { requete: Requete } & { requeteEtape: RequeteEtape[] } = {
  entiteId: 'entiteId',
  requeteId: 'requeteId',
  statutId: 'EN_COURS',
  prioriteId: null,
  requete: {
    id: 'requeteId',
    commentaire: 'Commentaire',
    receptionDate: new Date(),
    dateDemandeDeclarant: null,
    dematSocialId: 123,
    sirecId: null,
    receptionTypeId: 'receptionTypeId',
    createdById: null,
    provenanceId: null,
    provenancePrecision: null,
    thirdPartyAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  requeteEtape: [],
};

describe('RequeteEtapes.service.ts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        dateRealisation: null,
        statutId: 'A_FAIRE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
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
        }),
      });

      expect(prisma.requeteEtape.create).toHaveBeenNthCalledWith(2, {
        data: {
          requeteId,
          entiteId,
          statutId: 'A_FAIRE',
          nom: "Envoi de l'accusé de réception",
          type: 'ACKNOWLEDGMENT',
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
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: currentDate,
        updatedAt: currentDate,
        createdById: null,
        clotureEffectiveDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        dateRealisation: null,
        statutId: 'A_FAIRE',
        createdAt: currentDate,
        updatedAt: currentDate,
        createdById: null,
        clotureEffectiveDate: null,
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
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        dateRealisation: null,
        statutId: 'A_FAIRE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
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
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
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
        dateRealisation: null,
        statutId: 'FAIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
      };

      const mockEtape2: RequeteEtape = {
        id: 'etape2Id',
        requeteId,
        entiteId,
        nom: "Envoi de l'accusé de réception",
        type: 'ACKNOWLEDGMENT',
        estPartagee: false,
        dateRealisation: null,
        statutId: 'A_FAIRE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        clotureEffectiveDate: null,
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

      expect(result.data).toEqual([{ ...requeteEtapeWithNotesAndFiles, editable: true, ackNotesOnly: false }]);
      expect(result.total).toBe(1);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith({
        where: { requeteId: 'requeteId', entiteId: 'entiteId' },
        select: {
          id: true,
          nom: true,
          type: true,
          statutId: true,
          clotureEffectiveDate: true,
          dateRealisation: true,
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
              uploadedFiles: {
                select: {
                  id: true,
                  size: true,
                  metadata: true,
                  status: true,
                  scanStatus: true,
                  sanitizeStatus: true,
                  safeFilePath: true,
                },
              },
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
              size: true,
              metadata: true,
              status: true,
              scanStatus: true,
              sanitizeStatus: true,
              safeFilePath: true,
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
              createdById: true,
              createdBy: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
              dematSocialId: true,
              thirdPartyAccountId: true,
            },
          },
          requeteId: true,
          entiteId: true,
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

      expect(result.data).toEqual([{ ...requeteEtapeWithNotesAndFiles, editable: true, ackNotesOnly: false }]);
      expect(result.total).toBe(1);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith({
        where: { requeteId: 'requeteId', entiteId: 'entiteId' },
        select: {
          id: true,
          nom: true,
          type: true,
          statutId: true,
          clotureEffectiveDate: true,
          dateRealisation: true,
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
              uploadedFiles: {
                select: {
                  id: true,
                  size: true,
                  metadata: true,
                  status: true,
                  scanStatus: true,
                  sanitizeStatus: true,
                  safeFilePath: true,
                },
              },
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
              size: true,
              metadata: true,
              status: true,
              scanStatus: true,
              sanitizeStatus: true,
              safeFilePath: true,
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
              createdById: true,
              createdBy: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
              dematSocialId: true,
              thirdPartyAccountId: true,
            },
          },
          requeteId: true,
          entiteId: true,
        },
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should expose editability flags per step type', async () => {
      const closedEtape = {
        ...requeteEtape,
        type: 'MANUAL',
        statutId: 'CLOTUREE',
        notes: [],
        uploadedFiles: [],
        requete: { createdById: 'agent-1' },
      };
      const autoAckEtape = {
        ...requeteEtape,
        id: 'ackEtapeId',
        type: 'ACKNOWLEDGMENT',
        statutId: 'FAIT',
        notes: [],
        uploadedFiles: [],
        requete: { createdById: null },
      };
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([closedEtape, autoAckEtape]);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(2);

      const result = await getRequeteEtapes('requeteId', 'entiteId', { offset: 0 });

      expect(result.data[0]).toMatchObject({ editable: false, ackNotesOnly: false });
      expect(result.data[1]).toMatchObject({ editable: true, ackNotesOnly: true });
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

  describe('updateRequeteEtapeStatut()', () => {
    it('should update the statut of a RequeteEtape', async () => {
      const mockEtape = {
        ...requeteEtape,
      };

      const mockUpdatedEtape = {
        ...mockEtape,
        statutId: 'EN_COURS',
        updatedAt: new Date(),
      };

      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(mockEtape);
      vi.mocked(prisma.requeteEtape.update).mockResolvedValueOnce(mockUpdatedEtape);

      const result = await updateRequeteEtapeStatut('1', { statutId: 'EN_COURS' });

      expect(result).toEqual(mockUpdatedEtape);
      expect(prisma.requeteEtape.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          statutId: 'EN_COURS',
          dateRealisation: null,
        },
      });
    });

    it('should return null if RequeteEtape not found', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(null);

      const result = await updateRequeteEtapeStatut('999', { statutId: 'EN_COURS' });

      expect(result).toBeNull();
      expect(prisma.requeteEtape.update).not.toHaveBeenCalled();
    });
  });

  describe('updateRequeteEtapeNom()', () => {
    it('should update the nom of a RequeteEtape', async () => {
      const mockEtape = {
        ...requeteEtape,
      };

      const mockUpdatedEtape = {
        ...mockEtape,
        nom: 'New Nom',
        updatedAt: new Date(),
      };

      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(mockEtape);
      vi.mocked(prisma.requeteEtape.update).mockResolvedValueOnce(mockUpdatedEtape);

      const result = await updateRequeteEtapeNom('1', { nom: 'New Etape Name' });

      expect(result).toEqual(mockUpdatedEtape);
      expect(prisma.requeteEtape.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          nom: 'New Etape Name',
        },
      });
    });

    it('should return null if RequeteEtape not found', async () => {
      vi.mocked(prisma.requeteEtape.findUnique).mockResolvedValueOnce(null);

      const result = await updateRequeteEtapeNom('999', { nom: 'New Etape Name' });

      expect(result).toBeNull();
      expect(prisma.requeteEtape.update).not.toHaveBeenCalled();
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
          notes: { include: { uploadedFiles: true } },
        },
      });
      expect(prisma.requeteEtape.delete).toHaveBeenCalledWith({ where: { id: requeteEtapeWithNotesAndFiles.id } });
      expect(createChangeLog).toHaveBeenCalledTimes(2);
      expect(deleteFileFromMinio).toHaveBeenCalledWith('path/to/file1.pdf');
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
            uploadedFiles: [],
          },
        ],
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

  describe('getEtapeEditability', () => {
    it('MANUAL step is fully editable', () => {
      expect(getEtapeEditability({ type: 'MANUAL', statutId: 'A_FAIRE', requete: { createdById: 'agent-1' } })).toEqual(
        {
          editable: true,
          ackNotesOnly: false,
        },
      );
    });

    it('CLOTUREE step is not editable', () => {
      expect(getEtapeEditability({ type: 'MANUAL', statutId: 'CLOTUREE', requete: { createdById: 'a' } })).toEqual({
        editable: false,
        ackNotesOnly: false,
      });
    });

    it('CREATION and REOPEN steps are not editable', () => {
      expect(getEtapeEditability({ type: 'CREATION', statutId: 'FAIT', requete: { createdById: null } }).editable).toBe(
        false,
      );
      expect(getEtapeEditability({ type: 'REOPEN', statutId: 'FAIT', requete: { createdById: 'a' } }).editable).toBe(
        false,
      );
    });

    it('automatic ACR (requete without createdById) is notes-only', () => {
      expect(getEtapeEditability({ type: 'ACKNOWLEDGMENT', statutId: 'FAIT', requete: { createdById: null } })).toEqual(
        {
          editable: true,
          ackNotesOnly: true,
        },
      );
      // even before being marked FAIT, an automatic ACR stays notes-only
      expect(
        getEtapeEditability({ type: 'ACKNOWLEDGMENT', statutId: 'A_FAIRE', requete: { createdById: null } }),
      ).toEqual({ editable: true, ackNotesOnly: true });
    });

    it('manual ACR is always notes-only', () => {
      // sent
      expect(
        getEtapeEditability({ type: 'ACKNOWLEDGMENT', statutId: 'FAIT', requete: { createdById: 'agent-1' } }),
      ).toEqual({ editable: true, ackNotesOnly: true });
      // not yet sent
      expect(
        getEtapeEditability({ type: 'ACKNOWLEDGMENT', statutId: 'A_FAIRE', requete: { createdById: 'agent-1' } }),
      ).toEqual({ editable: true, ackNotesOnly: true });
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
      vi.mocked(isUserOwner).mockResolvedValue(true);
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
        },
        logger,
      );

      expect(result).toEqual(createdEtape);
      expect(tx.requeteEtape.create).toHaveBeenCalledTimes(1);
      expect(tx.requeteEtapeNote.create).toHaveBeenCalledTimes(1);
      expect(setEtapeFile).toHaveBeenCalledWith('new-step', ['file-1'], 'e1', 'user-1', tx);
    });

    it('throws FilesNotOwnedError when the user does not own the files', async () => {
      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({ id: 'req-1' } as Requete);
      vi.mocked(prisma.requeteEntite.upsert).mockResolvedValueOnce({} as RequeteEntite);
      vi.mocked(isUserOwner).mockResolvedValue(false);

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
      vi.mocked(isUserOwner).mockResolvedValue(true);
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await updateProcessingEtape(
        'step-1',
        'user-1',
        {
          nom: 'X',
          statutId: 'A_FAIRE',
          notes: [{ id: 'keep', texte: 'updated' }, { texte: 'new note' }],
          fileIds: ['fA', 'fC'],
        },
        logger,
      );

      expect(tx.requeteEtape.update).toHaveBeenCalledTimes(1);
      expect(tx.requeteEtapeNote.update).toHaveBeenCalledWith({ where: { id: 'keep' }, data: { texte: 'updated' } });
      expect(tx.requeteEtapeNote.create).toHaveBeenCalledTimes(1);
      expect(tx.requeteEtapeNote.delete).toHaveBeenCalledWith({ where: { id: 'remove' } });
      expect(tx.requeteEtapeNote.delete).toHaveBeenCalledTimes(1);
      expect(setEtapeFile).toHaveBeenCalledWith('step-1', ['fC'], 'e1', 'user-1', tx);
      expect(tx.uploadedFile.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['fB'] } } });
      expect(deleteFileFromMinio).toHaveBeenCalledWith('b.pdf');
    });

    it('automatic ACR: applies notes only, leaves fields and files untouched', async () => {
      vi.mocked(prisma.requeteEtape.findUnique)
        .mockResolvedValueOnce({
          id: 'ack',
          type: 'ACKNOWLEDGMENT',
          statutId: 'FAIT',
          entiteId: 'e1',
          notes: [],
          uploadedFiles: [{ id: 'ar', canDelete: false, filePath: 'ar.pdf' }],
          requete: { createdById: null },
        } as never)
        .mockResolvedValueOnce({ ...requeteEtape, id: 'ack' });

      const tx = makeTx();
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (t: unknown) => unknown) => cb(tx)) as never);

      await updateProcessingEtape(
        'ack',
        'user-1',
        { nom: 'Changed', statutId: 'A_FAIRE', notes: [{ texte: 'note added' }], fileIds: [] },
        logger,
      );

      expect(tx.requeteEtape.update).not.toHaveBeenCalled();
      expect(tx.requeteEtapeNote.create).toHaveBeenCalledTimes(1);
      expect(tx.uploadedFile.deleteMany).not.toHaveBeenCalled();
      expect(tx.uploadedFile.updateMany).not.toHaveBeenCalled();
    });
  });
});
