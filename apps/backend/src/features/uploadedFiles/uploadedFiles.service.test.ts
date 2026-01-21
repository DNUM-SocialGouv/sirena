import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import {
  createUploadedFile,
  deleteUploadedFile,
  getUploadedFileById,
  getUploadedFiles,
  isUserOwner,
  setNoteFile,
} from './uploadedFiles.service.js';

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

      const result = await getUploadedFiles(['entite1'], { mimeType: 'application/pdf', fileName: 'file1' });

      expect(mockedUploadedFile.findMany).toHaveBeenCalledWith({
        where: {
          entiteId: { in: ['entite1'] },
          mimeType: 'application/pdf',
          fileName: 'file1',
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
        status: 'PENDING',
        requeteEtapeNoteId: null,
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

  describe('setNoteFile()', () => {
    it('updates files with note + status + entiteId, then returns updated rows', async () => {
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 2 });
      const updatedRows = [
        {
          id: 'f1',
          status: 'COMPLETED',
          entiteId: 'entite1',
          createdAt: new Date(),
          updatedAt: new Date(),
          fileName: 'test.pdf',
          filePath: '/uploads/test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          metadata: { originalName: 'test.pdf' },
          uploadedById: 'user1',
          requeteEtapeNoteId: 'n1',
          requeteId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          canDelete: true,
          scanStatus: 'PENDING',
          sanitizeStatus: 'PENDING',
          safeFilePath: 'path/to/safe/file.pdf',
          scanResult: null,
          processingError: null,
        },
        {
          id: 'f2',
          status: 'COMPLETED',
          entiteId: 'entite1',
          createdAt: new Date(),
          updatedAt: new Date(),
          fileName: 'test2.pdf',
          filePath: '/uploads/test2.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          metadata: { originalName: 'test2.pdf' },
          uploadedById: 'user1',
          requeteEtapeNoteId: 'n1',
          requeteId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          canDelete: true,
          scanStatus: 'PENDING',
          sanitizeStatus: 'PENDING',
          safeFilePath: 'path/to/safe/file.pdf',
          scanResult: null,
          processingError: null,
        },
      ];
      mockedUploadedFile.findMany.mockResolvedValueOnce(updatedRows);

      const res = await setNoteFile('n1', ['f1', 'f2'], 'entite1');

      expect(mockedUploadedFile.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['f1', 'f2'] } },
        data: { requeteEtapeNoteId: 'n1', status: 'COMPLETED', entiteId: 'entite1' },
      });
      expect(mockedUploadedFile.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['f1', 'f2'] } },
      });
      expect(res).toEqual(updatedRows);
    });

    it('sets entiteId to null when not provided', async () => {
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 1 });
      const updatedRows = [
        {
          id: 'f1',
          status: 'COMPLETED',
          entiteId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          fileName: 'test.pdf',
          filePath: '/uploads/test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          metadata: {
            originalName: 'test.pdf',
          },
          uploadedById: ' user1',
          requeteEtapeNoteId: 'n1',
          requeteId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          canDelete: true,
          scanStatus: 'PENDING',
          sanitizeStatus: 'PENDING',
          safeFilePath: 'path/to/safe/file.pdf',
          scanResult: null,
          processingError: null,
        },
      ];
      mockedUploadedFile.findMany.mockResolvedValueOnce(updatedRows);

      const res = await setNoteFile('n1', ['f1']);

      expect(mockedUploadedFile.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['f1'] } },
        data: { requeteEtapeNoteId: 'n1', status: 'COMPLETED', entiteId: null },
      });
      expect(mockedUploadedFile.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['f1'] } },
      });
      expect(res).toEqual(updatedRows);
    });
  });
});
