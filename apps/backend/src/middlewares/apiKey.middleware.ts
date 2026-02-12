import { throwHTTPException401Unauthorized, throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { findApiKeyByHash, markApiKeyAsExpired, updateApiKeyLastUsedAt } from '../features/apiKeys/apiKeys.service.js';
import factoryWithLogs from '../helpers/factories/appWithLogs.js';
import { hashApiKey, isValidApiKeyFormat } from '../libs/apiKey.js';

export const apiKeyAuth = () =>
  factoryWithLogs.createMiddleware(async (c, next) => {
    const logger = c.get('logger');

    const apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      throwHTTPException401Unauthorized('API key is required. Include X-API-Key header.', { res: c.res });
    }

    if (!isValidApiKeyFormat(apiKey)) {
      throwHTTPException401Unauthorized('Invalid API key format.', { res: c.res });
    }

    const keyHash = hashApiKey(apiKey);
    const apiKeyRecord = await findApiKeyByHash(keyHash);

    if (!apiKeyRecord) {
      throwHTTPException401Unauthorized('Invalid API key.', { res: c.res });
    }

    if (apiKeyRecord.status === 'REVOKED') {
      throwHTTPException403Forbidden('This API key has been revoked.', { res: c.res });
    }

    if (apiKeyRecord.status === 'SUSPENDED') {
      throwHTTPException403Forbidden('This API key has been suspended.', { res: c.res });
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      await markApiKeyAsExpired(apiKeyRecord.id);
      throwHTTPException403Forbidden('This API key has expired.', { res: c.res });
    }

    updateApiKeyLastUsedAt(apiKeyRecord.id).catch((error) => {
      logger.error({ err: error }, 'Failed to update API key lastUsedAt');
    });

    c.set('apiKey', apiKeyRecord);

    await next();
  });
