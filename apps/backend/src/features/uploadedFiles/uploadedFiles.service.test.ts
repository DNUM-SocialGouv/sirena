import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { createUploadedFile, deleteUploadedFile, getUploadedFileById, isUserOwner } from './uploadedFiles.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    uploadedFile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../helpers/sse.js', () => ({
  sseEventManager: {
    emitFileStatus: vi.fn(),
  },
}));

const mockedUploadedFile = vi.mocked(prisma.uploadedFile);

const mockUploadedFile = {
  id: 'file1',
  fileName: 'test.pdf',
  filePath: 'uploads/test.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: null,
  entiteId: 'e1',
  status: 'PENDING',
  uploadedById: 'id10',
  requeteEtapeNoteId: '1',
  requeteEtapeId: null,
  requeteId: '1',
  faitSituationId: '1',
  demarchesEngageesId: null,
  canDelete: true,
  scanStatus: 'PENDING',
  sanitizeStatus: 'PENDING',
  safeFilePath: 'path/to/safe/file.pdf',
  scanResult: null,
  processingError: null,
};

describe('uploadedFiles.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUploadedFileById()', () => {
    it('should call findFirst with id and entiteIds filter', async () => {
      mockedUploadedFile.findFirst.mockResolvedValueOnce(mockUploadedFile);

      const result = await getUploadedFileById('file1', ['entite1', 'entite2']);

      expect(mockedUploadedFile.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'file1',
          entiteId: { in: ['entite1', 'entite2'] },
        },
      });

      expect(result).toEqual(mockUploadedFile);
    });

    it('should call findFirst without entiteIds filter when null', async () => {
      mockedUploadedFile.findFirst.mockResolvedValueOnce(mockUploadedFile);

      const result = await getUploadedFileById('file1', null);

      expect(mockedUploadedFile.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'file1',
        },
      });

      expect(result).toEqual(mockUploadedFile);
    });

    it('should return null when uploadedFile not found', async () => {
      mockedUploadedFile.findFirst.mockResolvedValueOnce(null);

      const result = await getUploadedFileById('file1', ['entite1']);

      expect(result).toBeNull();
    });
  });

  describe('createUploadedFile()', () => {
    it('should call create with correct data', async () => {
      mockedUploadedFile.create.mockResolvedValueOnce(mockUploadedFile);

      const uploadedFileData = {
        id: 'test',
        fileName: 'test.pdf',
        filePath: '/uploads/test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        metadata: null,
        entiteId: 'entite1',
        uploadedById: 'user1',
        status: 'PENDING',
        requeteEtapeNoteId: null,
        requeteEtapeId: null,
        requeteId: null,
        faitSituationId: null,
        demarchesEngageesId: null,
        canDelete: true,
      };

      const result = await createUploadedFile(uploadedFileData);

      expect(mockedUploadedFile.create).toHaveBeenCalledWith({
        data: {
          ...uploadedFileData,
          metadata: null,
        },
      });

      expect(result).toEqual(mockUploadedFile);
    });

    it('should handle metadata correctly', async () => {
      mockedUploadedFile.create.mockResolvedValueOnce(mockUploadedFile);

      const uploadedFileData = {
        id: 'test',
        fileName: 'test.pdf',
        filePath: '/uploads/test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        metadata: null,
        entiteId: 'entite1',
        uploadedById: 'user1',
        status: 'PENDING',
        requeteEtapeNoteId: null,
        requeteEtapeId: null,
        requeteId: null,
        faitSituationId: null,
        demarchesEngageesId: null,
        canDelete: true,
      };

      const result = await createUploadedFile(uploadedFileData);

      expect(mockedUploadedFile.create).toHaveBeenCalledWith({
        data: {
          ...uploadedFileData,
          metadata: null,
        },
      });

      expect(result).toEqual(mockUploadedFile);
    });
  });

  describe('deleteUploadedFile()', () => {
    it('should call delete with id', async () => {
      mockedUploadedFile.delete.mockResolvedValueOnce(mockUploadedFile);

      const result = await deleteUploadedFile('file1');

      expect(mockedUploadedFile.delete).toHaveBeenCalledWith({ where: { id: 'file1' } });
      expect(result).toEqual(mockUploadedFile);
    });
  });

  describe('isUserOwner()', () => {
    it('returns true when all files are owned by the user', async () => {
      mockedUploadedFile.count.mockResolvedValueOnce(2);

      const res = await isUserOwner('user1', ['f1', 'f2']);

      expect(mockedUploadedFile.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['f1', 'f2'] },
          uploadedById: 'user1',
        },
      });
      expect(res).toBe(true);
    });

    it('returns false when at least one file is not owned by the user', async () => {
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      const res = await isUserOwner('user1', ['f1', 'f2']);

      expect(mockedUploadedFile.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['f1', 'f2'] },
          uploadedById: 'user1',
        },
      });
      expect(res).toBe(false);
    });
  });
});
