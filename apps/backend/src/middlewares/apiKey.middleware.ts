import { throwHTTPException401Unauthorized, throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { ERROR_KIND } from '@sirena/common/constants';
import {
  findApiKeysByPrefix,
  markApiKeyAsExpired,
  updateApiKeyHash,
  updateApiKeyLastUsedAt,
} from '../features/apiKeys/apiKeys.service.js';
import factoryWithLogs from '../helpers/factories/appWithLogs.js';
import {
  API_KEY_HASH_PREFIX,
  apiKeyHashEquals,
  apiKeyPrefix,
  hashApiKey,
  hashApiKeyLegacy,
  isValidApiKeyFormat,
} from '../libs/apiKey.js';

/**
 * One read on the stored prefix, then the match is decided in memory. A key no record shares a
 * prefix with never reaches scrypt, and no second read can be invalidated by a sibling request
 * rewriting the same record.
 */
const resolveApiKeyRecord = async (apiKey: string) => {
  const candidates = await findApiKeysByPrefix(apiKeyPrefix(apiKey));
  if (candidates.length === 0) {
    return null;
  }

  const keyHash = hashApiKey(apiKey);
  const current = candidates.find((candidate) => apiKeyHashEquals(candidate.keyHash, keyHash));
  if (current) {
    return { record: current, staleHash: false };
  }

  const legacyCandidates = candidates.filter((candidate) => !candidate.keyHash.startsWith(API_KEY_HASH_PREFIX));
  if (legacyCandidates.length === 0) {
    return null;
  }

  const legacyHash = await hashApiKeyLegacy(apiKey);
  const legacyRecord = legacyCandidates.find((candidate) => apiKeyHashEquals(candidate.keyHash, legacyHash));

  return legacyRecord ? { record: legacyRecord, staleHash: true } : null;
};

export const apiKeyAuth = () =>
  factoryWithLogs.createMiddleware(async (c, next) => {
    const logger = c.get('logger');

    const apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      throwHTTPException401Unauthorized('API key is required. Include X-API-Key header.', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }

    if (!isValidApiKeyFormat(apiKey)) {
      throwHTTPException401Unauthorized('Invalid API key format.', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    const resolved = await resolveApiKeyRecord(apiKey);

    if (!resolved) {
      throwHTTPException401Unauthorized('Invalid API key.', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    const apiKeyRecord = resolved.record;

    if (apiKeyRecord.status === 'REVOKED') {
      throwHTTPException403Forbidden('This API key has been revoked.', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    if (apiKeyRecord.status === 'SUSPENDED') {
      throwHTTPException403Forbidden('This API key has been suspended.', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      await markApiKeyAsExpired(apiKeyRecord.id);
      throwHTTPException403Forbidden('This API key has expired.', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    // Only once the key is known good, so a revoked legacy key cannot drive writes on every call.
    if (resolved.staleHash) {
      updateApiKeyHash(apiKeyRecord.id, hashApiKey(apiKey)).catch((error) => {
        logger.error({ err: error, apiKeyId: apiKeyRecord.id }, 'Failed to migrate API key hash to HMAC format');
      });
    }

    updateApiKeyLastUsedAt(apiKeyRecord.id).catch((error) => {
      logger.error({ err: error }, 'Failed to update API key lastUsedAt');
    });

    c.set('apiKey', apiKeyRecord);

    await next();
  });
