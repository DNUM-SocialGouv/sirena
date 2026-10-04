import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMonitoringServer } from './server.js';

const METRICS_PAYLOAD = 'sirena_test_total 1';
const METRICS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

const getMetrics = vi.fn(async () => METRICS_PAYLOAD);
const getContentType = vi.fn(() => METRICS_CONTENT_TYPE);

let server: ReturnType<typeof createMonitoringServer>;
let baseUrl: string;

beforeAll(async () => {
  server = createMonitoringServer({ getMetrics, getContentType, port: 0 });

  const address = await new Promise<AddressInfo>((resolve) => {
    const current = server.address();
    if (current && typeof current === 'object') {
      resolve(current);
      return;
    }
    server.once('listening', () => resolve(server.address() as AddressInfo));
  });

  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => {
  getMetrics.mockClear();
  getContentType.mockClear();
});

describe('Monitoring server', () => {
  describe('GET /health', () => {
    it('responds 200 so that the liveness probe succeeds', async () => {
      const res = await fetch(`${baseUrl}/health`);

      expect(res.status).toBe(200);
      await expect(res.text()).resolves.toBe('ok');
    });

    it('does not read the metrics registry', async () => {
      await fetch(`${baseUrl}/health`);

      expect(getMetrics).not.toHaveBeenCalled();
      expect(getContentType).not.toHaveBeenCalled();
    });
  });

  describe('GET /metrics', () => {
    it('still serves the Prometheus payload with its content type', async () => {
      const res = await fetch(`${baseUrl}/metrics`);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe(METRICS_CONTENT_TYPE);
      await expect(res.text()).resolves.toBe(METRICS_PAYLOAD);
      expect(getMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('unknown paths', () => {
    it('responds 404', async () => {
      const res = await fetch(`${baseUrl}/unknown`);

      expect(res.status).toBe(404);
    });
  });
});
