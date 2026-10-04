import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LivenessResult } from './liveness.js';
import { createMonitoringServer } from './server.js';

const METRICS_PAYLOAD = 'sirena_test_total 1';
const METRICS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

const getMetrics = vi.fn(async () => METRICS_PAYLOAD);
const getContentType = vi.fn(() => METRICS_CONTENT_TYPE);

type Started = { close: () => Promise<void>; baseUrl: string };

const startServer = async (checkLiveness?: () => LivenessResult): Promise<Started> => {
  const server = createMonitoringServer({ getMetrics, getContentType, port: 0, checkLiveness });

  const address = await new Promise<AddressInfo>((resolve) => {
    const current = server.address();
    if (current && typeof current === 'object') {
      resolve(current);
      return;
    }
    server.once('listening', () => resolve(server.address() as AddressInfo));
  });

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
};

beforeEach(() => {
  getMetrics.mockClear();
  getContentType.mockClear();
});

describe('Monitoring server', () => {
  let started: Started;

  beforeAll(async () => {
    started = await startServer();
  });

  afterAll(() => started.close());

  describe('GET /health', () => {
    it('responds 200 so that the liveness probe succeeds', async () => {
      const res = await fetch(`${started.baseUrl}/health`);

      expect(res.status).toBe(200);
      await expect(res.text()).resolves.toBe('ok');
    });

    it('does not read the metrics registry', async () => {
      await fetch(`${started.baseUrl}/health`);

      expect(getMetrics).not.toHaveBeenCalled();
      expect(getContentType).not.toHaveBeenCalled();
    });
  });

  describe('GET /metrics', () => {
    it('still serves the Prometheus payload with its content type', async () => {
      const res = await fetch(`${started.baseUrl}/metrics`);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe(METRICS_CONTENT_TYPE);
      await expect(res.text()).resolves.toBe(METRICS_PAYLOAD);
      expect(getMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('unknown paths', () => {
    it('responds 404', async () => {
      const res = await fetch(`${started.baseUrl}/unknown`);

      expect(res.status).toBe(404);
    });
  });
});

describe('Monitoring server with a liveness check', () => {
  let started: Started;
  let liveness: LivenessResult;

  beforeAll(async () => {
    started = await startServer(() => liveness);
  });

  afterAll(() => started.close());

  it('responds 200 while the check reports alive', async () => {
    liveness = { alive: true };

    const res = await fetch(`${started.baseUrl}/health`);

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('ok');
  });

  it('responds 503 once the check reports a stopped worker', async () => {
    liveness = { alive: false, stoppedWorker: 'file-processing' };

    const res = await fetch(`${started.baseUrl}/health`);

    expect(res.status).toBe(503);
    await expect(res.text()).resolves.toBe('unhealthy');
  });

  it('keeps serving the metrics payload when the check reports a stopped worker', async () => {
    liveness = { alive: false, stoppedWorker: 'cron' };

    const res = await fetch(`${started.baseUrl}/metrics`);

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(METRICS_PAYLOAD);
  });
});
