import { type Prisma, prisma } from '@sirena/db';
import { addFileProcessingJob } from '../../jobs/queues/fileProcessing.queue.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { uploadFileToMinio } from '../../libs/minio.js';
import { getSirecFileStream } from './sirecMigration.filesMinio.js';
import { fetchSirecFiles, type SirecFileRow } from './sirecMigration.repository.js';

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

/** file_type SIREC rattachés directement à la réclamation (pas à une étape de traitement). */
const DIRECT_FILE_TYPES = new Set<string | null>([null, 'hors_process', 'fiche_synthese']);

/** file_type SIREC connus comme ciblant une étape de traitement créée pendant la migration. */
const ETAPE_FILE_TYPE_KEYS = new Set([
  'ar_requerant',
  'hors_ars1',
  'hors_ars2',
  'hors_ars3',
  'mesures_prises',
  'rep_instit_part1',
  'rep_instit_part2',
  'rep_instit_part3',
  'rep_plaignant',
]);

async function migrateSingleSirecFile(
  sirecId: number,
  requeteId: string,
  file: SirecFileRow,
  requeteEtapeId: string | null,
  mockFilePath?: string,
): Promise<void> {
  const sourceStream = await getSirecFileStream(sirecId, file.generated_name, mockFilePath);
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
        // Un fichier est rattaché soit à une étape, soit directement à la requête, jamais les deux
        // (cf. setEtapeFile en flux normal).
        requeteId: requeteEtapeId ? null : requeteId,
        requeteEtapeId,
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
 * Tente de migrer un fichier vers une cible (étape ou réclamation directe) ; loggue un warning
 * et continue sans bloquer la migration globale en cas d'échec.
 */
async function migrateFileToTarget(
  sirecId: number,
  requeteId: string,
  file: SirecFileRow,
  requeteEtapeId: string | null,
  mockFilePath: string | undefined,
): Promise<void> {
  const logger = getLoggerStore();
  try {
    await migrateSingleSirecFile(sirecId, requeteId, file, requeteEtapeId, mockFilePath);
  } catch (err) {
    logger.warn(
      { err, sirecId, requeteId, sirecFileId: file.id_data, generatedName: file.generated_name, requeteEtapeId },
      'Failed to migrate SIREC file, skipping',
    );
  }
}

/**
 * Migre toutes les pièces jointes d'une réclamation SIREC vers le bucket S3 SIRENA.
 *
 * Chaque fichier est dispatché selon son file_type :
 * - direct (NULL, 'hors_process', 'fiche_synthese') : rattaché à la réclamation ;
 * - lié à une étape connue (cf. ETAPE_FILE_TYPE_KEYS) : rattaché à chaque étape créée pour ce
 *   type lors de cette migration (etapeIdsByFileType, cf. saveFromSirec) — réuploadé une fois
 *   par étape si plusieurs entités ARS sont concernées ;
 * - type connu mais sans étape créée pour cette réclamation, ou type inconnu : warning + fichier
 *   tout de même rattaché directement à la réclamation.
 *
 * L'échec de migration d'un fichier individuel n'interrompt pas la migration : il est loggé en
 * warning et les fichiers suivants sont traités.
 */
export async function migrateSirecFiles(
  sirecId: number,
  requeteId: string,
  etapeIdsByFileType: Map<string, string[]>,
  mockFilePath?: string,
): Promise<void> {
  const logger = getLoggerStore();
  const files = await fetchSirecFiles(sirecId);

  if (files.length === 0) return;

  logger.info({ sirecId, requeteId, count: files.length, mockFilePath }, 'Migrating SIREC files');

  for (const file of files) {
    const fileType = file.file_type;

    if (DIRECT_FILE_TYPES.has(fileType)) {
      await migrateFileToTarget(sirecId, requeteId, file, null, mockFilePath);
      continue;
    }

    if (fileType && ETAPE_FILE_TYPE_KEYS.has(fileType)) {
      const etapeIds = etapeIdsByFileType.get(fileType);
      if (etapeIds && etapeIds.length > 0) {
        for (const etapeId of etapeIds) {
          await migrateFileToTarget(sirecId, requeteId, file, etapeId, mockFilePath);
        }
        continue;
      }

      logger.warn(
        { sirecId, requeteId, sirecFileId: file.id_data, fileType },
        'No étape created for this SIREC file_type on this réclamation, attaching file directly to the requete',
      );
      await migrateFileToTarget(sirecId, requeteId, file, null, mockFilePath);
      continue;
    }

    logger.warn(
      { sirecId, requeteId, sirecFileId: file.id_data, fileType },
      'Unknown SIREC file_type, attaching file directly to the requete',
    );
    await migrateFileToTarget(sirecId, requeteId, file, null, mockFilePath);
  }
}
