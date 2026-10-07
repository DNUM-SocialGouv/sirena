import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Client, CopyDestinationOptions, CopySourceOptions } from 'minio';
import { envVars } from '../config/env.js';
import { recordDependencyCall } from '../features/monitoring/metrics.dependencies.js';
import { createDefaultLogger } from '../helpers/pino.js';
import { loggerStorage } from './asyncLocalStorage.js';
import { createDecryptionStream, createEncryptionStream, type DecryptionParams } from './encryption.js';
import { createDependencyGuard, isTransientDependencyError } from './resilience.js';

const {
  S3_BUCKET_ACCESS_KEY,
  S3_BUCKET_SECRET_KEY,
  S3_BUCKET_ENDPOINT,
  S3_BUCKET_PORT,
  S3_BUCKET_NAME,
  S3_BUCKET_ROOT_DIR,
} = envVars;

const S3_MAX_SOCKETS = 32;
const S3_SOCKET_TIMEOUT_MS = 30_000;
const S3_MAX_RETRIES = 2;
const S3_RETRY_BASE_DELAY_MS = 200;
const S3_RETRY_MAX_DELAY_MS = 2_000;
// Without this, minio derives partSize from the 5 TiB max object size and buffers ~550 MiB blocks.
const S3_PART_SIZE = 16 * 1024 * 1024;

const useSSL = S3_BUCKET_PORT === '443';
const TransportAgent = useSSL ? HttpsAgent : HttpAgent;

const S3_METADATA_TIMEOUT_MS = 15_000;
// 200 MB (MAX_FILE_SIZE) at ~150 kB/s: an upper bound, so a hung transfer cannot hold a slot forever.
const S3_BODY_TIMEOUT_MS = 20 * 60 * 1000;
const S3_MAX_CONCURRENT_CALLS = 32;
const S3_MAX_QUEUED_CALLS = 64;
const S3_QUEUE_TIMEOUT_MS = 10_000;
const S3_CIRCUIT_FAILURE_THRESHOLD = 5;
const S3_CIRCUIT_RESET_TIMEOUT_MS = 20_000;

const s3Guard = createDependencyGuard({
  name: 's3',
  maxConcurrent: S3_MAX_CONCURRENT_CALLS,
  maxQueued: S3_MAX_QUEUED_CALLS,
  queueTimeoutMs: S3_QUEUE_TIMEOUT_MS,
  failureThreshold: S3_CIRCUIT_FAILURE_THRESHOLD,
  resetTimeoutMs: S3_CIRCUIT_RESET_TIMEOUT_MS,
  isTransient: isTransientDependencyError,
  onCall: recordDependencyCall,
});

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

// Shared with the worker: resilience.ts counts an open circuit (DEPENDENCY_UNAVAILABLE) as transient.
export const isStorageUnavailableError = isTransientDependencyError;

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
      s3Guard.run(
        'putObject',
        () => minioClient.putObject(S3_BUCKET_NAME, objectPath, encryptStream, size, baseHeaders),
        S3_BODY_TIMEOUT_MS,
      ),
      encryption,
    ]);
  } catch (err) {
    encryptStream.destroy(err as Error);
    throw err;
  }

  const encryptionMetadata = getMetadata();

  try {
    const copySource = new CopySourceOptions({ Bucket: S3_BUCKET_NAME, Object: objectPath });
    const copyDestination = new CopyDestinationOptions({
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
    });

    await s3Guard.run('copyObject', () => minioClient.copyObject(copySource, copyDestination), S3_METADATA_TIMEOUT_MS);
  } catch (err) {
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

  await s3Guard.run('removeObject', () => minioClient.removeObject(S3_BUCKET_NAME, filePath), S3_METADATA_TIMEOUT_MS);
};

export interface RemoveObjectsError {
  key: string;
  message: string;
}

/**
 * Deletes multiple objects from MinIO in a single call to the DeleteObjects API.
 *
 * The caller is responsible for chunking `filePaths` to a reasonable size:
 * the underlying S3/MinIO API accepts at most 1000 keys per request, and the
 * minio SDK would otherwise split larger inputs into parallel sub-requests,
 * which can overwhelm the server when deleting hundreds of thousands of keys.
 *
 * Returns the list of keys that failed to delete (S3 reports only failures,
 * successful deletions are silent).
 */
export const deleteFilesFromMinio = async (filePaths: string[]): Promise<RemoveObjectsError[]> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }
  if (filePaths.length === 0) return [];

  const results = await minioClient.removeObjects(S3_BUCKET_NAME, filePaths);

  // The minio SDK's published types wrap each failure under `.Error`, but at
  // runtime the parsed XML <Error> entries are returned directly with `Key`/
  // `Message` on them. Support both shapes defensively.
  return results
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => {
      const entry = 'Error' in r && r.Error ? r.Error : r;
      return {
        key: (entry as { Key?: string }).Key ?? '(unknown key)',
        message: (entry as { Message?: string }).Message ?? 'Unknown error',
      };
    });
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

  const stat = await s3Guard.run(
    'statObject',
    () => minioClient.statObject(S3_BUCKET_NAME, filePath),
    S3_METADATA_TIMEOUT_MS,
  );
  const encrypted = stat.metaData?.encrypted === 'true';
  const contentType = stat.metaData?.['content-type'];
  const originalName = stat.metaData?.filename;

  const stream = await s3Guard.run(
    'getObject',
    () => minioClient.getObject(S3_BUCKET_NAME, filePath),
    S3_METADATA_TIMEOUT_MS,
  );

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

/**
 * Lists every object in the bucket in a single pass as a `name -> size` map,
 * without materializing a `{name, size, lastModified}` object per entry: at
 * hundreds of thousands of objects, that per-entry `Date` (unused beyond an
 * occasional log line) is the single biggest avoidable memory cost.
 */
export const listMinioObjects = async (prefix?: string): Promise<Map<string, number>> => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }

  const effectivePrefix = prefix ?? S3_BUCKET_ROOT_DIR;
  const stream = minioClient.listObjectsV2(S3_BUCKET_NAME, effectivePrefix, true);

  return new Promise((resolve, reject) => {
    const sizeByName = new Map<string, number>();
    stream.on('data', (obj) => {
      if (obj.name) sizeByName.set(obj.name, obj.size);
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(sizeByName));
  });
};

export const statMinioObject = async (filePath: string) => {
  if (!minioClient) {
    throw new Error('MinIO client not initialized, check your S3_BUCKET_ENDPOINT');
  }
  return s3Guard.run('statObject', () => minioClient.statObject(S3_BUCKET_NAME, filePath), S3_METADATA_TIMEOUT_MS);
};

export const getFileBuffer = async (filePath: string, decryptionParams?: DecryptionParams): Promise<Buffer> => {
  const { stream } = await getFileStream(filePath, decryptionParams);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
