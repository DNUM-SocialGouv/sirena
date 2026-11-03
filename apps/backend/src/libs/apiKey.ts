import { createHmac, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { envVars } from '../config/env.js';

const SCRYPT_KEY_LENGTH = 32;

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
  const prefix = key.substring(0, 8);

  return { key, hash, prefix };
}

/**
 * A key carries 256 bits of entropy from `randomBytes`, so it is not dictionary-attackable and a
 * slow KDF would only cost the server. Keying the HMAC with `API_KEY_HASH_SALT` keeps the hash
 * non-invertible and unforgeable without that secret.
 */
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

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^sk_[a-f0-9]{64}$/.test(key);
}
