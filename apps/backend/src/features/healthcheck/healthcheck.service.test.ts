import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { checkAlive, checkReady, getCurrentStatus } from './healthcheck.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/config/env', () => ({
  envVars: {
    HEALTHCHECK_EVENT_LOOP_THRESHOLD: 500,
    HEALTHCHECK_MAX_CONNECTIONS_THRESHOLD: 1000,
  },
}));

describe('Healthcheck Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAlive', () => {
    it('should return ok status without database check', async () => {
      const result = await checkAlive();

      expect(result.status).toBe('ok');
      expect(result.checks.database).toBeUndefined();
      expect(result.checks.http).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('checkReady', () => {
    it('should return ok status when all checks pass', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const result = await checkReady();

      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe(true);
      expect(result.checks.http).toBe(true);
      expect(result.checks.eventLoop).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should return error status when database check fails', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database error'));

      const result = await checkReady();

      expect(result.status).toBe('error');
      expect(result.checks.database).toBe(false);
      expect(result.checks.http).toBe(true);
      expect(result.checks.eventLoop).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getCurrentStatus', () => {
    it('should always return ok status with metrics and thresholds', async () => {
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([]) // First call for SELECT 1
        .mockResolvedValueOnce([
          { state: 'active', count: 5 },
          { state: 'idle', count: 3 },
        ]); // Second call for connection metrics

      const result = await getCurrentStatus();

      expect(result.status).toBe('ok');
      expect(result.metrics).toBeDefined();
      expect(result.metrics.database).toBeDefined();
      expect(result.metrics.http).toBeDefined();
      expect(result.metrics.eventLoop).toBeDefined();
      expect(result.thresholds).toBeDefined();
      expect(result.thresholds.eventLoopLag).toBe(500);
      expect(result.thresholds.maxConnections).toBe(1000);
      expect(result.timestamp).toBeDefined();
    });

    it('should return ok status even when database fails', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database error'));

      const result = await getCurrentStatus();

      expect(result.status).toBe('ok');
      expect(result.metrics.database.status).toBe('disconnected');
      expect(result.metrics.database.responseTime).toBeGreaterThan(0);
      expect(result.metrics.database.connections.total).toBe(0);
      expect(result.metrics.http.status).toBe('listening');
      expect(result.metrics.eventLoop.status).toBeDefined();
    });

    it('should include proper metrics structure with connections', async () => {
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([]) // First call for SELECT 1
        .mockResolvedValueOnce([
          { state: 'active', count: 2 },
          { state: 'idle', count: 1 },
        ]); // Second call for connection metrics

      const result = await getCurrentStatus();

      expect(result.metrics.database).toHaveProperty('status');
      expect(result.metrics.database).toHaveProperty('responseTime');
      expect(result.metrics.database).toHaveProperty('connections');
      expect(result.metrics.database.connections).toHaveProperty('active');
      expect(result.metrics.database.connections).toHaveProperty('idle');
      expect(result.metrics.database.connections).toHaveProperty('total');
      expect(result.metrics.database.connections.active).toBe(2);
      expect(result.metrics.database.connections.idle).toBe(1);
      expect(result.metrics.database.connections.total).toBe(3);
      expect(result.metrics.http).toHaveProperty('status');
      expect(result.metrics.http).toHaveProperty('uptime');
      expect(result.metrics.eventLoop).toHaveProperty('status');
      expect(result.metrics.eventLoop).toHaveProperty('lag');
      expect(result.thresholds).toHaveProperty('eventLoopLag');
      expect(result.thresholds).toHaveProperty('maxConnections');
    });
  });
});
