import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { getRequestEntiteById } from '@/features/requetesEntite/requetesEntite.service';
import { deleteFileFromMinio } from '@/libs/minio';
import { type ChangeLog, prisma, type RequeteState } from '@/libs/prisma';
import {
  addNote,
  addProcessingState,
  deleteNote,
  deleteRequeteState,
  getNoteById,
  getRequeteStateById,
  getRequeteStates,
  updateNote,
  updateRequeteStateStatut,
  updateRequeteStateStepName,
} from './requeteStates.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    requeteState: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    requeteStateNote: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    uploadedFile: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/features/requetesEntite/requetesEntite.service', () => ({
  getRequestEntiteById: vi.fn(),
}));

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('@/libs/minio', () => ({
  deleteFileFromMinio: vi.fn(),
}));

describe('requeteStates.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addProcessingState()', () => {
    it('should add a processing state to a RequeteEntite', async () => {
      vi.mocked(getRequestEntiteById).mockResolvedValueOnce({
        requete: null,
        requetesEntiteStates: [],
        number: 1,
        id: 'requeteEntiteId',
        requeteId: 'requeteId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.requeteState.create).mockResolvedValueOnce({
        id: '1',
        requeteEntiteId: 'requeteEntiteId',
        stepName: 'Processing Step',
        statutId: 'A_FAIRE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await addProcessingState('requeteEntiteId', {
        stepName: 'Processing Step',
      });

      expect(result).toEqual({
        id: '1',
        requeteEntiteId: 'requeteEntiteId',
        stepName: 'Processing Step',
        statutId: 'A_FAIRE',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(prisma.requeteState.create).toHaveBeenCalledWith({
        data: {
          requeteEntiteId: 'requeteEntiteId',
          stepName: 'Processing Step',
          statutId: 'A_FAIRE',
        },
      });
    });

    it('should return null if RequeteEntite does not exist', async () => {
      vi.mocked(getRequestEntiteById).mockResolvedValueOnce(null);

      const result = await addProcessingState('nonExistentRequeteEntiteId', {
        stepName: 'Processing Step',
      });

      expect(result).toBeNull();
      expect(prisma.requeteState.create).not.toHaveBeenCalled();
    });
  });

  describe('getRequeteStates()', () => {
    it('should retrieve RequeteStates for a given RequeteEntite', async () => {
      const mockStates = [
        {
          id: '1',
          requeteEntiteId: 'requeteEntiteId',
          stepName: 'Step 1',
          statutId: 'EN_COURS',
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: [],
        },
      ];

      vi.mocked(prisma.requeteState.findMany).mockResolvedValueOnce(mockStates);
      vi.mocked(prisma.requeteState.count).mockResolvedValueOnce(mockStates.length);

      const result = await getRequeteStates('requeteEntiteId', { offset: 0, limit: 10 });

      expect(result.data).toEqual(mockStates);
      expect(result.total).toBe(mockStates.length);
      expect(prisma.requeteState.findMany).toHaveBeenCalledWith({
        where: { requeteEntiteId: 'requeteEntiteId', stepName: { not: null } },
        select: {
          createdAt: true,
          id: true,
          notes: {
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              author: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
              content: true,
              createdAt: true,
              id: true,
              uploadedFiles: {
                select: {
                  id: true,
                  metadata: true,
                  size: true,
                },
              },
            },
          },
          requeteEntiteId: true,
          statutId: true,
          stepName: true,
          updatedAt: true,
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should retrieve RequeteStates for a given RequeteEntite with no limit', async () => {
      const mockStates = [
        {
          id: '1',
          requeteEntiteId: 'requeteEntiteId',
          stepName: 'Step 1',
          statutId: 'EN_COURS',
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: [
            {
              id: 'n1',
              content: 'note',
              createdAt: new Date(),
              uploadedFiles: [
                {
                  id: 'f1',
                  size: 123,
                  metadata: { originalName: 'rapport.pdf' },
                },
                {
                  id: 'f2',
                  size: 456,
                  metadata: null,
                },
              ],
              author: { prenom: 'Ada', nom: 'Lovelace' },
            },
          ],
        },
      ];

      vi.mocked(prisma.requeteState.findMany).mockResolvedValueOnce(mockStates);
      vi.mocked(prisma.requeteState.count).mockResolvedValueOnce(mockStates.length);

      const result = await getRequeteStates('requeteEntiteId', { offset: 0 });

      const expectedData = [
        {
          ...mockStates[0],
          notes: [
            {
              ...mockStates[0].notes[0],
              uploadedFiles: [
                { id: 'f1', size: 123, originalName: 'rapport.pdf' },
                { id: 'f2', size: 456, originalName: 'Unknown' },
              ],
            },
          ],
        },
      ];

      expect(result.data).toEqual(expectedData);
      expect(result.total).toBe(mockStates.length);
      expect(prisma.requeteState.findMany).toHaveBeenCalledWith({
        where: { requeteEntiteId: 'requeteEntiteId', stepName: { not: null } },
        select: {
          createdAt: true,
          id: true,
          notes: {
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              author: {
                select: {
                  prenom: true,
                  nom: true,
                },
              },
              content: true,
              createdAt: true,
              id: true,
              uploadedFiles: {
                select: {
                  id: true,
                  metadata: true,
                  size: true,
                },
              },
            },
          },
          requeteEntiteId: true,
          statutId: true,
          stepName: true,
          updatedAt: true,
        },
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getRequeteStateById()', () => {
    it('should return a RequeteState by id', async () => {
      const mockState = {
        id: 'state-1',
        requeteEntiteId: 'requeteEntiteId',
        stepName: 'Any step',
        statutId: 'EN_COURS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValueOnce(mockState);

      const result = await getRequeteStateById('state-1');

      expect(result).toEqual({
        id: 'state-1',
        requeteEntiteId: 'requeteEntiteId',
        stepName: 'Any step',
        statutId: 'EN_COURS',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(prisma.requeteState.findUnique).toHaveBeenCalledWith({
        where: { id: 'state-1' },
      });
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.requeteState.findUnique).mockResolvedValueOnce(null);

      const result = await getRequeteStateById('missing');

      expect(result).toBeNull();
      expect(prisma.requeteState.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
      });
    });
  });

  describe('updateRequeteStateStatut()', () => {
    it('should update the statut of a RequeteState', async () => {
      const mockState: RequeteState = {
        id: '1',
        requeteEntiteId: 'requeteEntiteId',
        stepName: 'Step 1',
        statutId: 'A_FAIRE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedState = {
        ...mockState,
        statutId: 'EN_COURS',
        updatedAt: new Date(),
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValueOnce(mockState);
      vi.mocked(prisma.requeteState.update).mockResolvedValueOnce(mockUpdatedState);

      const result = await updateRequeteStateStatut('1', { statutId: 'EN_COURS' });

      expect(result).toEqual(mockUpdatedState);
      expect(prisma.requeteState.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          statutId: 'EN_COURS',
        },
      });
    });

    it('should return null if RequeteState not found', async () => {
      vi.mocked(prisma.requeteState.findUnique).mockResolvedValueOnce(null);

      const result = await updateRequeteStateStatut('999', { statutId: 'EN_COURS' });

      expect(result).toBeNull();
      expect(prisma.requeteState.update).not.toHaveBeenCalled();
    });
  });

  describe('updateRequeteStateStepName()', () => {
    it('should update the stepName of a RequeteState', async () => {
      const mockState: RequeteState = {
        id: '1',
        requeteEntiteId: 'requeteEntiteId',
        stepName: 'Old Step Name',
        statutId: 'EN_COURS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedState = {
        ...mockState,
        stepName: 'New Step Name',
        updatedAt: new Date(),
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValueOnce(mockState);
      vi.mocked(prisma.requeteState.update).mockResolvedValueOnce(mockUpdatedState);

      const result = await updateRequeteStateStepName('1', { stepName: 'New Step Name' });

      expect(result).toEqual(mockUpdatedState);
      expect(prisma.requeteState.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          stepName: 'New Step Name',
        },
      });
    });

    it('should return null if RequeteState not found', async () => {
      vi.mocked(prisma.requeteState.findUnique).mockResolvedValueOnce(null);

      const result = await updateRequeteStateStepName('999', { stepName: 'New Step Name' });

      expect(result).toBeNull();
      expect(prisma.requeteState.update).not.toHaveBeenCalled();
    });
  });

  describe('addNote()', () => {
    it('should create a note linked to a RequeteEntiteState', async () => {
      const now = new Date();
      const mockNote = {
        id: 'note-1',
        content: 'A note',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: now,
        updatedAt: now,
      };

      vi.mocked(prisma.requeteStateNote.create).mockResolvedValueOnce(mockNote);

      const result = await addNote({
        userId: 'user-1',
        content: 'A note',
        requeteEntiteStateId: 'state-1',
        fileIds: [],
      });

      expect(result).toEqual({
        id: 'note-1',
        content: 'A note',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(prisma.requeteStateNote.create).toHaveBeenCalledWith({
        data: {
          authorId: 'user-1',
          content: 'A note',
          requeteEntiteStateId: 'state-1',
          uploadedFiles: {
            connect: [],
          },
        },
      });
    });
  });

  describe('deleteRequeteState()', () => {
    const mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    } as unknown as PinoLogger;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should delete RequeteState with notes and files successfully', async () => {
      const mockRequeteState = {
        id: 'state-1',
        stepName: 'Test Step',
        statutId: 'EN_COURS',
        requeteEntiteId: 'entite-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: [
          {
            id: 'note-1',
            content: 'Test note',
            requeteEntiteStateId: 'state-1',
            authorId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedFiles: [
              {
                id: 'file-1',
                filePath: 'path/to/file1.pdf',
                size: 1024,
                metadata: { originalName: 'file1.pdf' },
                requeteStateNoteId: 'note-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
        declarant: null,
        infoComplementaire: null,
        demarchesEngagees: [],
        victimes: [],
        lieuxIncident: [],
        misEnCauses: [],
        descriptionFaits: [],
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(mockRequeteState);
      vi.mocked(prisma.requeteState.delete).mockResolvedValue({} as RequeteState);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteRequeteState('state-1', mockLogger, 'user-1');

      expect(prisma.requeteState.findUnique).toHaveBeenCalledWith({
        where: { id: 'state-1' },
        include: {
          notes: { include: { uploadedFiles: true } },
          declarant: true,
          infoComplementaire: true,
          demarchesEngagees: true,
          victimes: true,
          lieuxIncident: true,
          misEnCauses: true,
          descriptionFaits: {
            include: {
              motifs: true,
              consequences: true,
              maltraitanceTypes: true,
            },
          },
        },
      });
      expect(prisma.requeteState.delete).toHaveBeenCalledWith({ where: { id: 'state-1' } });
      expect(createChangeLog).toHaveBeenCalledTimes(3); // 1 note + 1 file + 1 requeteState
      expect(deleteFileFromMinio).toHaveBeenCalledWith('path/to/file1.pdf');
    });

    it('should handle RequeteState not found', async () => {
      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(null);

      await deleteRequeteState('non-existent', mockLogger, 'user-1');

      expect(prisma.requeteState.findUnique).toHaveBeenCalled();
      expect(prisma.requeteState.delete).not.toHaveBeenCalled();
    });

    it('should handle RequeteState with no notes', async () => {
      const mockRequeteState = {
        id: 'state-1',
        stepName: 'Test Step',
        statutId: 'EN_COURS',
        requeteEntiteId: 'entite-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: [],
        declarant: null,
        infoComplementaire: null,
        demarchesEngagees: [],
        victimes: [],
        lieuxIncident: [],
        misEnCauses: [],
        descriptionFaits: [],
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(mockRequeteState);
      vi.mocked(prisma.requeteState.delete).mockResolvedValue({} as RequeteState);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);

      await deleteRequeteState('state-1', mockLogger, 'user-1');

      expect(prisma.requeteState.delete).toHaveBeenCalled();
      expect(createChangeLog).toHaveBeenCalledTimes(1);
    });

    it('should handle RequeteState with notes but no files', async () => {
      const mockRequeteState = {
        id: 'state-1',
        stepName: 'Test Step',
        statutId: 'EN_COURS',
        requeteEntiteId: 'entite-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: [
          {
            id: 'note-1',
            content: 'Test note',
            requeteEntiteStateId: 'state-1',
            authorId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedFiles: [],
          },
        ],
        declarant: null,
        infoComplementaire: null,
        demarchesEngagees: [],
        victimes: [],
        lieuxIncident: [],
        misEnCauses: [],
        descriptionFaits: [],
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(mockRequeteState);
      vi.mocked(prisma.requeteState.delete).mockResolvedValue({} as RequeteState);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);

      await deleteRequeteState('state-1', mockLogger, 'user-1');

      expect(prisma.requeteState.delete).toHaveBeenCalled();
      expect(createChangeLog).toHaveBeenCalledTimes(2); // 1 note + 1 requeteState
    });

    it('should handle changelog creation errors gracefully', async () => {
      const mockRequeteState = {
        id: 'state-1',
        stepName: 'Test Step',
        statutId: 'EN_COURS',
        requeteEntiteId: 'entite-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: [
          {
            id: 'note-1',
            content: 'Test note',
            requeteEntiteStateId: 'state-1',
            authorId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedFiles: [
              {
                id: 'file-1',
                filePath: 'path/to/file1.pdf',
                size: 1024,
                metadata: { originalName: 'file1.pdf' },
                requeteStateNoteId: 'note-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
        declarant: null,
        infoComplementaire: null,
        demarchesEngagees: [],
        victimes: [],
        lieuxIncident: [],
        misEnCauses: [],
        descriptionFaits: [],
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(mockRequeteState);
      vi.mocked(prisma.requeteState.delete).mockResolvedValue({} as RequeteState);
      vi.mocked(createChangeLog).mockRejectedValueOnce(new Error('Changelog error'));
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteRequeteState('state-1', mockLogger, 'user-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), noteId: 'note-1' }),
        'Failed to create changelog for note',
      );
    });

    it('should handle MinIO deletion errors gracefully', async () => {
      const mockRequeteState = {
        id: 'state-1',
        stepName: 'Test Step',
        statutId: 'EN_COURS',
        requeteEntiteId: 'entite-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: [
          {
            id: 'note-1',
            content: 'Test note',
            requeteEntiteStateId: 'state-1',
            authorId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedFiles: [
              {
                id: 'file-1',
                filePath: 'path/to/file1.pdf',
                size: 1024,
                metadata: { originalName: 'file1.pdf' },
                requeteStateNoteId: 'note-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
        declarant: null,
        infoComplementaire: null,
        demarchesEngagees: [],
        victimes: [],
        lieuxIncident: [],
        misEnCauses: [],
        descriptionFaits: [],
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(mockRequeteState);
      vi.mocked(prisma.requeteState.delete).mockResolvedValue({} as RequeteState);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockRejectedValueOnce(new Error('MinIO error'));

      await deleteRequeteState('state-1', mockLogger, 'user-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), filePath: 'path/to/file1.pdf' }),
        'Failed to delete MinIO file',
      );
    });

    it('should not create changelogs when changedById is not provided', async () => {
      const mockRequeteState = {
        id: 'state-1',
        stepName: 'Test Step',
        statutId: 'EN_COURS',
        requeteEntiteId: 'entite-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: [
          {
            id: 'note-1',
            content: 'Test note',
            requeteEntiteStateId: 'state-1',
            authorId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedFiles: [
              {
                id: 'file-1',
                filePath: 'path/to/file1.pdf',
                size: 1024,
                metadata: { originalName: 'file1.pdf' },
                requeteStateNoteId: 'note-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
        declarant: null,
        infoComplementaire: null,
        demarchesEngagees: [],
        victimes: [],
        lieuxIncident: [],
        misEnCauses: [],
        descriptionFaits: [],
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(mockRequeteState);
      vi.mocked(prisma.requeteState.delete).mockResolvedValue({} as RequeteState);

      await deleteRequeteState('state-1', mockLogger);

      expect(prisma.requeteState.delete).toHaveBeenCalled();
      expect(createChangeLog).not.toHaveBeenCalled();
    });

    it('should handle multiple notes and files correctly', async () => {
      const mockRequeteState = {
        id: 'state-1',
        stepName: 'Test Step',
        statutId: 'EN_COURS',
        requeteEntiteId: 'entite-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: [
          {
            id: 'note-1',
            content: 'Test note 1',
            requeteEntiteStateId: 'state-1',
            authorId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedFiles: [
              {
                id: 'file-1',
                filePath: 'path/to/file1.pdf',
                size: 1024,
                metadata: { originalName: 'file1.pdf' },
                requeteStateNoteId: 'note-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
          {
            id: 'note-2',
            content: 'Test note 2',
            requeteEntiteStateId: 'state-1',
            authorId: 'user-2',
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedFiles: [
              {
                id: 'file-2',
                filePath: 'path/to/file2.pdf',
                size: 2048,
                metadata: { originalName: 'file2.pdf' },
                requeteStateNoteId: 'note-2',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'file-3',
                filePath: 'path/to/file3.pdf',
                size: 3072,
                metadata: { originalName: 'file3.pdf' },
                requeteStateNoteId: 'note-2',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
        declarant: null,
        infoComplementaire: null,
        demarchesEngagees: [],
        victimes: [],
        lieuxIncident: [],
        misEnCauses: [],
        descriptionFaits: [],
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(mockRequeteState);
      vi.mocked(prisma.requeteState.delete).mockResolvedValue({} as RequeteState);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteRequeteState('state-1', mockLogger, 'user-1');

      expect(createChangeLog).toHaveBeenCalledTimes(6); // 2 notes + 3 files + 1 requeteState
      expect(deleteFileFromMinio).toHaveBeenCalledTimes(3);
    });

    it('should handle RequeteState with all related entities', async () => {
      const mockRequeteState = {
        id: 'state-1',
        stepName: 'Test Step',
        statutId: 'EN_COURS',
        requeteEntiteId: 'entite-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: [
          {
            id: 'note-1',
            content: 'Test note',
            requeteEntiteStateId: 'state-1',
            authorId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedFiles: [
              {
                id: 'file-1',
                filePath: 'path/to/file1.pdf',
                size: 1024,
                metadata: { originalName: 'file1.pdf' },
                requeteStateNoteId: 'note-1',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
        declarant: {
          id: 'declarant-1',
          nom: 'Test Declarant',
          requeteEntiteStateId: 'state-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        infoComplementaire: {
          id: 'info-1',
          contenu: 'Test info',
          requeteEntiteStateId: 'state-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        demarchesEngagees: [
          {
            id: 'demarche-1',
            description: 'Test demarche',
            requeteEntiteStateId: 'state-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        victimes: [
          {
            id: 'victime-1',
            nom: 'Test Victime',
            requeteEntiteStateId: 'state-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        lieuxIncident: [
          {
            id: 'lieu-1',
            adresse: 'Test address',
            requeteEntiteStateId: 'state-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        misEnCauses: [
          {
            id: 'mec-1',
            nom: 'Test MEC',
            requeteEntiteStateId: 'state-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        descriptionFaits: [
          {
            id: 'faits-1',
            description: 'Test description',
            requeteEntiteStateId: 'state-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            motifs: [],
            consequences: [],
            maltraitanceTypes: [],
          },
        ],
      };

      vi.mocked(prisma.requeteState.findUnique).mockResolvedValue(mockRequeteState);
      vi.mocked(prisma.requeteState.delete).mockResolvedValue({} as RequeteState);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteRequeteState('state-1', mockLogger, 'user-1');

      expect(createChangeLog).toHaveBeenCalledTimes(3); // 1 note + 1 file + 1 requeteState (with all entities)
      expect(deleteFileFromMinio).toHaveBeenCalledWith('path/to/file1.pdf');
    });
  });

  describe('getNoteById()', () => {
    it('should return a note by id', async () => {
      const mockNote = {
        id: 'note-1',
        content: 'Test note content',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(mockNote);

      const result = await getNoteById('note-1');

      expect(result).toEqual({
        id: 'note-1',
        content: 'Test note content',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(prisma.requeteStateNote.findUnique).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        include: {
          uploadedFiles: true,
        },
      });
    });

    it('should return null when note not found', async () => {
      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(null);

      const result = await getNoteById('missing');

      expect(result).toBeNull();
      expect(prisma.requeteStateNote.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
        include: {
          uploadedFiles: true,
        },
      });
    });
  });

  describe('updateNote()', () => {
    it('should update the content of a note', async () => {
      const mockUpdatedNote = {
        id: 'note-1',
        content: 'Updated note content',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.requeteStateNote.update).mockResolvedValueOnce(mockUpdatedNote);

      const result = await updateNote('note-1', 'Updated note content');

      expect(result).toEqual({
        id: 'note-1',
        content: 'Updated note content',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(prisma.requeteStateNote.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { content: 'Updated note content' },
      });
    });
  });

  describe('deleteNote()', () => {
    const mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    } as unknown as PinoLogger;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should delete a note with files successfully', async () => {
      const mockNote = {
        id: 'note-1',
        content: 'Test note',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedFiles: [
          {
            id: 'file-1',
            filePath: 'path/to/file1.pdf',
            size: 1024,
            metadata: { originalName: 'file1.pdf' },
            requeteStateNoteId: 'note-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(mockNote);
      vi.mocked(prisma.requeteStateNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(prisma.requeteStateNote.findUnique).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        include: { uploadedFiles: true },
      });
      expect(prisma.requeteStateNote.delete).toHaveBeenCalledWith({ where: { id: 'note-1' } });
      expect(createChangeLog).toHaveBeenCalledTimes(2); // 1 file + 1 note
      expect(deleteFileFromMinio).toHaveBeenCalledWith('path/to/file1.pdf');
    });

    it('should handle note not found', async () => {
      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(null);

      await deleteNote('non-existent', mockLogger, 'user-1');

      expect(prisma.requeteStateNote.findUnique).toHaveBeenCalled();
      expect(prisma.requeteStateNote.delete).not.toHaveBeenCalled();
    });

    it('should handle note with no files', async () => {
      const mockNote = {
        id: 'note-1',
        content: 'Test note',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedFiles: [],
      };

      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(mockNote);
      vi.mocked(prisma.requeteStateNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(prisma.requeteStateNote.delete).toHaveBeenCalled();
      expect(createChangeLog).toHaveBeenCalledTimes(1); // 1 note only
    });

    it('should handle changelog creation errors gracefully', async () => {
      const mockNote = {
        id: 'note-1',
        content: 'Test note',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedFiles: [
          {
            id: 'file-1',
            filePath: 'path/to/file1.pdf',
            size: 1024,
            metadata: { originalName: 'file1.pdf' },
            requeteStateNoteId: 'note-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(mockNote);
      vi.mocked(prisma.requeteStateNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockRejectedValueOnce(new Error('Changelog error'));
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), fileId: 'file-1' }),
        'Failed to create changelog for file',
      );
    });

    it('should handle MinIO deletion errors gracefully', async () => {
      const mockNote = {
        id: 'note-1',
        content: 'Test note',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedFiles: [
          {
            id: 'file-1',
            filePath: 'path/to/file1.pdf',
            size: 1024,
            metadata: { originalName: 'file1.pdf' },
            requeteStateNoteId: 'note-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(mockNote);
      vi.mocked(prisma.requeteStateNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockRejectedValueOnce(new Error('MinIO error'));

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), filePath: 'path/to/file1.pdf' }),
        'Failed to delete MinIO file',
      );
    });

    it('should not create changelogs when changedById is not provided', async () => {
      const mockNote = {
        id: 'note-1',
        content: 'Test note',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedFiles: [
          {
            id: 'file-1',
            filePath: 'path/to/file1.pdf',
            size: 1024,
            metadata: { originalName: 'file1.pdf' },
            requeteStateNoteId: 'note-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(mockNote);
      vi.mocked(prisma.requeteStateNote.delete).mockResolvedValueOnce({} as unknown as never);

      await deleteNote('note-1', mockLogger);

      expect(prisma.requeteStateNote.delete).toHaveBeenCalled();
      expect(createChangeLog).not.toHaveBeenCalled();
    });

    it('should handle multiple files correctly', async () => {
      const mockNote = {
        id: 'note-1',
        content: 'Test note',
        authorId: 'user-1',
        requeteEntiteStateId: 'state-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedFiles: [
          {
            id: 'file-1',
            filePath: 'path/to/file1.pdf',
            size: 1024,
            metadata: { originalName: 'file1.pdf' },
            requeteStateNoteId: 'note-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'file-2',
            filePath: 'path/to/file2.pdf',
            size: 2048,
            metadata: { originalName: 'file2.pdf' },
            requeteStateNoteId: 'note-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.requeteStateNote.findUnique).mockResolvedValueOnce(mockNote);
      vi.mocked(prisma.requeteStateNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(createChangeLog).toHaveBeenCalledTimes(3); // 2 files + 1 note
      expect(deleteFileFromMinio).toHaveBeenCalledTimes(2);
    });
  });
});
