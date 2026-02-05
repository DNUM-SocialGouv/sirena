import { createHash, randomBytes } from 'node:crypto';

/**
 * Generate a new API key
 * Format: sk_{64-character-hex}
 */
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

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^sk_[a-f0-9]{64}$/.test(key);
}
