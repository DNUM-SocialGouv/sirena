import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  envVars: {
    S3_MIGRATION_BUCKET_ACCESS_KEY: 'migration-access-key',
    S3_MIGRATION_BUCKET_SECRET_KEY: 'migration-secret-key',
    S3_MIGRATION_BUCKET_NAME: 'migration-bucket',
    S3_BUCKET_ENDPOINT: 'test-endpoint',
    S3_BUCKET_PORT: '9000',
  },
}));

const { mockMinioClient } = vi.hoisted(() => ({
  mockMinioClient: { getObject: vi.fn() },
}));

vi.mock('minio', () => ({
  Client: function MockClient() {
    return mockMinioClient;
  },
}));

import { buildSirecFileObjectPath, getSirecFileStream } from './sirecMigration.filesMinio.js';

describe('sirecMigration.filesMinio.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildSirecFileObjectPath', () => {
    it('should build the object path from sirecId and generatedName', () => {
      expect(buildSirecFileObjectPath(42, 'a1b2c3.pdf')).toBe('files/42/a1b2c3.pdf');
    });
  });

  describe('getSirecFileStream', () => {
    it('should fetch the object at the expected path in the migration bucket', async () => {
      const fakeStream = {};
      mockMinioClient.getObject.mockResolvedValueOnce(fakeStream);

      const result = await getSirecFileStream(42, 'a1b2c3.pdf');

      expect(result).toBe(fakeStream);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('migration-bucket', 'files/42/a1b2c3.pdf');
    });

    it('should use mockFilePath instead of the computed path when provided', async () => {
      const fakeStream = {};
      mockMinioClient.getObject.mockResolvedValueOnce(fakeStream);

      const result = await getSirecFileStream(42, 'a1b2c3.pdf', '/files/mockfile');

      expect(result).toBe(fakeStream);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('migration-bucket', '/files/mockfile');
    });
  });
});
