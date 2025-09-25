import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileTypeFromStream } from 'file-type';
import { Client } from 'minio';
import { envVars } from '@/config/env';
import { MAX_FILE_SIZE } from '@/config/files.constant';
import { getLoggerStore } from './asyncLocalStorage';

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
  filePath: string | Readable,
  originalName: string,
  contentType?: string,
): Promise<{ objectPath: string; rollback: () => Promise<void> }> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  const fileId = randomUUID();
  const fileExtension = path.extname(originalName);
  const filename = `${fileId}${fileExtension}`;
  const objectPath = `${S3_BUCKET_ROOT_DIR}/${filename}`;

  const stream = typeof filePath === 'string' ? fs.createReadStream(filePath) : filePath;
  const logger = getLoggerStore();
  logger.warn(objectPath);
  await minioClient.putObject(S3_BUCKET_NAME, objectPath, stream, undefined, {
    'Content-Type': contentType || 'application/octet-stream',
    'x-amz-meta-filename': originalName,
    uploadedFileId: fileId,
  });

  return {
    objectPath,
    rollback: async () => {
      try {
        await deleteFileFromMinio(objectPath);
      } catch (err) {
        const logger = getLoggerStore();
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

export const urlToStream = async (url: string) => {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  }

  const sizeHdr = res.headers.get('content-length');
  const size = sizeHdr ? Number(sizeHdr) : undefined;
  if (size && size > MAX_FILE_SIZE) throw new Error('File too large');

  const sniff = await fileTypeFromStream(res.body).catch(() => null);

  const mimeSniffed = sniff?.mime;

  const mimeFromHeader = res.headers.get('content-type') ?? undefined;

  const node = Readable.fromWeb(res.body);

  return {
    stream: node,
    size: size ?? undefined,
    mimeFromHeader,
    mimeSniffed,
  };
};
