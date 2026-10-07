import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Client, CopyDestinationOptions, CopySourceOptions } from 'minio';
import { envVars } from '../config/env.js';
import { createDefaultLogger } from '../helpers/pino.js';
import { loggerStorage } from './asyncLocalStorage.js';
import { createDecryptionStream, createEncryptionStream, type DecryptionParams } from './encryption.js';

const {
  S3_BUCKET_ACCESS_KEY,
  S3_BUCKET_SECRET_KEY,
  S3_BUCKET_ENDPOINT,
  S3_BUCKET_PORT,
  S3_BUCKET_NAME,
  S3_BUCKET_ROOT_DIR,
} = envVars;

// Without these bounds, a provider outage lets the backend pile up doomed requests until the
// whole service goes down. See docs/postmortem-2026-10-07.md.
const S3_MAX_SOCKETS = 32;
const S3_SOCKET_TIMEOUT_MS = 30_000;
const S3_MAX_RETRIES = 2;
const S3_RETRY_BASE_DELAY_MS = 200;
const S3_RETRY_MAX_DELAY_MS = 2_000;
// With no explicit partSize, minio sizes its parts from the maximum object size (5 TiB) and
// buffers roughly 550 MiB blocks in memory, far beyond the actual file.
const S3_PART_SIZE = 16 * 1024 * 1024;

const useSSL = S3_BUCKET_PORT === '443';
const TransportAgent = useSSL ? HttpsAgent : HttpAgent;

const minioClient = S3_BUCKET_ENDPOINT
  ? new Client({
      endPoint: S3_BUCKET_ENDPOINT,
      port: parseInt(S3_BUCKET_PORT, 10) || 443,
      useSSL,
      accessKey: S3_BUCKET_ACCESS_KEY,
      secretKey: S3_BUCKET_SECRET_KEY,
      pathStyle: true,
      partSize: S3_PART_SIZE,
      transportAgent: new TransportAgent({
        keepAlive: true,
        maxSockets: S3_MAX_SOCKETS,
        timeout: S3_SOCKET_TIMEOUT_MS,
      }),
      retryOptions: {
        maximumRetryCount: S3_MAX_RETRIES,
        baseDelayMs: S3_RETRY_BASE_DELAY_MS,
        maximumDelayMs: S3_RETRY_MAX_DELAY_MS,
      },
    })
  : null;

const TRANSIENT_STORAGE_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'InternalError',
  'RequestTimeout',
  'ServiceUnavailable',
  'SlowDown',
]);

// minio wraps retried 5xx responses in a generic Error carrying no usable code.
const TRANSIENT_STORAGE_MESSAGE = /Retryable HTTP status: 5\d\d|Request failed after \d+ retr/;

const hasStringCode = (err: Error): err is Error & { code: string } => 'code' in err && typeof err.code === 'string';

// `seen` bounds the walk: a cyclic `cause` chain would otherwise overflow the stack.
const isTransientStorageError = (err: unknown, seen: Set<unknown>): boolean => {
  if (!(err instanceof Error) || seen.has(err)) {
    return false;
  }
  seen.add(err);

  if (hasStringCode(err) && TRANSIENT_STORAGE_ERROR_CODES.has(err.code)) {
    return true;
  }

  if (TRANSIENT_STORAGE_MESSAGE.test(err.message)) {
    return true;
  }

  return isTransientStorageError(err.cause, seen);
};

export const isStorageUnavailableError = (err: unknown): boolean => isTransientStorageError(err, new Set());

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

  // pipeline() avoids an uncaught stream error (process crash) when the source or putObject fails.
  const encryption = pipeline(sourceStream, encryptStream);

  const resolvedContentType = contentType || 'application/octet-stream';
  const baseHeaders: Record<string, string> = {
    'Content-Type': resolvedContentType,
    'x-amz-meta-filename': originalName,
    'x-amz-meta-uploadedfileid': fileId,
    'x-amz-meta-encrypted': 'true',
  };

  try {
    // minio ignores errors on the body stream: without awaiting the pipeline, a source failure hangs forever.
    await Promise.all([
      minioClient.putObject(S3_BUCKET_NAME, objectPath, encryptStream, size, baseHeaders),
      encryption,
    ]);
  } catch (err) {
    encryptStream.destroy(err as Error);
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
    // Without its encryption metadata the object is permanently undecryptable: if the rollback
    // fails too, we at least need to know an orphan is left on the bucket.
    await deleteFileFromMinio(objectPath).catch((rollbackErr) => {
      const logger = loggerStorage.getStore() ?? createDefaultLogger();
      logger.warn({ err: rollbackErr, objectPath }, 'Failed to roll back orphaned S3 object');
    });
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
