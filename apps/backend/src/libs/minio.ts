import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Client } from 'minio';
import { envVars } from '../config/env.js';
import { createDecryptionStream, createEncryptionStream, type DecryptionParams } from './encryption.js';

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

export interface UploadResult {
  objectPath: string;
  rollback: () => Promise<void>;
  encryptionMetadata?: {
    iv: string;
    authTag: string;
  };
}

export const uploadFileToMinio = async (
  input: string | Readable | Buffer,
  originalName: string,
  contentType?: string,
): Promise<UploadResult> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  const fileId = randomUUID();
  const fileExtension = path.extname(originalName);
  const filename = `${fileId}${fileExtension}`;
  const objectPath = S3_BUCKET_ROOT_DIR ? `${S3_BUCKET_ROOT_DIR}/${filename}` : filename;

  // Create source stream from input
  let sourceStream: Readable;
  if (Buffer.isBuffer(input)) {
    sourceStream = Readable.from(input);
  } else if (typeof input === 'string') {
    sourceStream = fs.createReadStream(input);
  } else {
    sourceStream = input;
  }

  // Create encryption stream
  const { stream: encryptStream, getMetadata } = createEncryptionStream();

  // Create passthrough to collect encrypted data for MinIO
  // (MinIO client needs the full stream to calculate content-length)
  const encryptedChunks: Buffer[] = [];
  const collectStream = new PassThrough();
  collectStream.on('data', (chunk) => encryptedChunks.push(chunk));

  // Pipe: source → encrypt → collect
  await pipeline(sourceStream, encryptStream, collectStream);

  const encryptedBuffer = Buffer.concat(encryptedChunks);
  const encryptionMetadata = getMetadata();

  const metadata: Record<string, string> = {
    'Content-Type': contentType || 'application/octet-stream',
    'x-amz-meta-filename': originalName,
    'x-amz-meta-uploadedfileid': fileId,
    'x-amz-meta-encrypted': 'true',
    'x-amz-meta-encryption-iv': encryptionMetadata.iv,
    'x-amz-meta-encryption-authtag': encryptionMetadata.authTag,
  };

  await minioClient.putObject(S3_BUCKET_NAME, objectPath, encryptedBuffer, undefined, metadata);

  return {
    objectPath,
    encryptionMetadata,
    rollback: async () => {
      await deleteFileFromMinio(objectPath);
    },
  };
};

export const deleteFileFromMinio = async (filePath: string): Promise<void> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  await minioClient.removeObject(S3_BUCKET_NAME, filePath);
};

export interface FileStreamResult {
  stream: Readable;
  metadata: {
    encrypted: boolean;
    contentType?: string;
    originalName?: string;
  };
}

export const getFileStream = async (
  filePath: string,
  decryptionParams?: DecryptionParams,
): Promise<FileStreamResult> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  const stat = await minioClient.statObject(S3_BUCKET_NAME, filePath);
  const encrypted = stat.metaData?.encrypted === 'true';
  const contentType = stat.metaData?.['content-type'];
  const originalName = stat.metaData?.filename;

  const stream = await minioClient.getObject(S3_BUCKET_NAME, filePath);

  if (encrypted) {
    const params = decryptionParams || {
      iv: stat.metaData?.['encryption-iv'] || '',
      authTag: stat.metaData?.['encryption-authtag'] || '',
    };

    if (!params.iv || !params.authTag) {
      throw new Error('Encrypted file missing decryption metadata');
    }

    const decryptionStream = createDecryptionStream(params);
    stream.pipe(decryptionStream);

    return {
      stream: decryptionStream,
      metadata: { encrypted: true, contentType, originalName },
    };
  }

  // Backward compatibility: return unencrypted stream for old files
  return {
    stream,
    metadata: { encrypted: false, contentType, originalName },
  };
};

export const getFileBuffer = async (filePath: string, decryptionParams?: DecryptionParams): Promise<Buffer> => {
  const { stream } = await getFileStream(filePath, decryptionParams);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
