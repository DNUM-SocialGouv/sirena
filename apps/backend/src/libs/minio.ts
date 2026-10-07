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

const S3_METADATA_TIMEOUT_MS = 15_000;
// Body transfers are slow by nature but not infinite: with no bound, a connection that hangs
// instead of failing would hold a guard slot forever. 200 MB (MAX_FILE_SIZE) at ~150 kB/s leaves
// a very wide margin on a degraded link.
const S3_BODY_TIMEOUT_MS = 20 * 60 * 1000;
const S3_MAX_CONCURRENT_CALLS = 32;
// Past this, a call fails instead of waiting: an unbounded queue would reproduce the very
// pile-up of doomed requests this guard exists to prevent.
const S3_MAX_QUEUED_CALLS = 64;
const S3_QUEUE_TIMEOUT_MS = 10_000;
const S3_CIRCUIT_FAILURE_THRESHOLD = 5;
const S3_CIRCUIT_RESET_TIMEOUT_MS = 20_000;

/**
 * Every S3 operation goes through this single guard, so that during a provider outage the backend
 * stops piling up doomed requests. See docs/postmortem-2026-10-07.md.
 */
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

/**
 * One source of truth, shared with the worker: the code set in resilience.ts includes
 * DEPENDENCY_UNAVAILABLE, so an open circuit is recognised here as a storage outage. Two
 * separate predicates would have returned a 500 for the whole duration of an outage.
 */
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

  await s3Guard.run('removeObject', () => minioClient.removeObject(S3_BUCKET_NAME, filePath), S3_METADATA_TIMEOUT_MS);
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
