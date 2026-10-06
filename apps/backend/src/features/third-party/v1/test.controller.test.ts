import type { Context, Next } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import appWithLogs from '../../../helpers/factories/appWithLogs.js';
import TestController from './test.controller.js';

const app = appWithLogs
  .createApp()
  .use((c: Context, next: Next) => {
    c.set('logger', { info: vi.fn(), error: vi.fn(), bindings: () => ({ traceId: 'trace-123' }) });
    c.set('apiKey', { id: 'key-1', accountId: 'account-1', keyPrefix: 'sk_abcd', account: { id: 'account-1' } });
    return next();
  })
  .route('/', TestController);

describe('third-party v1 test.controller.ts', () => {
  it('GET / confirms authentication for the calling account', async () => {
    const res = await app.request('/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-trace-id')).toBe('trace-123');
    expect(await res.json()).toEqual({
      message: 'Authentication successful',
      accountId: 'account-1',
      keyPrefix: 'sk_abcd',
    });
  });
});
