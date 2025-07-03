import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import appWithLogs from '@/helpers/factories/appWithLogs';
import pinoLogger from '@/middlewares/pino.middleware';
import HealthController from './health.controller';
import { checkHealth } from './health.service';

vi.mock('./health.service', () => ({
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
      expect(body).toEqual({ status: 'ok' });
    });

    it('returns 500 when unhealthy', async () => {
      vi.mocked(checkHealth).mockResolvedValueOnce({
        healthy: false,
        reason: 'DB timeout',
      });

      const res = await await client.health.$get();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ status: 'error', message: 'DB timeout' });
    });
  });
});
