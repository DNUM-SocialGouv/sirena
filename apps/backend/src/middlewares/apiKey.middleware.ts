import { throwHTTPException401Unauthorized, throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { ERROR_KIND } from '@sirena/common/constants';
import type { PinoLogger } from 'hono-pino';
import {
  countLegacyApiKeyHashes,
  findApiKeyByHash,
  markApiKeyAsExpired,
  updateApiKeyHash,
  updateApiKeyLastUsedAt,
} from '../features/apiKeys/apiKeys.service.js';
import factoryWithLogs from '../helpers/factories/appWithLogs.js';
import { hashApiKey, hashApiKeyLegacy, isValidApiKeyFormat } from '../libs/apiKey.js';

/**
 * Nominal path: one HMAC hash (a few microseconds) then the indexed lookup. The scrypt fallback is
 * only attempted while legacy hashes remain, and rewrites the record so it is paid once per key.
 */
const resolveApiKeyRecord = async (apiKey: string, logger: PinoLogger) => {
  const keyHash = hashApiKey(apiKey);
  const record = await findApiKeyByHash(keyHash);
  if (record) {
    return record;
  }

  const legacyCount = await countLegacyApiKeyHashes();
  if (legacyCount === 0) {
    return null;
  }

  const legacyRecord = await findApiKeyByHash(await hashApiKeyLegacy(apiKey));
  if (!legacyRecord) {
    return null;
  }

  try {
    await updateApiKeyHash(legacyRecord.id, keyHash);
  } catch (error) {
    logger.error({ err: error, apiKeyId: legacyRecord.id }, 'Failed to migrate API key hash to HMAC format');
  }

  return legacyRecord;
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

    const apiKeyRecord = await resolveApiKeyRecord(apiKey, logger);

    if (!apiKeyRecord) {
      throwHTTPException401Unauthorized('Invalid API key.', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

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

    updateApiKeyLastUsedAt(apiKeyRecord.id).catch((error) => {
      logger.error({ err: error }, 'Failed to update API key lastUsedAt');
    });

    c.set('apiKey', apiKeyRecord);

    await next();
  });
