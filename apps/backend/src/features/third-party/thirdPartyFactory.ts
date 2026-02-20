import type { Context } from 'hono';
import type { AppBindings } from '../../helpers/factories/appWithLogs.js';
import type { ApiKey } from '../../libs/prisma.js';

type ApiKeyWithAccount = ApiKey & { account: { id: string } };

/**
 * Get the API key from context, asserting it is defined.
 * Must only be used in routes behind the `apiKeyAuth()` middleware.
 */
export function getRequiredApiKey(c: Context<AppBindings>): ApiKeyWithAccount {
  const apiKey = c.get('apiKey');
  if (!apiKey) {
    throw new Error('apiKey is not set in context. Ensure apiKeyAuth() middleware is applied.');
  }
  return apiKey;
}
