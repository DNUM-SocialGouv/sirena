import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { createUploadedFile, deleteUploadedFile, getUploadedFileById, getUploadedFiles } from './uploadedFiles.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    uploadedFile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockedUploadedFile = vi.mocked(prisma.uploadedFile);

const mockUploadedFile = {
  id: 'file1',
  fileName: 'test.pdf',
  filePath: '/uploads/test.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: null,
  entiteId: 'entite1',
  uploadedById: 'user1',
};

describe('uploadedFiles.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUploadedFiles()', () => {
    it('should call findMany with correct filters when entiteIds provided', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([mockUploadedFile]);
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      const result = await getUploadedFiles(['entite1', 'entite2'], { limit: 10, search: 'test' });

      expect(mockedUploadedFile.findMany).toHaveBeenCalledWith({
        where: {
          entiteId: { in: ['entite1', 'entite2'] },
          OR: [
            { fileName: { contains: 'test', mode: 'insensitive' } },
            { filePath: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({ data: [mockUploadedFile], total: 1 });
    });

    it('should call findMany with mimeType filter', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([mockUploadedFile]);
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      const result = await getUploadedFiles(['entite1'], { mimeType: 'application/pdf' });

      expect(mockedUploadedFile.findMany).toHaveBeenCalledWith({
        where: {
          entiteId: { in: ['entite1'] },
          mimeType: 'application/pdf',
        },
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({ data: [mockUploadedFile], total: 1 });
    });

    it('should call findMany without entiteIds filter when null', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([mockUploadedFile]);
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      const result = await getUploadedFiles(null, {});

      expect(mockedUploadedFile.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({ data: [mockUploadedFile], total: 1 });
    });

    it('should handle pagination correctly', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([mockUploadedFile]);
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      const result = await getUploadedFiles(['entite1'], { offset: 10, limit: 5 });

      expect(mockedUploadedFile.findMany).toHaveBeenCalledWith({
        where: {
          entiteId: { in: ['entite1'] },
        },
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({ data: [mockUploadedFile], total: 1 });
    });
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
        metadata: { key: 'value' },
        entiteId: 'entite1',
        uploadedById: 'user1',
      };

      const result = await createUploadedFile(uploadedFileData);

      expect(mockedUploadedFile.create).toHaveBeenCalledWith({
        data: {
          id: 'test',
          fileName: 'test.pdf',
          filePath: '/uploads/test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          metadata: { key: 'value' },
          entiteId: 'entite1',
          uploadedById: 'user1',
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
});
