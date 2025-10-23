import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { deleteFileFromMinio } from '@/libs/minio';
import {
  type ChangeLog,
  prisma,
  type Requete,
  type RequeteEntite,
  type RequeteEtape,
  type RequeteEtapeNote,
  type UploadedFile,
} from '@/libs/prisma';
import {
  addProcessingEtape,
  deleteRequeteEtape,
  getRequeteEtapeById,
  getRequeteEtapes,
  updateRequeteEtapeNom,
  updateRequeteEtapeStatut,
} from './requetesEtapes.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    requete: {
      findUnique: vi.fn(),
    },
    requeteEntite: {
      upsert: vi.fn(),
    },
    requeteEtape: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    uploadedFile: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('@/libs/minio', () => ({
  deleteFileFromMinio: vi.fn(),
}));

const requeteEtape: RequeteEtape = {
  id: 'requeteEtapeId',
  requeteId: 'requeteId',
  entiteId: 'entiteId',
  nom: 'Etape 1',
  estPartagee: false,
  statutId: 'A_FAIRE',
  createdAt: new Date(),
  updatedAt: new Date(),
  clotureReasonId: null,
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

const requeteEntite: RequeteEntite & { requete: Requete } & { requeteEtape: RequeteEtape[] } = {
  entiteId: 'entiteId',
  requeteId: 'requeteId',
  requete: {
    id: 'requeteId',
    commentaire: 'Commentaire',
    receptionDate: new Date(),
    dematSocialId: 123,
    receptionTypeId: 'receptionTypeId',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  requeteEtape: [],
};

describe('RequeteEtapes.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addProcessingEtape()', () => {
    it('should add a processing etape when requete exists', async () => {
      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce({
        id: 'requeteId',
        commentaire: 'Test',
        receptionDate: new Date(),
        dematSocialId: 123,
        receptionTypeId: 'type',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.requeteEntite.upsert).mockResolvedValueOnce(requeteEntite);
      vi.mocked(prisma.requeteEtape.create).mockResolvedValueOnce(requeteEtape);

      const result = await addProcessingEtape('requeteId', ['entiteId'], {
        nom: requeteEtape.nom,
      });

      expect(result).toEqual(requeteEtape);
      expect(prisma.requete.findUnique).toHaveBeenCalledWith({
        where: { id: 'requeteId' },
      });
      expect(prisma.requeteEntite.upsert).toHaveBeenCalledWith({
        where: {
          requeteId_entiteId: {
            requeteId: 'requeteId',
            entiteId: 'entiteId',
          },
        },
        create: {
          requeteId: 'requeteId',
          entiteId: 'entiteId',
        },
        update: {},
      });
      expect(prisma.requeteEtape.create).toHaveBeenCalledWith({
        data: {
          requeteId: requeteEtape.requeteId,
          entiteId: requeteEtape.entiteId,
          nom: requeteEtape.nom,
          statutId: requeteEtape.statutId,
        },
      });
    });

    it('should return null if requete does not exist', async () => {
      vi.mocked(prisma.requete.findUnique).mockResolvedValueOnce(null);

      const result = await addProcessingEtape('nonExistentRequeteId', ['entiteId'], {
        nom: 'Processing Etape',
      });

      expect(result).toBeNull();
      expect(prisma.requeteEntite.upsert).not.toHaveBeenCalled();
      expect(prisma.requeteEtape.create).not.toHaveBeenCalled();
    });
  });

  describe('getRequeteEtapes()', () => {
    it('should retrieve RequeteEtapes for a given RequeteEntite', async () => {
      vi.mocked(prisma.requeteEtape.findMany).mockResolvedValueOnce([requeteEtapeWithNotesAndFiles]);
      vi.mocked(prisma.requeteEtape.count).mockResolvedValueOnce(1);

      const result = await getRequeteEtapes('requeteId', ['entiteId'], { offset: 0, limit: 10 });

      expect(result.data).toEqual([requeteEtapeWithNotesAndFiles]);
      expect(result.total).toBe(1);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith({
        where: { requeteId: 'requeteId', entiteId: 'entiteId' },
        select: {
          id: true,
          nom: true,
          statutId: true,
          createdAt: true,
          updatedAt: true,
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

      const result = await getRequeteEtapes('requeteId', ['entiteId'], { offset: 0 });

      expect(result.data).toEqual([requeteEtapeWithNotesAndFiles]);
      expect(result.total).toBe(1);
      expect(prisma.requeteEtape.findMany).toHaveBeenCalledWith({
        where: { requeteId: 'requeteId', entiteId: 'entiteId' },
        select: {
          id: true,
          nom: true,
          statutId: true,
          createdAt: true,
          updatedAt: true,
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
          requeteId: true,
          entiteId: true,
        },
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
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
});
