import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEncryptionKey = 'a'.repeat(64);

vi.mock('@/config/env', () => ({
  envVars: {
    S3_ENCRYPTION_KEY: mockEncryptionKey,
  },
}));

describe('encryption', () => {
  let createEncryptionStream: typeof import('./encryption').createEncryptionStream;
  let createDecryptionStream: typeof import('./encryption').createDecryptionStream;
  let generateEncryptionKey: typeof import('./encryption').generateEncryptionKey;

  beforeEach(async () => {
    vi.clearAllMocks();
    const encryption = await import('./encryption');
    createEncryptionStream = encryption.createEncryptionStream;
    createDecryptionStream = encryption.createDecryptionStream;
    generateEncryptionKey = encryption.generateEncryptionKey;
  });

  describe('createEncryptionStream / createDecryptionStream', () => {
    it('should encrypt and decrypt data via streams', async () => {
      const originalData = Buffer.from('Stream test data');
      const inputStream = Readable.from(originalData);

      const { stream: encryptionStream, getMetadata } = createEncryptionStream();
      const encryptedChunks: Buffer[] = [];

      inputStream.pipe(encryptionStream);

      for await (const chunk of encryptionStream) {
        encryptedChunks.push(chunk);
      }

      const encryptedBuffer = Buffer.concat(encryptedChunks);
      const metadata = getMetadata();

      expect(metadata.iv).toHaveLength(24);
      expect(metadata.authTag).toHaveLength(32);

      const encryptedStream = Readable.from(encryptedBuffer);
      const decryptionStream = createDecryptionStream(metadata);
      const decryptedChunks: Buffer[] = [];

      encryptedStream.pipe(decryptionStream);

      for await (const chunk of decryptionStream) {
        decryptedChunks.push(chunk);
      }

      const decryptedBuffer = Buffer.concat(decryptedChunks);
      expect(decryptedBuffer.toString()).toBe(originalData.toString());
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid 64-character hex key', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });
});
