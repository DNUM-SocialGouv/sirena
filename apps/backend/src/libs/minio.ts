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

const minioClient = S3_BUCKET_ENDPOINT
  ? new Client({
      endPoint: S3_BUCKET_ENDPOINT,
      port: parseInt(S3_BUCKET_PORT, 10) || 443,
      useSSL: S3_BUCKET_PORT === '443',
      accessKey: S3_BUCKET_ACCESS_KEY,
      secretKey: S3_BUCKET_SECRET_KEY,
      pathStyle: true,
    })
  : null;

export const uploadFileToMinio = async (
  filePath: string,
  originalName: string,
  contentType?: string,
): Promise<{ objectPath: string; rollback: (logger: PinoLogger) => Promise<void> }> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

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
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  return minioClient.presignedUrl('GET', S3_BUCKET_NAME, filePath, expirySeconds);
};

export const deleteFileFromMinio = async (filePath: string): Promise<void> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  await minioClient.removeObject(S3_BUCKET_NAME, filePath);
};

export const getFileStream = async (filePath: string) => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  const stream = await minioClient.getObject(S3_BUCKET_NAME, filePath);
  return stream;
};
