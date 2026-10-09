import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFileFromMinio, deleteFilesFromMinio, listMinioObjects, uploadFileToMinio } from './minio.js';

vi.mock('../config/env.js', () => ({
  envVars: {
    S3_BUCKET_ACCESS_KEY: 'test-access-key',
    S3_BUCKET_SECRET_KEY: 'test-secret-key',
    S3_BUCKET_ENDPOINT: 'test-endpoint',
    S3_BUCKET_PORT: '9000',
    S3_BUCKET_NAME: 'test-bucket',
    S3_BUCKET_ROOT_DIR: 'uploads',
    S3_ENCRYPTION_KEY: 'a'.repeat(64),
  },
}));

const { mockMinioClient, mockReadStream, mockUnlink, mockReadFile } = vi.hoisted(() => {
  const mockMinioClient = {
    putObject: vi.fn(),
    copyObject: vi.fn(),
    presignedUrl: vi.fn(),
    removeObject: vi.fn(),
    removeObjects: vi.fn(),
    statObject: vi.fn(),
    getObject: vi.fn(),
    listObjectsV2: vi.fn(),
  };

  const mockReadStream = vi.fn();
  const mockUnlink = vi.fn();
  const mockReadFile = vi.fn();

  return { mockMinioClient, mockReadStream, mockUnlink, mockReadFile };
});

vi.mock('minio', () => ({
  Client: function MockClient() {
    return mockMinioClient;
  },
  CopySourceOptions: class CopySourceOptions {
    constructor(opts: Record<string, unknown>) {
      Object.assign(this, opts);
    }
  },
  CopyDestinationOptions: class CopyDestinationOptions {
    constructor(opts: Record<string, unknown>) {
      Object.assign(this, opts);
    }
  },
}));

vi.mock('node:fs', () => ({
  default: {
    createReadStream: mockReadStream,
    unlink: mockUnlink,
    promises: {
      readFile: mockReadFile,
    },
  },
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid'),
  randomBytes: vi.fn().mockReturnValue(Buffer.alloc(12)),
  createCipheriv: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue(Buffer.from('encrypted')),
    final: vi.fn().mockReturnValue(Buffer.from('')),
    getAuthTag: vi.fn().mockReturnValue(Buffer.alloc(16)),
  }),
  createDecipheriv: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue(Buffer.from('decrypted')),
    final: vi.fn().mockReturnValue(Buffer.from('')),
    setAuthTag: vi.fn(),
  }),
}));

describe('minio.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // putObject must drain the source stream so the encryption Transform's
    // flush() fires and the AES-GCM auth tag becomes available.
    mockMinioClient.putObject.mockImplementation(async (_bucket: string, _key: string, source: unknown) => {
      if (source && typeof source === 'object' && 'on' in source) {
        for await (const _chunk of source as unknown as AsyncIterable<unknown>) {
          // drain
        }
      }
    });
    mockMinioClient.copyObject.mockResolvedValue(undefined);
    mockMinioClient.presignedUrl.mockResolvedValue('https://test-signed-url.com');
    mockReadStream.mockReturnValue({});
    mockUnlink.mockResolvedValue(undefined);
  });

  describe('uploadFileToMinio', () => {
    it('should successfully upload an encrypted file to MinIO', async () => {
      const fileBuffer = Buffer.from('test content');
      const originalName = 'test-document.pdf';
      const contentType = 'application/pdf';

      const { objectPath, encryptionMetadata } = await uploadFileToMinio(fileBuffer, originalName, contentType);

      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(objectPath).toBe('uploads/test-uuid.pdf');
      expect(encryptionMetadata).toBeDefined();
      expect(encryptionMetadata?.iv).toBeDefined();
      expect(encryptionMetadata?.authTag).toBeDefined();

      const putObjectCall = mockMinioClient.putObject.mock.calls[0];
      const metadata = putObjectCall[4];
      expect(metadata['Content-Type']).toBe(contentType);
      expect(metadata['x-amz-meta-filename']).toBe(originalName);
      expect(metadata['x-amz-meta-uploadedfileid']).toBe('test-uuid');
      expect(metadata['x-amz-meta-encrypted']).toBe('true');

      // After the encryption stream finalises, copyObject backfills iv +
      // authTag into the S3 object metadata so encrypted objects in S3 carry
      // everything needed to decrypt them.
      expect(mockMinioClient.copyObject).toHaveBeenCalledTimes(1);
      const [, dest] = mockMinioClient.copyObject.mock.calls[0];
      expect(dest.MetadataDirective).toBe('REPLACE');
      expect(dest.UserMetadata).toMatchObject({
        filename: originalName,
        uploadedfileid: 'test-uuid',
        encrypted: 'true',
        'encryption-iv': expect.any(String),
        'encryption-authtag': expect.any(String),
      });
    });

    it('should fallback to octet-stream if no contentType is provided', async () => {
      const fileBuffer = Buffer.from('test content');
      const originalName = 'test-document.pdf';

      const { objectPath, encryptionMetadata } = await uploadFileToMinio(fileBuffer, originalName);

      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(objectPath).toBe('uploads/test-uuid.pdf');
      expect(encryptionMetadata).toBeDefined();

      const putObjectCall = mockMinioClient.putObject.mock.calls[0];
      const metadata = putObjectCall[4];
      expect(metadata['Content-Type']).toBe('application/octet-stream');
      expect(metadata['x-amz-meta-encrypted']).toBe('true');

      expect(mockMinioClient.copyObject).toHaveBeenCalledTimes(1);
      const [, dest] = mockMinioClient.copyObject.mock.calls[0];
      expect(dest.UserMetadata['encryption-authtag']).toBeDefined();
    });
  });

  describe('deleteFileFromMinio', () => {
    it('should delete a file from MinIO', async () => {
      const filePath = 'uploads/test-file.pdf';
      await deleteFileFromMinio(filePath);
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('test-bucket', filePath);
    });
  });

  describe('deleteFilesFromMinio', () => {
    it('should return an empty array without calling the API when given no paths', async () => {
      const result = await deleteFilesFromMinio([]);
      expect(result).toEqual([]);
      expect(mockMinioClient.removeObjects).not.toHaveBeenCalled();
    });

    it('should delete a batch of files and return no errors when all succeed', async () => {
      mockMinioClient.removeObjects.mockResolvedValue([]);
      const paths = ['uploads/a.pdf', 'uploads/b.pdf'];

      const result = await deleteFilesFromMinio(paths);

      expect(mockMinioClient.removeObjects).toHaveBeenCalledWith('test-bucket', paths);
      expect(result).toEqual([]);
    });

    it('should report failed keys returned by the API', async () => {
      mockMinioClient.removeObjects.mockResolvedValue([{ Key: 'uploads/bad.pdf', Message: 'AccessDenied' }]);

      const result = await deleteFilesFromMinio(['uploads/bad.pdf']);

      expect(result).toEqual([{ key: 'uploads/bad.pdf', message: 'AccessDenied' }]);
    });

    it('should support the nested Error shape from the SDK typings', async () => {
      mockMinioClient.removeObjects.mockResolvedValue([{ Error: { Key: 'uploads/bad.pdf', Message: 'AccessDenied' } }]);

      const result = await deleteFilesFromMinio(['uploads/bad.pdf']);

      expect(result).toEqual([{ key: 'uploads/bad.pdf', message: 'AccessDenied' }]);
    });
  });

  describe('listMinioObjects', () => {
    const emitListing = (entries: Array<{ name: string; size: number; lastModified?: Date }>) => {
      const stream = new EventEmitter();
      mockMinioClient.listObjectsV2.mockReturnValue(stream);
      const promise = listMinioObjects();
      for (const entry of entries) stream.emit('data', entry);
      stream.emit('end');
      return promise;
    };

    it('resolves a name -> size map (not an array of {name,size,lastModified} objects)', async () => {
      const result = await emitListing([
        { name: 'uploads/a.pdf', size: 100, lastModified: new Date() },
        { name: 'uploads/b.pdf', size: 200, lastModified: new Date() },
      ]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('uploads/a.pdf')).toBe(100);
      expect(result.get('uploads/b.pdf')).toBe(200);
    });

    it('skips entries without a name', async () => {
      const result = await emitListing([{ name: '', size: 1 }]);
      expect(result.size).toBe(0);
    });

    it('rejects when the underlying stream errors', async () => {
      const stream = new EventEmitter();
      mockMinioClient.listObjectsV2.mockReturnValue(stream);
      const promise = listMinioObjects();
      stream.emit('error', new Error('boom'));
      await expect(promise).rejects.toThrow('boom');
    });

    it('uses the given prefix, defaulting to the configured root dir', async () => {
      const stream = new EventEmitter();
      mockMinioClient.listObjectsV2.mockReturnValue(stream);
      const promise = listMinioObjects('custom-prefix');
      stream.emit('end');
      await promise;
      expect(mockMinioClient.listObjectsV2).toHaveBeenCalledWith('test-bucket', 'custom-prefix', true);

      const stream2 = new EventEmitter();
      mockMinioClient.listObjectsV2.mockReturnValue(stream2);
      const promise2 = listMinioObjects();
      stream2.emit('end');
      await promise2;
      expect(mockMinioClient.listObjectsV2).toHaveBeenCalledWith('test-bucket', 'uploads', true);
    });
  });
});
