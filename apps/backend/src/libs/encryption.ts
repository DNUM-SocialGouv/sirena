import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Transform } from 'node:stream';
import { envVars } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const getEncryptionKey = (): Buffer => {
  const keyHex = envVars.S3_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== KEY_LENGTH * 2) {
    throw new Error('S3_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
};

export interface DecryptionParams {
  iv: string;
  authTag: string;
}

/**
 * Creates an encryption transform stream for streaming encryption
 */
export const createEncryptionStream = (): {
  stream: Transform;
  getMetadata: () => { iv: string; authTag: string };
} => {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let authTag: Buffer | null = null;

  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      try {
        const encrypted = cipher.update(chunk);
        callback(null, encrypted);
      } catch (err) {
        callback(err as Error);
      }
    },
    flush(callback) {
      try {
        const final = cipher.final();
        authTag = cipher.getAuthTag();
        callback(null, final);
      } catch (err) {
        callback(err as Error);
      }
    },
  });

  return {
    stream: transform,
    getMetadata: () => {
      if (!authTag) {
        throw new Error('Encryption not finalized yet');
      }
      return {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    },
  };
};

/**
 * Creates a decryption transform stream for streaming decryption
 */
export const createDecryptionStream = (params: DecryptionParams): Transform => {
  const key = getEncryptionKey();
  const iv = Buffer.from(params.iv, 'hex');
  const authTag = Buffer.from(params.authTag, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return new Transform({
    transform(chunk, _encoding, callback) {
      try {
        const decrypted = decipher.update(chunk);
        callback(null, decrypted);
      } catch (err) {
        callback(err as Error);
      }
    },
    flush(callback) {
      try {
        const final = decipher.final();
        callback(null, final);
      } catch (err) {
        callback(err as Error);
      }
    },
  });
};

/**
 * Helper to generate a new encryption key (for initial setup)
 */
export const generateEncryptionKey = (): string => {
  return randomBytes(KEY_LENGTH).toString('hex');
};
