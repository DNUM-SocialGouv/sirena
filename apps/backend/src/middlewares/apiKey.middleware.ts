import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../helpers/factories/appWithLogs.js';
import { hashApiKey } from '../libs/apiKey.js';
import { prisma } from '../libs/prisma.js';

export function apiKeyAuth(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const logger = c.get('logger');
    const loggerBindings = logger?.bindings?.() as { traceId?: string } | undefined;
    const traceId = loggerBindings?.traceId ?? 'unknown';

    const apiKey = c.req.header('X-API-Key');
    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: {
            code: 'API_KEY_MISSING',
            message: 'API key is required. Include X-API-Key header.',
            traceId,
          },
        },
        401,
      );
    }

    const apiKeyRegex = /^sk_[a-f0-9]{64}$/;
    if (!apiKeyRegex.test(apiKey)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'API_KEY_INVALID_FORMAT',
            message: 'Invalid API key format.',
            traceId,
          },
        },
        401,
      );
    }

    const keyHash = hashApiKey(apiKey);
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { account: true },
    });

    if (!apiKeyRecord) {
      return c.json(
        {
          success: false,
          error: {
            code: 'API_KEY_NOT_FOUND',
            message: 'Invalid API key.',
            traceId,
          },
        },
        401,
      );
    }

    if (apiKeyRecord.status === 'REVOKED') {
      return c.json(
        {
          success: false,
          error: {
            code: 'API_KEY_REVOKED',
            message: 'This API key has been revoked.',
            traceId,
          },
        },
        403,
      );
    }

    if (apiKeyRecord.status === 'SUSPENDED') {
      return c.json(
        {
          success: false,
          error: {
            code: 'API_KEY_SUSPENDED',
            message: 'This API key has been suspended.',
            traceId,
          },
        },
        403,
      );
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { status: 'EXPIRED' },
      });

      return c.json(
        {
          success: false,
          error: {
            code: 'API_KEY_EXPIRED',
            message: 'This API key has expired.',
            traceId,
          },
        },
        403,
      );
    }

    prisma.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        console.error('Failed to update API key lastUsedAt:', error);
      });

    c.set('apiKey', apiKeyRecord);

    await next();
  };
}
