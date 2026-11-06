import type { Context } from 'hono';
import type { AppBindings } from '../../helpers/factories/appWithLogs.js';
import type { ApiKey } from '../../libs/prisma.js';

type ApiKeyWithAccount = ApiKey & { account: { id: string } };

// Structural type so that routes whose context merges other bindings (e.g. the upload
// middleware) can use this helper too.
type ContextWithApiKey = Pick<Context<AppBindings>, 'get'>;

/**
 * Get the API key from context, asserting it is defined.
 * Must only be used in routes behind the `apiKeyAuth()` middleware.
 */
export function getRequiredApiKey(c: ContextWithApiKey): ApiKeyWithAccount {
  const apiKey = c.get('apiKey');
  if (!apiKey) {
    throw new Error('apiKey is not set in context. Ensure apiKeyAuth() middleware is applied.');
  }
  return apiKey;
}
