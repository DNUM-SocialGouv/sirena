import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFileFromMinio, uploadFileToMinio } from './minio.js';

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
    presignedUrl: vi.fn(),
    removeObject: vi.fn(),
    statObject: vi.fn(),
    getObject: vi.fn(),
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

    mockMinioClient.putObject.mockResolvedValue(undefined);
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
      expect(metadata['x-amz-meta-encryption-iv']).toBeDefined();
      expect(metadata['x-amz-meta-encryption-authtag']).toBeDefined();
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
    });
  });

  describe('deleteFileFromMinio', () => {
    it('should delete a file from MinIO', async () => {
      const filePath = 'uploads/test-file.pdf';
      await deleteFileFromMinio(filePath);
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('test-bucket', filePath);
    });
  });
});
