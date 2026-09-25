import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import {
  createUploadedFile,
  deleteFaitFilesRemovedFromSituation,
  deleteUploadedFile,
  FilesNotOwnedError,
  getRequeteEtapeUploadedFile,
  getRequeteMessageUploadedFile,
  getUploadedFileById,
  isUploadedFileAttachedToImmutableAcknowledgment,
  isUserOwner,
  setEtapeFile,
  setFaitFiles,
  setMessageFiles,
  setRequeteFile,
} from './uploadedFiles.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    uploadedFile: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
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
  requeteEtapeId: null,
  requeteId: '1',
  faitSituationId: '1',
  demarchesEngageesId: null,
  requeteMessageId: null,
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
    vi.mocked(prisma.$transaction).mockImplementation((async (cb: (tx: unknown) => unknown) => cb(prisma)) as never);
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

  describe('getRequeteEtapeUploadedFile()', () => {
    it('only returns the requested file when it belongs to the exact processing step', async () => {
      mockedUploadedFile.findFirst.mockResolvedValueOnce(mockUploadedFile);

      const result = await getRequeteEtapeUploadedFile('step1', 'file1');

      expect(mockedUploadedFile.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'file1',
          requeteEtapeId: 'step1',
        },
      });
      expect(result).toEqual(mockUploadedFile);
    });
  });

  describe('getRequeteMessageUploadedFile()', () => {
    it('scopes the file to a message of the requete, whatever the entity that posted it', async () => {
      mockedUploadedFile.findFirst.mockResolvedValueOnce(mockUploadedFile);

      const result = await getRequeteMessageUploadedFile('requete1', 'file1');

      expect(mockedUploadedFile.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'file1',
          requeteMessage: { requeteId: 'requete1' },
        },
      });
      expect(result).toEqual(mockUploadedFile);
    });

    it('returns null when the file is not attached to a message of this requete', async () => {
      mockedUploadedFile.findFirst.mockResolvedValueOnce(null);

      await expect(getRequeteMessageUploadedFile('requete1', 'file1')).resolves.toBeNull();
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
        requeteEtapeId: null,
        requeteId: null,
        faitSituationId: null,
        demarchesEngageesId: null,
        requeteMessageId: null,
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
        requeteEtapeId: null,
        requeteId: null,
        faitSituationId: null,
        demarchesEngageesId: null,
        requeteMessageId: null,
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

  describe('isUploadedFileAttachedToImmutableAcknowledgment()', () => {
    it('recognizes pending and sent automatic acknowledgments, including historical ones', async () => {
      mockedUploadedFile.findFirst.mockResolvedValueOnce({ id: 'file1' } as never);

      await expect(isUploadedFileAttachedToImmutableAcknowledgment('file1')).resolves.toBe(true);
      expect(mockedUploadedFile.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'file1',
          requeteEtape: {
            is: {
              type: 'ACKNOWLEDGMENT',
              OR: [
                { acknowledgmentSendMode: 'AUTOMATIC' },
                {
                  acknowledgmentSendMode: null,
                  requete: {
                    is: {
                      OR: [
                        { dematSocialId: { not: null } },
                        { sirecId: { not: null } },
                        { thirdPartyAccountId: { not: null } },
                      ],
                    },
                  },
                  OR: [
                    { statutId: 'A_FAIRE' },
                    {
                      statutId: 'FAIT',
                      uploadedFiles: { some: { canDelete: false, uploadedById: null } },
                    },
                  ],
                },
              ],
            },
          },
        },
        select: { id: true },
      });
    });
  });

  describe('setEtapeFile()', () => {
    it('only attaches files owned by the user, in the target entity, and not already attached', async () => {
      mockedUploadedFile.findMany
        .mockResolvedValueOnce([{ ...mockUploadedFile, requeteId: null, faitSituationId: null }])
        .mockResolvedValueOnce([
          {
            ...mockUploadedFile,
            requeteId: null,
            faitSituationId: null,
            requeteEtapeId: 'step1',
            status: 'COMPLETED',
          },
        ]);
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 1 });

      await setEtapeFile('step1', ['file1'], 'e1', 'user1', prisma);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(mockedUploadedFile.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['file1'] },
          uploadedById: 'user1',
          entiteId: 'e1',
          requeteId: null,
          requeteEtapeId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          requeteMessageId: null,
        },
        data: { requeteEtapeId: 'step1', status: 'COMPLETED', entiteId: 'e1' },
      });
    });

    it('opens a transaction and rejects the whole attachment when any requested file is ineligible', async () => {
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (tx: unknown) => unknown) => cb(prisma)) as never);
      mockedUploadedFile.findMany.mockResolvedValueOnce([]);
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(setEtapeFile('step1', ['file1', 'file2'], 'e1', 'user1')).rejects.toBeInstanceOf(FilesNotOwnedError);
      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(mockedUploadedFile.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('setMessageFiles()', () => {
    it('only attaches free files owned by the user in the message entity', async () => {
      mockedUploadedFile.findMany
        .mockResolvedValueOnce([{ ...mockUploadedFile, requeteId: null, faitSituationId: null }])
        .mockResolvedValueOnce([
          {
            ...mockUploadedFile,
            requeteId: null,
            faitSituationId: null,
            requeteMessageId: 'message1',
            status: 'COMPLETED',
          },
        ]);
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 1 });

      await setMessageFiles('message1', ['file1'], 'e1', 'user1', prisma);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(mockedUploadedFile.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['file1'] },
          uploadedById: 'user1',
          entiteId: 'e1',
          requeteId: null,
          requeteEtapeId: null,
          faitSituationId: null,
          demarchesEngageesId: null,
          requeteMessageId: null,
        },
        data: { requeteMessageId: 'message1', status: 'COMPLETED', entiteId: 'e1' },
      });
    });

    it('rejects the whole attachment when at least one file is ineligible', async () => {
      vi.mocked(prisma.$transaction).mockImplementation((async (cb: (tx: unknown) => unknown) => cb(prisma)) as never);
      // The first findMany is the changelog snapshot taken before the update, not the attachment itself.
      mockedUploadedFile.findMany.mockResolvedValueOnce([{ id: 'file1' }] as never);
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(setMessageFiles('message1', ['file1', 'file2'], 'e1', 'user1')).rejects.toBeInstanceOf(
        FilesNotOwnedError,
      );
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });
  });

  describe('discussion attachment immutability', () => {
    it('never lets another relation claim a file attached to a discussion message', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 0 });

      await setFaitFiles('situation1', ['file1'], 'e1', 'user1');

      expect(mockedUploadedFile.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ requeteMessageId: null }) }),
      );
    });

    it('raises FilesNotOwnedError when the blocked file is a discussion attachment', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 0 });
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      await expect(setRequeteFile('REQ-C', ['file1'], 'e1', 'user1')).rejects.toBeInstanceOf(FilesNotOwnedError);
    });

    it('still tolerates a missing id when no discussion attachment is involved', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 0 });
      mockedUploadedFile.count.mockResolvedValueOnce(0);

      await expect(setRequeteFile('REQ-C', ['unknown'], 'e1', 'user1')).resolves.toEqual([]);
    });

    it('rolls the whole batch back when one file of a requete is already attached to a message', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockedUploadedFile.updateMany.mockResolvedValueOnce({ count: 1 });
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      await expect(setRequeteFile('REQ-C', ['free', 'attached'], 'e1', 'user1')).rejects.toBeInstanceOf(
        FilesNotOwnedError,
      );

      // The free file was moved before the refusal: without a transaction that row would have stayed.
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('excludes discussion attachments from the situation file cleanup', async () => {
      mockedUploadedFile.findMany.mockResolvedValueOnce([]);

      await deleteFaitFilesRemovedFromSituation('situation1', ['keep1'], 'e1', undefined, prisma);

      expect(mockedUploadedFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ requeteMessageId: null }) }),
      );
    });
  });

  describe('changelog of an attachment', () => {
    it('writes the changelog with the transaction that moved the file', async () => {
      // mockReset: the once-queues of the previous tests survive vi.clearAllMocks().
      mockedUploadedFile.findMany.mockReset().mockResolvedValue([{ id: 'file1' }] as never);
      mockedUploadedFile.updateMany.mockReset().mockResolvedValue({ count: 1 } as never);

      await setMessageFiles('message1', ['file1'], 'e1', 'user1', prisma);

      // Second argument: without it the changelog row would be written outside the transaction.
      expect(createChangeLog).toHaveBeenCalledWith(expect.objectContaining({ entity: 'UploadedFile' }), prisma);
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
          requeteMessageId: null,
        },
      });
      expect(res).toBe(true);
    });

    it('refuses a file already attached to a discussion message, before anything is written', async () => {
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      const res = await isUserOwner('user1', ['f1', 'attached-to-a-message']);

      expect(mockedUploadedFile.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['f1', 'attached-to-a-message'] },
          uploadedById: 'user1',
          requeteMessageId: null,
        },
      });
      expect(res).toBe(false);
    });

    it('returns false when at least one file is not owned by the user', async () => {
      mockedUploadedFile.count.mockResolvedValueOnce(1);

      const res = await isUserOwner('user1', ['f1', 'f2']);

      expect(mockedUploadedFile.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['f1', 'f2'] },
          uploadedById: 'user1',
          requeteMessageId: null,
        },
      });
      expect(res).toBe(false);
    });
  });
});
