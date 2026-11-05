import type { PinoLogger } from 'hono-pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findApiKeysByPrefix,
  markApiKeyAsExpired,
  updateApiKeyHash,
  updateApiKeyLastUsedAt,
} from '../features/apiKeys/apiKeys.service.js';
import { errorHandler } from '../helpers/errors.js';
import appWithLogs from '../helpers/factories/appWithLogs.js';
import { apiKeyPrefix, hashApiKey, hashApiKeyLegacy } from '../libs/apiKey.js';
import { apiKeyAuth } from './apiKey.middleware.js';

vi.mock('../features/apiKeys/apiKeys.service.js', () => ({
  findApiKeysByPrefix: vi.fn(),
  markApiKeyAsExpired: vi.fn(),
  updateApiKeyHash: vi.fn(),
  updateApiKeyLastUsedAt: vi.fn(),
}));

const VALID_KEY = `sk_${'a'.repeat(64)}`;
const EPOCH = new Date(0);

type ApiKeyRecord = Awaited<ReturnType<typeof findApiKeysByPrefix>>[number];

type FakeLogger = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

const buildApiKeyRecord = (overrides: Partial<ApiKeyRecord> = {}): ApiKeyRecord => ({
  id: 'api-key-id',
  accountId: 'account-id',
  keyHash: hashApiKey(VALID_KEY),
  keyPrefix: apiKeyPrefix(VALID_KEY),
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
  ...overrides,
});

function createTestApp(logger: FakeLogger) {
  return appWithLogs
    .createApp()
    .use('*', (c, next) => {
      c.set('logger', logger as unknown as PinoLogger);
      return next();
    })
    .use('*', apiKeyAuth())
    .get('/test', (c) =>
      c.json({
        apiKeyId: c.get('apiKey')?.id ?? null,
        accountId: c.get('apiKey')?.account.id ?? null,
      }),
    )
    .onError(errorHandler);
}

describe('apiKey.middleware.ts', () => {
  let logger: FakeLogger;
  let app: ReturnType<typeof createTestApp>;

  const request = (headers: Record<string, string> = { 'X-API-Key': VALID_KEY }) => app.request('/test', { headers });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateApiKeyLastUsedAt).mockResolvedValue(buildApiKeyRecord());
    vi.mocked(markApiKeyAsExpired).mockResolvedValue(buildApiKeyRecord({ status: 'EXPIRED' }));
    vi.mocked(updateApiKeyHash).mockResolvedValue(buildApiKeyRecord());
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([]);

    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    app = createTestApp(logger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should answer 401 when the X-API-Key header is missing', async () => {
    const res = await request({});

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ message: 'API key is required. Include X-API-Key header.' });
    expect(findApiKeysByPrefix).not.toHaveBeenCalled();
  });

  it('should answer 401 when the key does not match the expected format', async () => {
    const res = await request({ 'X-API-Key': 'not-a-valid-key' });

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ message: 'Invalid API key format.' });
    expect(findApiKeysByPrefix).not.toHaveBeenCalled();
  });

  it('should answer 401 when no record shares the presented key prefix', async () => {
    const res = await request();

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ message: 'Invalid API key.' });
    expect(findApiKeysByPrefix).toHaveBeenCalledExactlyOnceWith(apiKeyPrefix(VALID_KEY));
    expect(updateApiKeyLastUsedAt).not.toHaveBeenCalled();
  });

  it('should answer 401 when the records sharing the prefix are all on the current scheme', async () => {
    const otherKey = `sk_${'b'.repeat(64)}`;
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ keyHash: hashApiKey(otherKey) })]);

    const res = await request();

    expect(res.status).toBe(401);
    expect(findApiKeysByPrefix).toHaveBeenCalledExactlyOnceWith(apiKeyPrefix(VALID_KEY));
    expect(updateApiKeyHash).not.toHaveBeenCalled();
  });

  it('should answer 401 when the key matches neither the current nor the legacy hash', async () => {
    const otherKey = `sk_${'b'.repeat(64)}`;
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([
      buildApiKeyRecord({ keyHash: await hashApiKeyLegacy(otherKey) }),
    ]);

    const res = await request();

    expect(res.status).toBe(401);
    expect(updateApiKeyHash).not.toHaveBeenCalled();
  });

  it('should let a key still stored with the legacy scrypt hash through, and rewrite it', async () => {
    const legacyHash = await hashApiKeyLegacy(VALID_KEY);
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ keyHash: legacyHash })]);

    const res = await request();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ apiKeyId: 'api-key-id', accountId: 'account-id' });
    expect(updateApiKeyHash).toHaveBeenCalledWith('api-key-id', hashApiKey(VALID_KEY));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should let a legacy key through and log the error when its hash cannot be rewritten', async () => {
    const error = new Error('write conflict');
    const legacyHash = await hashApiKeyLegacy(VALID_KEY);
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ keyHash: legacyHash })]);
    vi.mocked(updateApiKeyHash).mockRejectedValue(error);

    const res = await request();

    expect(res.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, apiKeyId: 'api-key-id' },
      'Failed to migrate API key hash to HMAC format',
    );
  });

  it('should answer 403 when the key is revoked', async () => {
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ status: 'REVOKED' })]);

    const res = await request();

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ message: 'This API key has been revoked.' });
    expect(updateApiKeyLastUsedAt).not.toHaveBeenCalled();
    expect(markApiKeyAsExpired).not.toHaveBeenCalled();
  });

  it('should answer 403 when the key is suspended', async () => {
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ status: 'SUSPENDED' })]);

    const res = await request();

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ message: 'This API key has been suspended.' });
    expect(updateApiKeyLastUsedAt).not.toHaveBeenCalled();
    expect(markApiKeyAsExpired).not.toHaveBeenCalled();
  });

  it('should answer 403 and mark the key as expired when expiresAt is in the past', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00.000Z'));
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ expiresAt: new Date(Date.now() - 1_000) })]);

    const res = await request();

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ message: 'This API key has expired.' });
    expect(markApiKeyAsExpired).toHaveBeenCalledWith('api-key-id');
    expect(updateApiKeyLastUsedAt).not.toHaveBeenCalled();
  });

  it('should let the request through when expiresAt is in the future', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00.000Z'));
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ expiresAt: new Date(Date.now() + 1_000) })]);

    const res = await request();

    expect(res.status).toBe(200);
    expect(markApiKeyAsExpired).not.toHaveBeenCalled();
  });

  it('should call next with the api key in context when the key is active', async () => {
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord()]);

    const res = await request();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ apiKeyId: 'api-key-id', accountId: 'account-id' });
    expect(updateApiKeyLastUsedAt).toHaveBeenCalledWith('api-key-id');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should answer without waiting for the lastUsedAt background write to settle', async () => {
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord()]);
    vi.mocked(updateApiKeyLastUsedAt).mockReturnValue(new Promise(() => {}));

    const res = await request();

    expect(res.status).toBe(200);
  });

  it('should not rewrite the hash of a legacy key that is revoked', async () => {
    const legacyHash = await hashApiKeyLegacy(VALID_KEY);
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ keyHash: legacyHash, status: 'REVOKED' })]);

    const res = await request();

    expect(res.status).toBe(403);
    expect(updateApiKeyHash).not.toHaveBeenCalled();
  });

  it('should still accept a key a sibling request has already rewritten', async () => {
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord({ keyHash: hashApiKey(VALID_KEY) })]);

    const res = await request();

    expect(res.status).toBe(200);
    expect(findApiKeysByPrefix).toHaveBeenCalledOnce();
    expect(updateApiKeyHash).not.toHaveBeenCalled();
  });

  it('should answer 200 and log the error when the lastUsedAt background write fails', async () => {
    const error = new Error('database unavailable');
    vi.mocked(findApiKeysByPrefix).mockResolvedValue([buildApiKeyRecord()]);
    vi.mocked(updateApiKeyLastUsedAt).mockRejectedValue(error);

    const res = await request();

    expect(res.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith({ err: error }, 'Failed to update API key lastUsedAt');
  });
});
