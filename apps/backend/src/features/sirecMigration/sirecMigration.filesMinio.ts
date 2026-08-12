import type { Readable } from 'node:stream';
import { Client } from 'minio';
import { envVars } from '../../config/env.js';

const {
  S3_MIGRATION_BUCKET_ACCESS_KEY,
  S3_MIGRATION_BUCKET_SECRET_KEY,
  S3_MIGRATION_BUCKET_NAME,
  S3_BUCKET_ENDPOINT,
  S3_BUCKET_PORT,
} = envVars;

/**
 * Client MinIO dédié au bucket source SIREC (lecture seule), utilisé uniquement
 * par la migration de fichiers. Même infra S3 (endpoint/port) que le bucket
 * SIRENA, mais des identifiants et un bucket différents.
 */
const sirecFilesMinioClient =
  S3_BUCKET_ENDPOINT && S3_MIGRATION_BUCKET_ACCESS_KEY && S3_MIGRATION_BUCKET_SECRET_KEY && S3_MIGRATION_BUCKET_NAME
    ? new Client({
        endPoint: S3_BUCKET_ENDPOINT,
        port: parseInt(S3_BUCKET_PORT, 10) || 443,
        useSSL: S3_BUCKET_PORT === '443',
        accessKey: S3_MIGRATION_BUCKET_ACCESS_KEY,
        secretKey: S3_MIGRATION_BUCKET_SECRET_KEY,
        pathStyle: true,
      })
    : null;

const SIREC_FILES_PREFIX = 'files';

export const buildSirecFileObjectPath = (sirecId: number, generatedName: string): string =>
  `${SIREC_FILES_PREFIX}/${sirecId}/${generatedName}`;

export const getSirecFileStream = async (
  sirecId: number,
  generatedName: string,
  mockFilePath?: string,
): Promise<Readable> => {
  if (!sirecFilesMinioClient) {
    throw new Error('SIREC migration MinIO client not initialized, check your S3_MIGRATION_BUCKET_* env vars');
  }
  if (!S3_MIGRATION_BUCKET_NAME) {
    throw new Error('S3_MIGRATION_BUCKET_NAME is not set');
  }

  // mockFilePath permet, en environnement de test, de forcer toutes les pièces
  // jointes migrées à pointer vers un seul fichier existant dans le bucket source.
  const objectPath = mockFilePath || buildSirecFileObjectPath(sirecId, generatedName);
  return sirecFilesMinioClient.getObject(S3_MIGRATION_BUCKET_NAME, objectPath);
};
