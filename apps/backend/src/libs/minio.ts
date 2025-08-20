import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { PinoLogger } from 'hono-pino';
import { Client } from 'minio';
import { envVars } from '@/config/env';

const {
  S3_BUCKET_ACCESS_KEY,
  S3_BUCKET_SECRET_KEY,
  S3_BUCKET_ENDPOINT,
  S3_BUCKET_PORT,
  S3_BUCKET_NAME,
  S3_BUCKET_ROOT_DIR,
} = envVars;

const minioClient = new Client({
  endPoint: S3_BUCKET_ENDPOINT,
  port: parseInt(S3_BUCKET_PORT, 10),
  useSSL: S3_BUCKET_ENDPOINT.startsWith('https'),
  accessKey: S3_BUCKET_ACCESS_KEY,
  secretKey: S3_BUCKET_SECRET_KEY,
});

export const uploadFileToMinio = async (
  filePath: string,
  originalName: string,
  contentType?: string,
): Promise<{ objectPath: string; rollback: (logger: PinoLogger) => Promise<void> }> => {
  const fileId = randomUUID();
  const fileExtension = path.extname(originalName);
  const filename = `${fileId}${fileExtension}`;
  const objectPath = `${S3_BUCKET_ROOT_DIR}/${filename}`;

  const stream = fs.createReadStream(filePath);

  await minioClient.putObject(S3_BUCKET_NAME, objectPath, stream, undefined, {
    'Content-Type': contentType || 'application/octet-stream',
    'x-amz-meta-filename': originalName,
    uploadedFileId: fileId,
  });

  return {
    objectPath,
    rollback: async (logger: PinoLogger) => {
      try {
        await deleteFileFromMinio(objectPath);
      } catch (err) {
        logger.error({ err }, 'Failed to rollback MinIO file');
      }
    },
  };
};

export const getSignedUrl = async (filePath: string, expirySeconds = 60 * 60): Promise<string> => {
  return minioClient.presignedUrl('GET', S3_BUCKET_NAME, filePath, expirySeconds);
};

export const deleteFileFromMinio = async (filePath: string): Promise<void> => {
  await minioClient.removeObject(S3_BUCKET_NAME, filePath);
};

export const getFileStream = async (filePath: string) => {
  const stream = await minioClient.getObject(S3_BUCKET_NAME, filePath);
  return stream;
};
