import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEncryptionKey = 'a'.repeat(64);

vi.mock('@/config/env', () => ({
  envVars: {
    S3_ENCRYPTION_KEY: mockEncryptionKey,
  },
}));

describe('encryption', () => {
  let encryptBuffer: typeof import('./encryption').encryptBuffer;
  let decryptBuffer: typeof import('./encryption').decryptBuffer;
  let createEncryptionStream: typeof import('./encryption').createEncryptionStream;
  let createDecryptionStream: typeof import('./encryption').createDecryptionStream;
  let generateEncryptionKey: typeof import('./encryption').generateEncryptionKey;

  beforeEach(async () => {
    vi.clearAllMocks();
    const encryption = await import('./encryption');
    encryptBuffer = encryption.encryptBuffer;
    decryptBuffer = encryption.decryptBuffer;
    createEncryptionStream = encryption.createEncryptionStream;
    createDecryptionStream = encryption.createDecryptionStream;
    generateEncryptionKey = encryption.generateEncryptionKey;
  });

  describe('encryptBuffer / decryptBuffer', () => {
    it('should encrypt and decrypt a buffer correctly', () => {
      const originalData = Buffer.from('Hello, World! This is a test message.');

      const encrypted = encryptBuffer(originalData);

      expect(encrypted.iv).toHaveLength(24);
      expect(encrypted.authTag).toHaveLength(32);
      expect(encrypted.encryptedBuffer).toBeInstanceOf(Buffer);
      expect(encrypted.encryptedBuffer.toString()).not.toBe(originalData.toString());

      const decrypted = decryptBuffer(encrypted.encryptedBuffer, {
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      });

      expect(decrypted.toString()).toBe(originalData.toString());
    });

    it('should produce different ciphertexts for the same plaintext (different IVs)', () => {
      const originalData = Buffer.from('Same message');

      const encrypted1 = encryptBuffer(originalData);
      const encrypted2 = encryptBuffer(originalData);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedBuffer.toString('hex')).not.toBe(encrypted2.encryptedBuffer.toString('hex'));
    });

    it('should fail decryption with wrong auth tag', () => {
      const originalData = Buffer.from('Test data');
      const encrypted = encryptBuffer(originalData);

      expect(() =>
        decryptBuffer(encrypted.encryptedBuffer, {
          iv: encrypted.iv,
          authTag: 'b'.repeat(32),
        }),
      ).toThrow();
    });

    it('should fail decryption with wrong IV', () => {
      const originalData = Buffer.from('Test data');
      const encrypted = encryptBuffer(originalData);

      expect(() =>
        decryptBuffer(encrypted.encryptedBuffer, {
          iv: 'c'.repeat(24),
          authTag: encrypted.authTag,
        }),
      ).toThrow();
    });

    it('should handle empty buffers', () => {
      const originalData = Buffer.from('');

      const encrypted = encryptBuffer(originalData);
      const decrypted = decryptBuffer(encrypted.encryptedBuffer, {
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      });

      expect(decrypted.toString()).toBe('');
    });

    it('should handle large buffers', () => {
      const originalData = Buffer.alloc(1024 * 1024, 'x');

      const encrypted = encryptBuffer(originalData);
      const decrypted = decryptBuffer(encrypted.encryptedBuffer, {
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      });

      expect(decrypted.length).toBe(originalData.length);
      expect(decrypted.toString()).toBe(originalData.toString());
    });
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
