import { createHmac, scryptSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { API_KEY_HASH_PREFIX, generateApiKey, hashApiKey, hashApiKeyLegacy, isValidApiKeyFormat } from './apiKey.js';

const VALID_KEY = `sk_${'a'.repeat(64)}`;
const TEST_SALT = 'test-salt';
const SCRYPT_KEY_LENGTH = 32;

describe('apiKey.ts', () => {
  describe('generateApiKey', () => {
    it('should return a key matching the expected format', () => {
      const { key } = generateApiKey();

      expect(isValidApiKeyFormat(key)).toBe(true);
    });

    it('should return the hash of the generated key', () => {
      const { key, hash } = generateApiKey();

      expect(hash).toBe(hashApiKey(key));
    });

    it('should return the first 8 characters of the key as prefix', () => {
      const { key, prefix } = generateApiKey();

      expect(prefix).toBe(key.substring(0, 8));
      expect(prefix).toHaveLength(8);
    });

    it('should not generate the same key twice', () => {
      const first = generateApiKey();
      const second = generateApiKey();

      expect(first.key).not.toBe(second.key);
      expect(first.hash).not.toBe(second.hash);
    });
  });

  describe('hashApiKey', () => {
    it('should be deterministic for the same key', () => {
      expect(hashApiKey(VALID_KEY)).toBe(hashApiKey(VALID_KEY));
    });

    it('should return the current prefix followed by a 64 character hexadecimal digest', () => {
      const hash = hashApiKey(VALID_KEY);

      expect(hash.startsWith(API_KEY_HASH_PREFIX)).toBe(true);
      expect(hash.slice(API_KEY_HASH_PREFIX.length)).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return the HMAC-SHA256 digest keyed by the hash salt', () => {
      const expected = createHmac('sha256', TEST_SALT).update(VALID_KEY).digest('hex');

      expect(hashApiKey(VALID_KEY)).toBe(`${API_KEY_HASH_PREFIX}${expected}`);
    });

    it('should return different digests for keys differing by one character', () => {
      const other = `sk_${'a'.repeat(63)}b`;

      expect(hashApiKey(VALID_KEY)).not.toBe(hashApiKey(other));
    });

    it('should not return the key itself', () => {
      expect(hashApiKey(VALID_KEY)).not.toContain(VALID_KEY);
    });
  });

  describe('hashApiKeyLegacy', () => {
    it('should reproduce the digest the previous scrypt scheme stored', async () => {
      const expected = scryptSync(VALID_KEY, TEST_SALT, SCRYPT_KEY_LENGTH).toString('hex');

      await expect(hashApiKeyLegacy(VALID_KEY)).resolves.toBe(expected);
    });

    it('should return a digest without the current prefix, so both formats stay distinguishable', async () => {
      const legacyHash = await hashApiKeyLegacy(VALID_KEY);

      expect(legacyHash.startsWith(API_KEY_HASH_PREFIX)).toBe(false);
      expect(hashApiKey(VALID_KEY).startsWith(API_KEY_HASH_PREFIX)).toBe(true);
    });
  });

  describe('isValidApiKeyFormat', () => {
    it('should accept a key with the sk_ prefix and 64 lowercase hexadecimal characters', () => {
      expect(isValidApiKeyFormat(VALID_KEY)).toBe(true);
    });

    it.each([
      ['an empty string', ''],
      ['a missing sk_ prefix', 'a'.repeat(64)],
      ['a wrong prefix', `pk_${'a'.repeat(64)}`],
      ['a random part too short', `sk_${'a'.repeat(63)}`],
      ['a random part too long', `sk_${'a'.repeat(65)}`],
      ['uppercase hexadecimal characters', `sk_${'A'.repeat(64)}`],
      ['non hexadecimal characters', `sk_${'z'.repeat(64)}`],
      ['a trailing newline', `sk_${'a'.repeat(64)}\n`],
      ['surrounding whitespace', ` sk_${'a'.repeat(64)} `],
    ])('should reject a key with %s', (_label, key) => {
      expect(isValidApiKeyFormat(key)).toBe(false);
    });
  });
});
