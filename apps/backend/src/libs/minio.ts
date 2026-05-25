import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { Client, CopyDestinationOptions, CopySourceOptions } from 'minio';
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
  encryptionMetadata: {
    iv: string;
    authTag: string;
  };
}

/**
 * Streams the input through AES-GCM encryption directly into MinIO without
 * materializing the encrypted output in memory.
 *
 * The AES-GCM auth tag is only known after the encryption stream finalises,
 * which is too late to include in the putObject request headers. We backfill
 * iv + authTag into the S3 object metadata via copyObject(self, self, REPLACE)
 * — a server-side metadata-only operation, no body re-transfer. This keeps
 * parity with the pre-existing on-disk encryption layout (key material lives
 * on the API side; S3 only sees the iv and auth tag, never the master key).
 */
export const uploadFileToMinio = async (
  input: string | Readable | Buffer,
  originalName: string,
  contentType?: string,
  size?: number,
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

  sourceStream.on('error', (err) => encryptStream.destroy(err));
  sourceStream.pipe(encryptStream);

  const resolvedContentType = contentType || 'application/octet-stream';
  const baseHeaders: Record<string, string> = {
    'Content-Type': resolvedContentType,
    'x-amz-meta-filename': originalName,
    'x-amz-meta-uploadedfileid': fileId,
    'x-amz-meta-encrypted': 'true',
  };

  try {
    await minioClient.putObject(S3_BUCKET_NAME, objectPath, encryptStream, size, baseHeaders);
  } catch (err) {
    if (!sourceStream.destroyed) sourceStream.destroy(err as Error);
    throw err;
  }

  const encryptionMetadata = getMetadata();

  try {
    await minioClient.copyObject(
      new CopySourceOptions({ Bucket: S3_BUCKET_NAME, Object: objectPath }),
      new CopyDestinationOptions({
        Bucket: S3_BUCKET_NAME,
        Object: objectPath,
        MetadataDirective: 'REPLACE',
        UserMetadata: {
          filename: originalName,
          uploadedfileid: fileId,
          encrypted: 'true',
          'encryption-iv': encryptionMetadata.iv,
          'encryption-authtag': encryptionMetadata.authTag,
        },
        Headers: {
          'Content-Type': resolvedContentType,
        },
      }),
    );
  } catch (err) {
    await deleteFileFromMinio(objectPath).catch(() => {});
    throw err;
  }

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
    const params = decryptionParams ?? {
      iv: stat.metaData?.['encryption-iv'] || '',
      authTag: stat.metaData?.['encryption-authtag'] || '',
    };

    if (!params.iv || !params.authTag) {
      throw new Error('Encrypted file missing decryption metadata');
    }

    const decryptionStream = createDecryptionStream(params);
    stream.on('error', (err) => decryptionStream.destroy(err));
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

export interface MinioObjectInfo {
  name: string;
  size: number;
  lastModified: Date;
}

export const listMinioObjects = async (prefix?: string): Promise<MinioObjectInfo[]> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  const effectivePrefix = prefix ?? S3_BUCKET_ROOT_DIR;
  const stream = minioClient.listObjectsV2(S3_BUCKET_NAME, effectivePrefix, true);

  return new Promise((resolve, reject) => {
    const objects: MinioObjectInfo[] = [];
    stream.on('data', (obj) => {
      if (obj.name) {
        objects.push({ name: obj.name, size: obj.size, lastModified: obj.lastModified });
      }
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(objects));
  });
};

export const statMinioObject = async (filePath: string) => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }
  return minioClient.statObject(S3_BUCKET_NAME, filePath);
};

export const getFileBuffer = async (filePath: string, decryptionParams?: DecryptionParams): Promise<Buffer> => {
  const { stream } = await getFileStream(filePath, decryptionParams);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
