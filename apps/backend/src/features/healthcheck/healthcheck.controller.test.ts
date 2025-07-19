import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HealthcheckController from './healthcheck.controller';
import * as healthcheckService from './healthcheck.service';

vi.mock('./healthcheck.service');

vi.mock('@/config/env', () => ({
  envVars: {
    HEALTHCHECK_EVENT_LOOP_THRESHOLD: 500,
    HEALTHCHECK_MAX_CONNECTIONS_THRESHOLD: 1000,
  },
}));

describe('Healthcheck Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should always return 200 with metrics and thresholds', async () => {
      const mockResult = {
        status: 'ok' as const,
        metrics: {
          database: {
            status: 'connected' as const,
            responseTime: 5.2,
            connections: { active: 2, idle: 1, total: 3 },
          },
          http: { status: 'listening' as const, uptime: 123.45 },
          eventLoop: { status: 'healthy' as const, lag: 0.5 },
        },
        thresholds: {
          eventLoopLag: 500,
          maxConnections: 1000,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(healthcheckService.getCurrentStatus).mockResolvedValue(mockResult);

      const client = testClient(HealthcheckController);
      const res = await client.index.$get();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockResult);
    });

    it('should return 200 even when database is disconnected', async () => {
      const mockResult = {
        status: 'ok' as const,
        metrics: {
          database: {
            status: 'disconnected' as const,
            responseTime: 10.5,
            connections: { active: 0, idle: 0, total: 0 },
          },
          http: { status: 'listening' as const, uptime: 123.45 },
          eventLoop: { status: 'healthy' as const, lag: 0.5 },
        },
        thresholds: {
          eventLoopLag: 500,
          maxConnections: 1000,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(healthcheckService.getCurrentStatus).mockResolvedValue(mockResult);

      const client = testClient(HealthcheckController);
      const res = await client.index.$get();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockResult);
    });
  });

  describe('GET /alive', () => {
    it('should return 200 when alive check passes (without database check)', async () => {
      const mockResult = {
        status: 'ok' as const,
        checks: { http: true },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(healthcheckService.checkAlive).mockResolvedValue(mockResult);

      const client = testClient(HealthcheckController);
      const res = await client.alive.$get();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockResult);
    });
  });

  describe('GET /ready', () => {
    it('should return 200 when ready check passes', async () => {
      const mockResult = {
        status: 'ok' as const,
        checks: { database: true, http: true, eventLoop: true },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(healthcheckService.checkReady).mockResolvedValue(mockResult);

      const client = testClient(HealthcheckController);
      const res = await client.ready.$get();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockResult);
    });

    it('should return 503 when ready check fails', async () => {
      const mockResult = {
        status: 'error' as const,
        checks: { database: true, http: true, eventLoop: false },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(healthcheckService.checkReady).mockResolvedValue(mockResult);

      const client = testClient(HealthcheckController);
      const res = await client.ready.$get();

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json).toEqual(mockResult);
    });
  });
});
