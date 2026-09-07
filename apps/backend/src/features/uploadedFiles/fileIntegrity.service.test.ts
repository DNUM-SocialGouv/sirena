import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFilesFromMinio, listMinioObjects } from '../../libs/minio.js';
import { prisma } from '../../libs/prisma.js';
import { runFileIntegrityCheck } from './fileIntegrity.service.js';

const loggerMock = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => loggerMock,
  abortControllerStorage: { getStore: vi.fn(() => undefined) },
}));

vi.mock('../../libs/minio.js', () => ({
  listMinioObjects: vi.fn(),
  deleteFilesFromMinio: vi.fn(),
}));

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    uploadedFile: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const mockedFindMany = vi.mocked(prisma.uploadedFile.findMany);
const mockedDeleteMany = vi.mocked(prisma.uploadedFile.deleteMany);
const mockedListMinioObjects = vi.mocked(listMinioObjects);
const mockedDeleteFilesFromMinio = vi.mocked(deleteFilesFromMinio);

type DbFileFixture = {
  id: string;
  fileName: string;
  filePath: string;
  safeFilePath: string | null;
  size: number;
  status: string;
  createdAt: Date;
  requeteId: string | null;
  faitSituationId: string | null;
  requeteEtapeId: string | null;
  demarchesEngageesId: string | null;
};

const makeFile = (overrides: Partial<DbFileFixture> & { id: string }): DbFileFixture => ({
  fileName: `${overrides.id}.pdf`,
  filePath: `uploads/${overrides.id}.pdf`,
  safeFilePath: null,
  size: 100,
  status: 'COMPLETED',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  requeteId: 'requete-1',
  faitSituationId: null,
  requeteEtapeId: null,
  demarchesEngageesId: null,
  ...overrides,
});

/** Makes findMany resolve with one page per call, then an empty page. */
const mockDbPages = (pages: DbFileFixture[][]) => {
  for (const page of pages) {
    mockedFindMany.mockResolvedValueOnce(page as never);
  }
  mockedFindMany.mockResolvedValue([] as never);
};

type FindManyArgs = {
  where?: { id?: { gt?: string }; cursor?: never };
  cursor?: { id: string };
  skip?: number;
  take?: number;
};

/**
 * A minimal in-memory stand-in for `prisma.uploadedFile`, realistic enough to
 * catch pagination bugs that a plain "one page per call" mock cannot: it
 * actually removes rows on `deleteMany` and resolves `findMany` against what's
 * left, including reproducing Prisma's real (and easy to trip over) behavior
 * that a `cursor` pointing at a since-deleted row yields an empty page.
 */
const createFakeUploadedFileTable = (initialRows: DbFileFixture[]) => {
  const byId = (a: DbFileFixture, b: DbFileFixture) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  let rows = [...initialRows].sort(byId);

  const findMany = vi.fn(async (args: FindManyArgs) => {
    let candidates = rows;
    if (args.where?.id?.gt !== undefined) {
      const gt = args.where.id.gt;
      candidates = candidates.filter((r) => r.id > gt);
    } else if (args.cursor?.id !== undefined) {
      const idx = candidates.findIndex((r) => r.id === args.cursor?.id);
      candidates = idx === -1 ? [] : candidates.slice(idx + (args.skip ?? 0));
    }
    return candidates.slice(0, args.take ?? candidates.length);
  });

  const deleteMany = vi.fn(async (args: { where: { id: { in: string[] } } }) => {
    const ids = new Set(args.where.id.in);
    const before = rows.length;
    rows = rows.filter((r) => !ids.has(r.id));
    return { count: before - rows.length };
  });

  return { findMany, deleteMany, remainingIds: () => rows.map((r) => r.id) };
};

describe('fileIntegrity.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListMinioObjects.mockResolvedValue([]);
    mockedDeleteFilesFromMinio.mockResolvedValue([]);
    mockedDeleteMany.mockResolvedValue({ count: 0 } as never);
    mockDbPages([]);
  });

  it('returns all zeros when DB and S3 are in sync', async () => {
    const file = makeFile({ id: 'f1' });
    mockDbPages([[file]]);
    mockedListMinioObjects.mockResolvedValue([{ name: file.filePath, size: 100, lastModified: new Date() }]);

    const result = await runFileIntegrityCheck();

    expect(result).toEqual({
      orphanDbFiles: 0,
      orphanDbFilesSize: 0,
      dbFilesWithoutS3: 0,
      dbFilesWithoutS3Size: 0,
      s3FilesWithoutDb: 0,
      s3FilesWithoutDbSize: 0,
    });
    expect(mockedDeleteMany).not.toHaveBeenCalled();
    expect(mockedDeleteFilesFromMinio).not.toHaveBeenCalled();
  });

  it('detects orphan DB files (unlinked to any entity) without removing them by default', async () => {
    const orphan = makeFile({ id: 'orphan1', requeteId: null, size: 250 });
    mockDbPages([[orphan]]);
    mockedListMinioObjects.mockResolvedValue([{ name: orphan.filePath, size: 250, lastModified: new Date() }]);

    const result = await runFileIntegrityCheck();

    expect(result.orphanDbFiles).toBe(1);
    expect(result.orphanDbFilesSize).toBe(250);
    expect(mockedDeleteMany).not.toHaveBeenCalled();
    expect(mockedDeleteFilesFromMinio).not.toHaveBeenCalled();
  });

  it('detects DB rows missing their S3 object (dangling)', async () => {
    const dangling = makeFile({ id: 'dangling1', size: 50 });
    mockDbPages([[dangling]]);
    mockedListMinioObjects.mockResolvedValue([]);

    const result = await runFileIntegrityCheck();

    expect(result.dbFilesWithoutS3).toBe(1);
    expect(result.dbFilesWithoutS3Size).toBe(50);
  });

  it('detects S3 objects without a DB row', async () => {
    mockDbPages([]);
    mockedListMinioObjects.mockResolvedValue([{ name: 'uploads/ghost.pdf', size: 10, lastModified: new Date() }]);

    const result = await runFileIntegrityCheck();

    expect(result.s3FilesWithoutDb).toBe(1);
    expect(result.s3FilesWithoutDbSize).toBe(10);
  });

  it('paginates the DB scan using dbBatchSize and a keyset "id > cursor" filter', async () => {
    const page1 = [makeFile({ id: 'a' }), makeFile({ id: 'b' })];
    const page2 = [makeFile({ id: 'c' })];
    mockDbPages([page1, page2]);
    mockedListMinioObjects.mockResolvedValue(
      [...page1, ...page2].map((f) => ({ name: f.filePath, size: f.size, lastModified: new Date() })),
    );

    await runFileIntegrityCheck({ dbBatchSize: 2 });

    // page1 is full (2 rows) so a second page is fetched; page2 is short (1 row)
    // so the scan stops there without an extra round-trip.
    expect(mockedFindMany).toHaveBeenCalledTimes(2);
    expect(mockedFindMany.mock.calls[0][0]).toMatchObject({ take: 2 });
    expect(mockedFindMany.mock.calls[0][0]).not.toHaveProperty('where');
    expect(mockedFindMany.mock.calls[1][0]).toMatchObject({ take: 2, where: { id: { gt: 'b' } } });
  });

  it('keeps paginating past a page whose rows were all deleted (cursor row no longer exists)', async () => {
    // Regression test: pagination must not rely on Prisma's `cursor` option,
    // which silently returns an empty page once the anchor row no longer
    // exists. Here every row is dangling and gets deleted as soon as its page
    // is scanned — including the row used to page to the next batch — so a
    // `cursor`-based implementation would stop after the first page instead
    // of reaching all 3 rows.
    const table = createFakeUploadedFileTable([makeFile({ id: 'a' }), makeFile({ id: 'b' }), makeFile({ id: 'c' })]);
    mockedFindMany.mockImplementation(table.findMany as never);
    mockedDeleteMany.mockImplementation(table.deleteMany as never);
    mockedListMinioObjects.mockResolvedValue([]); // nothing in S3 -> every row is dangling

    const result = await runFileIntegrityCheck({ removeDangling: true, dbBatchSize: 2 });

    expect(result.dbFilesWithoutS3).toBe(3);
    expect(table.remainingIds()).toEqual([]);
  });

  it('removes orphan DB files and their S3 objects in batches when removeOrphans is set', async () => {
    const orphans = [makeFile({ id: 'o1', requeteId: null }), makeFile({ id: 'o2', requeteId: null })];
    mockDbPages([orphans]);
    mockedListMinioObjects.mockResolvedValue(
      orphans.map((f) => ({ name: f.filePath, size: f.size, lastModified: new Date() })),
    );
    mockedDeleteFilesFromMinio.mockResolvedValue([]);
    mockedDeleteMany.mockResolvedValue({ count: 2 } as never);

    const result = await runFileIntegrityCheck({ removeOrphans: true, s3BatchSize: 1 });

    // s3BatchSize of 1 forces one call per key
    expect(mockedDeleteFilesFromMinio).toHaveBeenCalledTimes(2);
    expect(mockedDeleteFilesFromMinio).toHaveBeenCalledWith(['uploads/o1.pdf']);
    expect(mockedDeleteFilesFromMinio).toHaveBeenCalledWith(['uploads/o2.pdf']);
    expect(mockedDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['o1', 'o2'] } } });
    expect(result.orphanDbFiles).toBe(2);
  });

  it('keeps the DB row when its S3 deletion fails, so the next run retries it', async () => {
    const orphans = [makeFile({ id: 'o1', requeteId: null }), makeFile({ id: 'o2', requeteId: null })];
    mockDbPages([orphans]);
    mockedListMinioObjects.mockResolvedValue(
      orphans.map((f) => ({ name: f.filePath, size: f.size, lastModified: new Date() })),
    );
    mockedDeleteFilesFromMinio.mockResolvedValue([{ key: 'uploads/o1.pdf', message: 'AccessDenied' }]);

    await runFileIntegrityCheck({ removeOrphans: true });

    expect(mockedDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['o2'] } } });
  });

  it('removes S3 objects without a DB row when removeOrphans is set', async () => {
    mockDbPages([]);
    mockedListMinioObjects.mockResolvedValue([{ name: 'uploads/ghost.pdf', size: 10, lastModified: new Date() }]);
    mockedDeleteFilesFromMinio.mockResolvedValue([]);

    await runFileIntegrityCheck({ removeOrphans: true });

    expect(mockedDeleteFilesFromMinio).toHaveBeenCalledWith(['uploads/ghost.pdf']);
  });

  it('removes dangling DB rows in batches when removeDangling is set', async () => {
    const dangling = [makeFile({ id: 'd1' }), makeFile({ id: 'd2' })];
    mockDbPages([dangling]);
    mockedListMinioObjects.mockResolvedValue([]);
    mockedDeleteMany.mockResolvedValue({ count: 1 } as never);

    await runFileIntegrityCheck({ removeDangling: true, dbBatchSize: 1 });

    expect(mockedDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['d1'] } } });
    expect(mockedDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['d2'] } } });
  });

  it('does not delete anything for dangling files when removeDangling is not set', async () => {
    mockDbPages([[makeFile({ id: 'd1' })]]);
    mockedListMinioObjects.mockResolvedValue([]);

    await runFileIntegrityCheck();

    expect(mockedDeleteMany).not.toHaveBeenCalled();
  });

  it('caps s3BatchSize to the S3 DeleteObjects API limit of 1000', async () => {
    mockDbPages([]);
    mockedListMinioObjects.mockResolvedValue([]);

    await runFileIntegrityCheck({ s3BatchSize: 5000 });

    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('capping to 1000'));
  });

  it('rejects a non-positive dbBatchSize', async () => {
    await expect(runFileIntegrityCheck({ dbBatchSize: 0 })).rejects.toThrow(/dbBatchSize/);
  });
});
