import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SirecFileRow } from './sirecMigration.repository.js';

const {
  fakeLogger,
  mockUploadedFileCreate,
  mockUploadFileToMinio,
  mockAddFileProcessingJob,
  mockGetSirecFileStream,
  mockFetchSirecFiles,
  mockRollback,
} = vi.hoisted(() => ({
  fakeLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  mockUploadedFileCreate: vi.fn(),
  mockUploadFileToMinio: vi.fn(),
  mockAddFileProcessingJob: vi.fn(),
  mockGetSirecFileStream: vi.fn(),
  mockFetchSirecFiles: vi.fn(),
  mockRollback: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => fakeLogger),
}));

vi.mock('@sirena/db', () => ({
  prisma: { uploadedFile: { create: mockUploadedFileCreate } },
  Prisma: {},
}));

vi.mock('../../libs/minio.js', () => ({
  uploadFileToMinio: mockUploadFileToMinio,
}));

vi.mock('../../jobs/queues/fileProcessing.queue.js', () => ({
  addFileProcessingJob: mockAddFileProcessingJob,
}));

vi.mock('./sirecMigration.filesMinio.js', () => ({
  getSirecFileStream: mockGetSirecFileStream,
}));

vi.mock('./sirecMigration.repository.js', () => ({
  fetchSirecFiles: mockFetchSirecFiles,
}));

import { migrateSirecFiles } from './sirecMigration.files.service.js';

const makeFile = (overrides: Partial<SirecFileRow> = {}): SirecFileRow => ({
  id_data: 1,
  sys_creation_date: new Date('2020-05-01'),
  original_name: 'courrier.pdf',
  generated_name: 'a1b2c3.pdf',
  size: 12345,
  hash: 'deadbeef',
  ext: 'pdf',
  content_type: 'application/pdf',
  file_type: null,
  ...overrides,
});

describe('sirecMigration.files.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSirecFileStream.mockResolvedValue({ stream: true });
    mockUploadFileToMinio.mockResolvedValue({
      objectPath: 'uploads/new-uuid.pdf',
      rollback: mockRollback,
      encryptionMetadata: { iv: 'iv', authTag: 'tag' },
    });
    mockUploadedFileCreate.mockResolvedValue({});
    mockAddFileProcessingJob.mockResolvedValue(true);
  });

  it('should do nothing when there are no files to migrate', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([]);

    await migrateSirecFiles(42, 'requete-1');

    expect(mockUploadFileToMinio).not.toHaveBeenCalled();
    expect(fakeLogger.info).not.toHaveBeenCalled();
  });

  it('should migrate a file: fetch from SIREC bucket, upload, create the record and queue processing', async () => {
    const file = makeFile();
    mockFetchSirecFiles.mockResolvedValueOnce([file]);

    await migrateSirecFiles(42, 'requete-1');

    expect(mockGetSirecFileStream).toHaveBeenCalledWith(42, 'a1b2c3.pdf');
    expect(mockUploadFileToMinio).toHaveBeenCalledWith({ stream: true }, 'courrier.pdf', 'application/pdf', 12345);
    expect(mockUploadedFileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'new-uuid',
        fileName: 'new-uuid.pdf',
        filePath: 'uploads/new-uuid.pdf',
        mimeType: 'application/pdf',
        size: 12345,
        createdAt: file.sys_creation_date,
        entiteId: null,
        uploadedById: null,
        requeteId: 'requete-1',
        requeteEtapeId: null,
        faitSituationId: null,
        demarchesEngageesId: null,
        status: 'PENDING',
        canDelete: true,
        metadata: {
          originalName: 'courrier.pdf',
          encryption: { iv: 'iv', authTag: 'tag' },
          sirecFileId: 1,
          sirecGeneratedName: 'a1b2c3.pdf',
          sirecHash: 'deadbeef',
        },
      }),
    });
    expect(mockAddFileProcessingJob).toHaveBeenCalledWith({
      fileId: 'new-uuid',
      fileName: 'new-uuid.pdf',
      filePath: 'uploads/new-uuid.pdf',
      mimeType: 'application/pdf',
    });
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it('should fall back to application/octet-stream when content_type is missing', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ content_type: null })]);

    await migrateSirecFiles(42, 'requete-1');

    expect(mockUploadFileToMinio).toHaveBeenCalledWith(
      { stream: true },
      'courrier.pdf',
      'application/octet-stream',
      12345,
    );
  });

  it('should log a warning and continue when a file fails to migrate', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ id_data: 1 }), makeFile({ id_data: 2 })]);
    mockGetSirecFileStream.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ stream: true });

    await migrateSirecFiles(42, 'requete-1');

    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1, sirecId: 42, requeteId: 'requete-1' }),
      'Failed to migrate SIREC file, skipping',
    );
    expect(mockUploadedFileCreate).toHaveBeenCalledTimes(1);
  });

  it('should rollback the uploaded object and log a warning when the DB record creation fails', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile()]);
    mockUploadedFileCreate.mockRejectedValueOnce(new Error('db down'));

    await migrateSirecFiles(42, 'requete-1');

    expect(mockRollback).toHaveBeenCalled();
    expect(mockAddFileProcessingJob).not.toHaveBeenCalled();
    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1 }),
      'Failed to migrate SIREC file, skipping',
    );
  });
});
