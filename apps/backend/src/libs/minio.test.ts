import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFileFromMinio, getSignedUrl, uploadFileToMinio } from './minio';

vi.mock('@/config/env', () => ({
  envVars: {
    S3_BUCKET_ACCESS_KEY: 'test-access-key',
    S3_BUCKET_SECRET_KEY: 'test-secret-key',
    S3_BUCKET_ENDPOINT: 'test-endpoint',
    S3_BUCKET_PORT: '9000',
    S3_BUCKET_NAME: 'test-bucket',
    S3_BUCKET_ROOT_DIR: 'uploads',
  },
}));

const { mockMinioClient, mockReadStream, mockUnlink } = vi.hoisted(() => {
  const mockMinioClient = {
    putObject: vi.fn(),
    presignedUrl: vi.fn(),
    removeObject: vi.fn(),
  };

  const mockReadStream = vi.fn();
  const mockUnlink = vi.fn();

  return { mockMinioClient, mockReadStream, mockUnlink };
});

vi.mock('minio', () => ({
  Client: vi.fn().mockImplementation(() => mockMinioClient),
}));

vi.mock('node:fs', () => ({
  default: {
    createReadStream: mockReadStream,
    unlink: mockUnlink,
  },
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid'),
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
    it('should successfully upload a file to MinIO', async () => {
      const filePath = '/tmp/test-file.pdf';
      const originalName = 'test-document.pdf';
      const contentType = 'application/pdf';

      const { objectPath } = await uploadFileToMinio(filePath, originalName, contentType);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'uploads/test-uuid.pdf',
        expect.any(Object),
        undefined,
        {
          'Content-Type': contentType,
          'x-amz-meta-filename': originalName,
        },
      );
      expect(objectPath).toBe('uploads/test-uuid.pdf');
    });

    it('should fallback to octet-stream if no contentType is provided', async () => {
      const filePath = '/tmp/test-file.pdf';
      const originalName = 'test-document.pdf';

      const { objectPath } = await uploadFileToMinio(filePath, originalName);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'uploads/test-uuid.pdf',
        expect.any(Object),
        undefined,
        {
          'Content-Type': 'application/octet-stream',
          'x-amz-meta-filename': originalName,
        },
      );
      expect(objectPath).toBe('uploads/test-uuid.pdf');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate a signed URL with default expiry', async () => {
      const filePath = 'uploads/test-file.pdf';
      const expectedUrl = 'https://test-signed-url.com';

      const result = await getSignedUrl(filePath);

      expect(mockMinioClient.presignedUrl).toHaveBeenCalledWith('GET', 'test-bucket', filePath, 60 * 60);
      expect(result).toBe(expectedUrl);
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
