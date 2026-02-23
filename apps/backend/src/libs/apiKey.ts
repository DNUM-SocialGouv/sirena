import { randomBytes, scryptSync } from 'node:crypto';
import { envVars } from '../config/env.js';

const SCRYPT_KEY_LENGTH = 32;

export function generateApiKey(): {
  key: string;
  hash: string;
  prefix: string;
} {
  const randomPart = randomBytes(32).toString('hex');
  const key = `sk_${randomPart}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 8);

  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return scryptSync(key, envVars.API_KEY_HASH_SALT, SCRYPT_KEY_LENGTH).toString('hex');
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^sk_[a-f0-9]{64}$/.test(key);
}
