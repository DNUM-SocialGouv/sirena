import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { deleteFileFromMinio, listMinioObjects } from '../../libs/minio.js';
import { prisma } from '../../libs/prisma.js';

export type FileIntegrityResult = {
  orphanDbFiles: number;
  orphanDbFilesSize: number;
  dbFilesWithoutS3: number;
  dbFilesWithoutS3Size: number;
  s3FilesWithoutDb: number;
  s3FilesWithoutDbSize: number;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export async function runFileIntegrityCheck(options?: {
  removeOrphans?: boolean;
  removeDangling?: boolean;
}): Promise<FileIntegrityResult> {
  const logger = getLoggerStore();
  const { removeOrphans = false, removeDangling = false } = options ?? {};

  logger.info({ removeOrphans, removeDangling }, 'Starting file integrity check');

  const dbStartedAt = Date.now();
  const dbFiles = await prisma.uploadedFile.findMany({
    select: {
      id: true,
      fileName: true,
      filePath: true,
      safeFilePath: true,
      size: true,
      status: true,
      createdAt: true,
      requeteId: true,
      faitSituationId: true,
      requeteEtapeNoteId: true,
      demarchesEngageesId: true,
    },
  });
  logger.info({ count: dbFiles.length, durationMs: Date.now() - dbStartedAt }, 'Fetched uploaded files from database');
  logger.info(`Found ${dbFiles.length} files in database`);

  const s3StartedAt = Date.now();
  const s3Objects = await listMinioObjects();
  const s3Paths = new Set(s3Objects.map((o) => o.name));
  logger.info({ count: s3Objects.length, durationMs: Date.now() - s3StartedAt }, 'Listed objects from S3');
  logger.info(`Found ${s3Objects.length} objects in S3`);

  const dbPaths = new Set<string>();
  for (const f of dbFiles) {
    dbPaths.add(f.filePath);
    if (f.safeFilePath) dbPaths.add(f.safeFilePath);
  }
  logger.info({ uniqueDbPaths: dbPaths.size }, 'Built DB path index');

  const orphanDbFiles = dbFiles.filter(
    (f) => !f.requeteId && !f.faitSituationId && !f.requeteEtapeNoteId && !f.demarchesEngageesId,
  );
  const dbFilesWithoutS3 = dbFiles.filter((f) => !s3Paths.has(f.filePath));
  const s3FilesWithoutDb = s3Objects.filter((o) => !dbPaths.has(o.name));

  logger.info(
    `Orphan DB files (unlinked to any entity): ${orphanDbFiles.length} (${formatBytes(orphanDbFiles.reduce((s, f) => s + f.size, 0))})`,
  );
  logger.info(
    `DB files missing from S3 (broken refs): ${dbFilesWithoutS3.length} (${formatBytes(dbFilesWithoutS3.reduce((s, f) => s + f.size, 0))})`,
  );
  logger.info(
    `S3 files without DB entry: ${s3FilesWithoutDb.length} (${formatBytes(s3FilesWithoutDb.reduce((s, f) => s + f.size, 0))})`,
  );

  for (const [i, f] of orphanDbFiles.entries()) {
    logger.warn(
      `orphan-db | ${i + 1} | ${f.id} | ${f.fileName} | ${f.filePath} | ${f.status} | ${formatBytes(f.size)} | ${f.createdAt.toISOString()}`,
    );
  }

  for (const [i, f] of dbFilesWithoutS3.entries()) {
    logger.warn(`dangling-db | ${i + 1} | ${f.id} | ${f.fileName} | ${f.filePath} | ${formatBytes(f.size)}`);
  }

  for (const [i, f] of s3FilesWithoutDb.entries()) {
    logger.warn(`orphan-s3 | ${i + 1} | ${f.name} | ${formatBytes(f.size)} | ${f.lastModified.toISOString()}`);
  }

  if (removeOrphans && (orphanDbFiles.length > 0 || s3FilesWithoutDb.length > 0)) {
    logger.info(
      { orphanDbFiles: orphanDbFiles.length, s3FilesWithoutDb: s3FilesWithoutDb.length },
      'Removing orphan files',
    );

    let removedDbOrphans = 0;
    for (const f of orphanDbFiles) {
      try {
        logger.info({ fileId: f.id, filePath: f.filePath }, 'Removing orphan DB file');
        if (s3Paths.has(f.filePath)) {
          await deleteFileFromMinio(f.filePath);
        }
        if (f.safeFilePath && s3Paths.has(f.safeFilePath)) {
          await deleteFileFromMinio(f.safeFilePath);
        }
        await prisma.uploadedFile.delete({ where: { id: f.id } });
        removedDbOrphans++;
      } catch (err) {
        logger.error({ err, fileId: f.id }, `Failed to remove orphan DB file ${f.id}`);
      }
    }
    logger.info(`Removed ${removedDbOrphans}/${orphanDbFiles.length} orphan DB files`);

    let removedS3Orphans = 0;
    for (const f of s3FilesWithoutDb) {
      try {
        logger.info({ path: f.name }, 'Removing orphan S3 file');
        await deleteFileFromMinio(f.name);
        removedS3Orphans++;
      } catch (err) {
        logger.error({ err, path: f.name }, `Failed to remove orphan S3 file ${f.name}`);
      }
    }
    logger.info(`Removed ${removedS3Orphans}/${s3FilesWithoutDb.length} orphan S3 files`);
  }

  if (removeDangling && dbFilesWithoutS3.length > 0) {
    logger.info({ dbFilesWithoutS3: dbFilesWithoutS3.length }, 'Removing dangling DB records');

    let removedDangling = 0;
    for (const f of dbFilesWithoutS3) {
      try {
        logger.debug({ fileId: f.id, filePath: f.filePath }, 'Removing dangling DB record');
        await prisma.uploadedFile.delete({ where: { id: f.id } });
        removedDangling++;
      } catch (err) {
        logger.error({ err, fileId: f.id }, `Failed to remove dangling DB record ${f.id}`);
      }
    }
    logger.info(`Removed ${removedDangling}/${dbFilesWithoutS3.length} dangling DB records`);
  }

  const result = {
    orphanDbFiles: orphanDbFiles.length,
    orphanDbFilesSize: orphanDbFiles.reduce((s, f) => s + f.size, 0),
    dbFilesWithoutS3: dbFilesWithoutS3.length,
    dbFilesWithoutS3Size: dbFilesWithoutS3.reduce((s, f) => s + f.size, 0),
    s3FilesWithoutDb: s3FilesWithoutDb.length,
    s3FilesWithoutDbSize: s3FilesWithoutDb.reduce((s, f) => s + f.size, 0),
  };

  logger.info(result, 'File integrity check completed');

  return result;
}
