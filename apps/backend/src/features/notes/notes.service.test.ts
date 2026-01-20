import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFileFromMinio } from '../../libs/minio.js';
import { type ChangeLog, prisma, type UploadedFile } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { addNote, deleteNote, getNoteById, updateNote } from './notes.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    requeteEtapeNote: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('../../libs/minio.js', () => ({
  deleteFileFromMinio: vi.fn(),
}));

const note = {
  id: 'noteId',
  texte: 'Note 1',
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: 'authorId',
  requeteEtapeId: 'requeteEtapeId',
};

const uploadedFile: Pick<UploadedFile, 'id' | 'size' | 'metadata' | 'filePath'> = {
  id: 'uploadedFileId',
  size: 1024,
  metadata: null,
  filePath: 'path/to/file1.pdf',
};

describe('notes.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addNote()', () => {
    it('should create a note linked to a RequeteEntiteEtape', async () => {
      vi.mocked(prisma.requeteEtapeNote.create).mockResolvedValueOnce(note);

      const result = await addNote({
        requeteEtapeId: note.requeteEtapeId,
        texte: note.texte,
        userId: note.authorId,
        fileIds: [],
      });

      expect(result).toEqual({
        id: note.id,
        texte: note.texte,
        authorId: note.authorId,
        requeteEtapeId: note.requeteEtapeId,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(prisma.requeteEtapeNote.create).toHaveBeenCalledWith({
        data: {
          authorId: note.authorId,
          texte: note.texte,
          requeteEtapeId: note.requeteEtapeId,
          uploadedFiles: {
            connect: [],
          },
        },
      });
    });
  });

  describe('getNoteById()', () => {
    it('should return a note by id', async () => {
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce({
        ...note,
        uploadedFiles: [uploadedFile],
      } as typeof note & { uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[] });

      const result = await getNoteById(note.id);

      expect(result).toEqual({ ...note, uploadedFiles: [uploadedFile] });
      expect(prisma.requeteEtapeNote.findUnique).toHaveBeenCalledWith({
        where: { id: note.id },
        include: {
          uploadedFiles: true,
        },
      });
    });

    it('should return null when note not found', async () => {
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce(null);

      const result = await getNoteById('missing');

      expect(result).toBeNull();
      expect(prisma.requeteEtapeNote.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
        include: {
          uploadedFiles: true,
        },
      });
    });
  });

  describe('updateNote()', () => {
    it('should update the content of a note', async () => {
      vi.mocked(prisma.requeteEtapeNote.update).mockResolvedValueOnce(note);

      const result = await updateNote(note.id, note.texte);

      expect(result).toEqual({ ...note, texte: note.texte });
      expect(prisma.requeteEtapeNote.update).toHaveBeenCalledWith({
        where: { id: note.id },
        data: { texte: note.texte },
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
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce({
        ...note,
        uploadedFiles: [uploadedFile],
      } as typeof note & { uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[] });
      vi.mocked(prisma.requeteEtapeNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(prisma.requeteEtapeNote.findUnique).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        include: { uploadedFiles: true },
      });
      expect(prisma.requeteEtapeNote.delete).toHaveBeenCalledWith({ where: { id: 'note-1' } });
      expect(createChangeLog).toHaveBeenCalledTimes(2); // 1 file + 1 note
      expect(deleteFileFromMinio).toHaveBeenCalledWith('path/to/file1.pdf');
    });

    it('should handle note not found', async () => {
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce(null);

      await deleteNote('non-existent', mockLogger, 'user-1');

      expect(prisma.requeteEtapeNote.findUnique).toHaveBeenCalled();
      expect(prisma.requeteEtapeNote.delete).not.toHaveBeenCalled();
    });

    it('should handle note with no files', async () => {
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce({
        ...note,
        uploadedFiles: [],
      } as typeof note & { uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[] });
      vi.mocked(prisma.requeteEtapeNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(prisma.requeteEtapeNote.delete).toHaveBeenCalled();
      expect(createChangeLog).toHaveBeenCalledTimes(1); // 1 note
    });

    it('should handle changelog creation errors gracefully', async () => {
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce({
        ...note,
        uploadedFiles: [uploadedFile],
      } as typeof note & { uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[] });
      vi.mocked(prisma.requeteEtapeNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockRejectedValueOnce(new Error('Changelog error'));
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteNote(note.id, mockLogger, 'user-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), fileId: uploadedFile.id }),
        'Failed to create changelog for file',
      );
    });

    it('should handle MinIO deletion errors gracefully', async () => {
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce({
        ...note,
        uploadedFiles: [uploadedFile],
      } as typeof note & { uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[] });
      vi.mocked(prisma.requeteEtapeNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockRejectedValueOnce(new Error('MinIO error'));

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), filePath: 'path/to/file1.pdf' }),
        'Failed to delete MinIO file',
      );
    });

    it('should not create changelogs when changedById is not provided', async () => {
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce({
        ...note,
        uploadedFiles: [uploadedFile],
      } as typeof note & { uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[] });
      vi.mocked(prisma.requeteEtapeNote.delete).mockResolvedValueOnce({} as unknown as never);

      await deleteNote('note-1', mockLogger);

      expect(prisma.requeteEtapeNote.delete).toHaveBeenCalled();
      expect(createChangeLog).not.toHaveBeenCalled();
    });

    it('should handle multiple files correctly', async () => {
      vi.mocked(prisma.requeteEtapeNote.findUnique).mockResolvedValueOnce({
        ...note,
        uploadedFiles: [uploadedFile],
      } as typeof note & { uploadedFiles: Pick<UploadedFile, 'id' | 'size' | 'metadata'>[] });
      vi.mocked(prisma.requeteEtapeNote.delete).mockResolvedValueOnce({} as unknown as never);
      vi.mocked(createChangeLog).mockResolvedValue({} as unknown as ChangeLog);
      vi.mocked(deleteFileFromMinio).mockResolvedValue();

      await deleteNote('note-1', mockLogger, 'user-1');

      expect(createChangeLog).toHaveBeenCalledTimes(2); // 1 files + 1 note
      expect(deleteFileFromMinio).toHaveBeenCalledTimes(1);
    });
  });
});
