import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import pinoLogger from '../../middlewares/pino.middleware.js';
import HealthController from './health.controller.js';
import { checkHealth } from './health.service.js';

vi.mock('./health.service.js', () => ({
  checkHealth: vi.fn(),
}));

const app = appWithLogs.createApp().use(pinoLogger()).route('/health', HealthController);
const client = testClient(app);

describe('Health endpoints: /health', () => {
  describe('GET /', () => {
    it('returns 200 when healthy', async () => {
      vi.mocked(checkHealth).mockResolvedValueOnce({ healthy: true });

      const res = await client.health.$get();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ data: { status: 'ok' } });
    });
  });
});
