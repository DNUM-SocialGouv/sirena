import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { envVars } from '../config/env.js';

const SCRYPT_KEY_LENGTH = 32;
const KEY_PREFIX_LENGTH = 8;

/** Marks hashes produced by the current scheme, so legacy scrypt ones stay recognizable. */
export const API_KEY_HASH_PREFIX = 'hmac256$';

const scryptAsync = promisify(scrypt);

export function generateApiKey(): {
  key: string;
  hash: string;
  prefix: string;
} {
  const randomPart = randomBytes(32).toString('hex');
  const key = `sk_${randomPart}`;
  const hash = hashApiKey(key);
  const prefix = apiKeyPrefix(key);

  return { key, hash, prefix };
}

/** Stored next to the hash, so a lookup can be narrowed without revealing the key. */
export function apiKeyPrefix(key: string): string {
  return key.substring(0, KEY_PREFIX_LENGTH);
}

/** HMAC: the key carries its own 256 bits of entropy, so a slow KDF would only cost us. */
export function hashApiKey(key: string): string {
  const digest = createHmac('sha256', envVars.API_KEY_HASH_SALT).update(key).digest('hex');
  return `${API_KEY_HASH_PREFIX}${digest}`;
}

/**
 * Legacy hash of keys issued before the HMAC scheme, kept until their migration completes.
 * Async on purpose: scrypt then runs on the libuv thread pool instead of the event loop.
 */
export async function hashApiKeyLegacy(key: string): Promise<string> {
  const derivedKey = (await scryptAsync(key, envVars.API_KEY_HASH_SALT, SCRYPT_KEY_LENGTH)) as Buffer;
  return derivedKey.toString('hex');
}

/** Compares stored hashes in constant time, so a partial match leaks nothing through timing. */
export function apiKeyHashEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);

  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^sk_[a-f0-9]{64}$/.test(key);
}
