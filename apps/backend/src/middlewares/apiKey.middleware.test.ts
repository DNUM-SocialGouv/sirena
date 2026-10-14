import type { PinoLogger } from 'hono-pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findApiKeyByHash, markApiKeyAsExpired, updateApiKeyLastUsedAt } from '../features/apiKeys/apiKeys.service.js';
import { errorHandler } from '../helpers/errors.js';
import appWithLogs from '../helpers/factories/appWithLogs.js';
import { hashApiKey } from '../libs/apiKey.js';
import { apiKeyAuth } from './apiKey.middleware.js';

vi.mock('../features/apiKeys/apiKeys.service.js', () => ({
  findApiKeyByHash: vi.fn(),
  markApiKeyAsExpired: vi.fn(),
  updateApiKeyLastUsedAt: vi.fn(),
}));

const VALID_KEY = `sk_${'a'.repeat(64)}`;
const EPOCH = new Date(0);

type ApiKeyRecord = NonNullable<Awaited<ReturnType<typeof findApiKeyByHash>>>;

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
  keyPrefix: VALID_KEY.substring(0, 8),
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
    expect(findApiKeyByHash).not.toHaveBeenCalled();
  });

  it('should answer 401 when the key does not match the expected format', async () => {
    const res = await request({ 'X-API-Key': 'not-a-valid-key' });

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ message: 'Invalid API key format.' });
    expect(findApiKeyByHash).not.toHaveBeenCalled();
  });

  it('should answer 401 when no key matches the hash in database', async () => {
    vi.mocked(findApiKeyByHash).mockResolvedValue(null);

    const res = await request();

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ message: 'Invalid API key.' });
    expect(findApiKeyByHash).toHaveBeenCalledWith(hashApiKey(VALID_KEY));
    expect(updateApiKeyLastUsedAt).not.toHaveBeenCalled();
  });

  it('should answer 403 when the key is revoked', async () => {
    vi.mocked(findApiKeyByHash).mockResolvedValue(buildApiKeyRecord({ status: 'REVOKED' }));

    const res = await request();

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ message: 'This API key has been revoked.' });
    expect(updateApiKeyLastUsedAt).not.toHaveBeenCalled();
    expect(markApiKeyAsExpired).not.toHaveBeenCalled();
  });

  it('should answer 403 when the key is suspended', async () => {
    vi.mocked(findApiKeyByHash).mockResolvedValue(buildApiKeyRecord({ status: 'SUSPENDED' }));

    const res = await request();

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ message: 'This API key has been suspended.' });
    expect(updateApiKeyLastUsedAt).not.toHaveBeenCalled();
    expect(markApiKeyAsExpired).not.toHaveBeenCalled();
  });

  it('should answer 403 and mark the key as expired when expiresAt is in the past', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00.000Z'));
    vi.mocked(findApiKeyByHash).mockResolvedValue(buildApiKeyRecord({ expiresAt: new Date(Date.now() - 1_000) }));

    const res = await request();

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ message: 'This API key has expired.' });
    expect(markApiKeyAsExpired).toHaveBeenCalledWith('api-key-id');
    expect(updateApiKeyLastUsedAt).not.toHaveBeenCalled();
  });

  it('should let the request through when expiresAt is in the future', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00.000Z'));
    vi.mocked(findApiKeyByHash).mockResolvedValue(buildApiKeyRecord({ expiresAt: new Date(Date.now() + 1_000) }));

    const res = await request();

    expect(res.status).toBe(200);
    expect(markApiKeyAsExpired).not.toHaveBeenCalled();
  });

  it('should call next with the api key in context when the key is active', async () => {
    vi.mocked(findApiKeyByHash).mockResolvedValue(buildApiKeyRecord());

    const res = await request();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ apiKeyId: 'api-key-id', accountId: 'account-id' });
    expect(updateApiKeyLastUsedAt).toHaveBeenCalledWith('api-key-id');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should answer without waiting for the lastUsedAt background write to settle', async () => {
    vi.mocked(findApiKeyByHash).mockResolvedValue(buildApiKeyRecord());
    vi.mocked(updateApiKeyLastUsedAt).mockReturnValue(new Promise(() => {}));

    const res = await request();

    expect(res.status).toBe(200);
  });

  it('should answer 200 and log the error when the lastUsedAt background write fails', async () => {
    const error = new Error('database unavailable');
    vi.mocked(findApiKeyByHash).mockResolvedValue(buildApiKeyRecord());
    vi.mocked(updateApiKeyLastUsedAt).mockRejectedValue(error);

    const res = await request();

    expect(res.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith({ err: error }, 'Failed to update API key lastUsedAt');
  });
});
