import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_KEY_HASH_PREFIX } from '../../libs/apiKey.js';
import { prisma } from '../../libs/prisma.js';
import {
  findApiKeysByPrefix,
  markApiKeyAsExpired,
  updateApiKeyHash,
  updateApiKeyLastUsedAt,
} from './apiKeys.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    apiKey: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockedApiKey = vi.mocked(prisma.apiKey);

const EPOCH = new Date(0);

type ApiKeyRecord = Awaited<ReturnType<typeof findApiKeysByPrefix>>[number];

const apiKeyRecord: ApiKeyRecord = {
  id: 'api-key-id',
  accountId: 'account-id',
  keyHash: 'hash',
  keyPrefix: 'sk_aaaaa',
  status: 'ACTIVE',
  expiresAt: null,
  lastUsedAt: null,
  revokedAt: null,
  createdAt: EPOCH,
  updatedAt: EPOCH,
  account: {
    id: 'account-id',
    name: 'Third party account',
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
};

describe('apiKeys.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('findApiKeysByPrefix', () => {
    it('should look the records up by prefix and include the account', async () => {
      mockedApiKey.findMany.mockResolvedValueOnce([apiKeyRecord]);

      const result = await findApiKeysByPrefix('sk_aaaaa');

      expect(mockedApiKey.findMany).toHaveBeenCalledWith({
        where: { keyPrefix: 'sk_aaaaa' },
        include: { account: true },
      });
      expect(result).toEqual([apiKeyRecord]);
    });

    it('should return an empty list when no record shares the prefix', async () => {
      mockedApiKey.findMany.mockResolvedValueOnce([]);

      await expect(findApiKeysByPrefix('sk_zzzzz')).resolves.toEqual([]);
    });
  });

  describe('updateApiKeyHash', () => {
    it('should rewrite the hash of the given id', async () => {
      const keyHash = `${API_KEY_HASH_PREFIX}${'a'.repeat(64)}`;
      mockedApiKey.update.mockResolvedValueOnce({ ...apiKeyRecord, keyHash });

      const result = await updateApiKeyHash('api-key-id', keyHash);

      expect(mockedApiKey.update).toHaveBeenCalledWith({
        where: { id: 'api-key-id' },
        data: { keyHash },
      });
      expect(result.keyHash).toBe(keyHash);
    });

    it('should propagate the prisma error', async () => {
      mockedApiKey.update.mockRejectedValueOnce(new Error('unique constraint violation'));

      await expect(updateApiKeyHash('api-key-id', 'hash')).rejects.toThrow('unique constraint violation');
    });
  });

  describe('markApiKeyAsExpired', () => {
    it('should set the status to EXPIRED for the given id', async () => {
      mockedApiKey.update.mockResolvedValueOnce({ ...apiKeyRecord, status: 'EXPIRED' });

      const result = await markApiKeyAsExpired('api-key-id');

      expect(mockedApiKey.update).toHaveBeenCalledWith({
        where: { id: 'api-key-id' },
        data: { status: 'EXPIRED' },
      });
      expect(result.status).toBe('EXPIRED');
    });

    it('should propagate the prisma error', async () => {
      mockedApiKey.update.mockRejectedValueOnce(new Error('record not found'));

      await expect(markApiKeyAsExpired('missing-id')).rejects.toThrow('record not found');
    });
  });

  describe('updateApiKeyLastUsedAt', () => {
    it('should set lastUsedAt to the current date for the given id', async () => {
      vi.useFakeTimers();
      const now = new Date('2026-06-15T10:00:00.000Z');
      vi.setSystemTime(now);
      mockedApiKey.update.mockResolvedValueOnce({ ...apiKeyRecord, lastUsedAt: now });

      const result = await updateApiKeyLastUsedAt('api-key-id');

      expect(mockedApiKey.update).toHaveBeenCalledWith({
        where: { id: 'api-key-id' },
        data: { lastUsedAt: now },
      });
      expect(result.lastUsedAt).toEqual(now);
    });

    it('should propagate the prisma error', async () => {
      mockedApiKey.update.mockRejectedValueOnce(new Error('database unavailable'));

      await expect(updateApiKeyLastUsedAt('api-key-id')).rejects.toThrow('database unavailable');
    });
  });
});
