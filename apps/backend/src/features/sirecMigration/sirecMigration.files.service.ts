import { type Prisma, prisma } from '@sirena/db';
import { addFileProcessingJob } from '../../jobs/queues/fileProcessing.queue.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { uploadFileToMinio } from '../../libs/minio.js';
import { getSirecFileStream } from './sirecMigration.filesMinio.js';
import { fetchSirecFiles, type SirecFileRow } from './sirecMigration.repository.js';

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

async function migrateSingleSirecFile(sirecId: number, requeteId: string, file: SirecFileRow): Promise<void> {
  const sourceStream = await getSirecFileStream(sirecId, file.generated_name);
  const contentType = file.content_type || DEFAULT_CONTENT_TYPE;

  const { objectPath, rollback, encryptionMetadata } = await uploadFileToMinio(
    sourceStream,
    file.original_name,
    contentType,
    file.size,
  );

  const pathParts = objectPath.split('/');
  const fileName = pathParts[pathParts.length - 1] || '';
  const id = fileName.split('.')[0] || '';

  if (!fileName || !id) {
    await rollback().catch(() => {});
    throw new Error('File name is not valid');
  }

  try {
    await prisma.uploadedFile.create({
      data: {
        id,
        fileName,
        filePath: objectPath,
        mimeType: contentType,
        size: file.size,
        createdAt: file.sys_creation_date,
        metadata: {
          originalName: file.original_name,
          encryption: encryptionMetadata,
          sirecFileId: file.id_data,
          sirecGeneratedName: file.generated_name,
          sirecHash: file.hash,
        } as Prisma.InputJsonValue,
        entiteId: null,
        uploadedById: null,
        requeteId,
        requeteEtapeId: null,
        faitSituationId: null,
        demarchesEngageesId: null,
        status: 'PENDING',
        canDelete: true,
      },
    });
  } catch (err) {
    await rollback().catch(() => {});
    throw err;
  }

  await addFileProcessingJob({ fileId: id, fileName, filePath: objectPath, mimeType: contentType });
}

/**
 * Migre les pièces jointes rattachées directement à une réclamation SIREC (hors
 * fichiers d'étapes de traitement, cf. fetchSirecFiles) vers le bucket S3 SIRENA.
 *
 * L'échec de migration d'un fichier individuel n'interrompt pas la migration :
 * il est loggé en warning et les fichiers suivants sont traités.
 */
export async function migrateSirecFiles(sirecId: number, requeteId: string): Promise<void> {
  const logger = getLoggerStore();
  const files = await fetchSirecFiles(sirecId);

  if (files.length === 0) return;

  logger.info({ sirecId, requeteId, count: files.length }, 'Migrating SIREC files');

  for (const file of files) {
    try {
      await migrateSingleSirecFile(sirecId, requeteId, file);
    } catch (err) {
      logger.warn(
        { err, sirecId, requeteId, sirecFileId: file.id_data, generatedName: file.generated_name },
        'Failed to migrate SIREC file, skipping',
      );
    }
  }
}
