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
  date_creation: new Date('2020-05-01'),
  original_name: 'courrier.pdf',
  generated_name: 'a1b2c3.pdf',
  size: 12345,
  hash: 'deadbeef',
  ext: 'pdf',
  content_type: 'application/pdf',
  file_type: null,
  id_ext_mc: null,
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

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

    expect(mockUploadFileToMinio).not.toHaveBeenCalled();
    expect(fakeLogger.info).not.toHaveBeenCalled();
  });

  it('should migrate a file directly attached to the requete (null file_type)', async () => {
    const file = makeFile();
    mockFetchSirecFiles.mockResolvedValueOnce([file]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

    expect(mockGetSirecFileStream).toHaveBeenCalledWith(42, 'a1b2c3.pdf', undefined);
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

  it.each(['hors_process', 'fiche_synthese'])(
    'should migrate a file with file_type %s directly attached to the requete',
    async (fileType) => {
      mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: fileType })]);

      await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

      expect(mockUploadedFileCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ requeteId: 'requete-1', requeteEtapeId: null }),
      });
      expect(fakeLogger.warn).not.toHaveBeenCalled();
    },
  );

  it('should attach a file to the matching étape when its file_type is a known étape key', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'mesures_prises' })]);
    const etapeIdsByFileType = new Map([['mesures_prises', ['etape-1']]]);

    await migrateSirecFiles(42, 'requete-1', etapeIdsByFileType, new Map(), []);

    expect(mockUploadedFileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ requeteId: null, requeteEtapeId: 'etape-1' }),
    });
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it('should attach a file to every matching étape when several ARS entités created one each', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'ar_requerant' })]);
    const etapeIdsByFileType = new Map([['ar_requerant', ['etape-ars1', 'etape-ars2']]]);

    await migrateSirecFiles(42, 'requete-1', etapeIdsByFileType, new Map(), []);

    expect(mockUploadedFileCreate).toHaveBeenCalledTimes(2);
    expect(mockUploadedFileCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ requeteId: null, requeteEtapeId: 'etape-ars1' }),
    });
    expect(mockUploadedFileCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ requeteId: null, requeteEtapeId: 'etape-ars2' }),
    });
    expect(mockAddFileProcessingJob).toHaveBeenCalledTimes(2);
  });

  it.each(['main_courante_flag', 'main_courante'])(
    'should attach a file with file_type %s to the étape matching id_ext_mc',
    async (fileType) => {
      mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: fileType, id_ext_mc: 7 })]);
      const etapeIdsByMainCouranteId = new Map([[7, ['etape-mc-1']]]);

      await migrateSirecFiles(42, 'requete-1', new Map(), etapeIdsByMainCouranteId, []);

      expect(mockUploadedFileCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ requeteId: null, requeteEtapeId: 'etape-mc-1' }),
      });
      expect(fakeLogger.warn).not.toHaveBeenCalled();
    },
  );

  it('should attach a main courante file to every étape created for that main courante across ARS entités', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'main_courante', id_ext_mc: 7 })]);
    const etapeIdsByMainCouranteId = new Map([[7, ['etape-mc-ars1', 'etape-mc-ars2']]]);

    await migrateSirecFiles(42, 'requete-1', new Map(), etapeIdsByMainCouranteId, []);

    expect(mockUploadedFileCreate).toHaveBeenCalledTimes(2);
    expect(mockUploadedFileCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ requeteId: null, requeteEtapeId: 'etape-mc-ars1' }),
    });
    expect(mockUploadedFileCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ requeteId: null, requeteEtapeId: 'etape-mc-ars2' }),
    });
    expect(mockAddFileProcessingJob).toHaveBeenCalledTimes(2);
  });

  it('should warn and attach directly to the requete when id_ext_mc has no matching étape', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'main_courante_flag', id_ext_mc: 99 })]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1, fileType: 'main_courante_flag', idExtMc: 99 }),
      'No étape created for this SIREC main courante on this réclamation, attaching file directly to the requete',
    );
    expect(mockUploadedFileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ requeteId: 'requete-1', requeteEtapeId: null }),
    });
  });

  it('should warn and attach directly to the requete when a main courante file has no id_ext_mc', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'main_courante', id_ext_mc: null })]);
    const etapeIdsByMainCouranteId = new Map([[7, ['etape-mc-1']]]);

    await migrateSirecFiles(42, 'requete-1', new Map(), etapeIdsByMainCouranteId, []);

    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1, fileType: 'main_courante', idExtMc: null }),
      'No étape created for this SIREC main courante on this réclamation, attaching file directly to the requete',
    );
    expect(mockUploadedFileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ requeteId: 'requete-1', requeteEtapeId: null }),
    });
  });

  it('should attach an orig_req file to the Fait when a single Fait was created', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'orig_req' })]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), ['situation-1']);

    expect(mockUploadedFileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ requeteId: null, requeteEtapeId: null, faitSituationId: 'situation-1' }),
    });
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it('should attach an orig_req file to every Fait created for the réclamation', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'orig_req' })]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), ['situation-1', 'situation-2']);

    expect(mockUploadedFileCreate).toHaveBeenCalledTimes(2);
    expect(mockUploadedFileCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ requeteId: null, requeteEtapeId: null, faitSituationId: 'situation-1' }),
    });
    expect(mockUploadedFileCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ requeteId: null, requeteEtapeId: null, faitSituationId: 'situation-2' }),
    });
    expect(mockAddFileProcessingJob).toHaveBeenCalledTimes(2);
  });

  it('should warn and attach directly to the requete when no Fait was created', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'orig_req' })]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1, fileType: 'orig_req' }),
      'No Fait created for this SIREC réclamation, attaching file directly to the requete',
    );
    expect(mockUploadedFileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ requeteId: 'requete-1', requeteEtapeId: null, faitSituationId: null }),
    });
  });

  it('should warn and attach directly to the requete when the étape file_type is known but no étape was created', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'rep_plaignant' })]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1, fileType: 'rep_plaignant' }),
      'No étape created for this SIREC file_type on this réclamation, attaching file directly to the requete',
    );
    expect(mockUploadedFileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ requeteId: 'requete-1', requeteEtapeId: null }),
    });
  });

  it('should warn and attach directly to the requete when file_type is unknown', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ file_type: 'un_type_jamais_vu' })]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1, fileType: 'un_type_jamais_vu' }),
      'Unknown SIREC file_type, attaching file directly to the requete',
    );
    expect(mockUploadedFileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ requeteId: 'requete-1', requeteEtapeId: null }),
    });
  });

  it('should forward mockFilePath to getSirecFileStream when provided', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile()]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), [], '/files/mockfile');

    expect(mockGetSirecFileStream).toHaveBeenCalledWith(42, 'a1b2c3.pdf', '/files/mockfile');
  });

  it('should fall back to application/octet-stream when content_type is missing', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile({ content_type: null })]);

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

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

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1, sirecId: 42, requeteId: 'requete-1' }),
      'Failed to migrate SIREC file, skipping',
    );
    expect(mockUploadedFileCreate).toHaveBeenCalledTimes(1);
  });

  it('should rollback the uploaded object and log a warning when the DB record creation fails', async () => {
    mockFetchSirecFiles.mockResolvedValueOnce([makeFile()]);
    mockUploadedFileCreate.mockRejectedValueOnce(new Error('db down'));

    await migrateSirecFiles(42, 'requete-1', new Map(), new Map(), []);

    expect(mockRollback).toHaveBeenCalled();
    expect(mockAddFileProcessingJob).not.toHaveBeenCalled();
    expect(fakeLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sirecFileId: 1 }),
      'Failed to migrate SIREC file, skipping',
    );
  });
});
