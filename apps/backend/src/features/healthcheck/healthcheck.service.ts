import { envVars } from '@/config/env';
import { prisma } from '@/libs/prisma';

interface HealthcheckResult {
  status: 'ok' | 'error';
  checks: Record<string, boolean>;
  timestamp: string;
}

interface MetricsResult {
  status: 'ok';
  metrics: {
    database: {
      status: 'connected' | 'disconnected';
      responseTime: number;
      connections: {
        active: number;
        idle: number;
        total: number;
      };
    };
    http: {
      status: 'listening';
      uptime: number;
    };
    eventLoop: {
      status: 'healthy' | 'overloaded';
      lag: number;
    };
  };
  thresholds: {
    eventLoopLag: number;
    maxConnections: number;
  };
  timestamp: string;
}

export async function checkAlive(): Promise<HealthcheckResult> {
  const checks: Record<string, boolean> = {};
  const timestamp = new Date().toISOString();

  // HTTP server is always listening if we reach this point
  checks.http = true;

  const allHealthy = Object.values(checks).every((check) => check);

  return {
    status: allHealthy ? 'ok' : 'error',
    checks,
    timestamp,
  };
}

export async function checkReady(): Promise<HealthcheckResult> {
  const aliveResult = await checkAlive();
  const checks = { ...aliveResult.checks };

  // Check database connectivity (only for readiness, not liveness)
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (_error) {
    checks.database = false;
  }

  // Check event loop lag/back pressure
  const eventLoopHealthy = await checkEventLoopHealth();
  checks.eventLoop = eventLoopHealthy;

  const allHealthy = Object.values(checks).every((check) => check);

  return {
    status: allHealthy ? 'ok' : 'error',
    checks,
    timestamp: new Date().toISOString(),
  };
}

export async function getCurrentStatus(): Promise<MetricsResult> {
  const timestamp = new Date().toISOString();

  // Check database with timing and connections
  const databaseMetrics = await checkDatabaseWithMetrics();

  // Check event loop with timing
  const eventLoopMetrics = await checkEventLoopWithMetrics();

  // HTTP is always listening if we reach this point
  const httpMetrics = {
    status: 'listening' as const,
    uptime: process.uptime(),
  };

  return {
    status: 'ok',
    metrics: {
      database: databaseMetrics,
      http: httpMetrics,
      eventLoop: eventLoopMetrics,
    },
    thresholds: {
      eventLoopLag: envVars.HEALTHCHECK_EVENT_LOOP_THRESHOLD,
      maxConnections: envVars.HEALTHCHECK_MAX_CONNECTIONS_THRESHOLD,
    },
    timestamp,
  };
}

async function checkEventLoopHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();

    setImmediate(() => {
      const delta = process.hrtime.bigint() - start;
      const lagMs = Number(delta) / 1_000_000; // Convert to milliseconds

      // Use configurable threshold
      resolve(lagMs < envVars.HEALTHCHECK_EVENT_LOOP_THRESHOLD);
    });
  });
}

async function checkDatabaseWithMetrics(): Promise<MetricsResult['metrics']['database']> {
  const start = process.hrtime.bigint();

  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Get connection pool metrics
    const connectionMetrics = await getDatabaseConnectionMetrics();

    const delta = process.hrtime.bigint() - start;
    const responseTime = Number(delta) / 1_000_000; // Convert to milliseconds

    return {
      status: 'connected',
      responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
      connections: connectionMetrics,
    };
  } catch (_error) {
    const delta = process.hrtime.bigint() - start;
    const responseTime = Number(delta) / 1_000_000;

    return {
      status: 'disconnected',
      responseTime: Math.round(responseTime * 100) / 100,
      connections: {
        active: 0,
        idle: 0,
        total: 0,
      },
    };
  }
}

async function checkEventLoopWithMetrics(): Promise<MetricsResult['metrics']['eventLoop']> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();

    setImmediate(() => {
      const delta = process.hrtime.bigint() - start;
      const lagMs = Number(delta) / 1_000_000; // Convert to milliseconds
      const roundedLag = Math.round(lagMs * 100) / 100; // Round to 2 decimal places

      resolve({
        status: lagMs < envVars.HEALTHCHECK_EVENT_LOOP_THRESHOLD ? 'healthy' : 'overloaded',
        lag: roundedLag,
      });
    });
  });
}

async function getDatabaseConnectionMetrics(): Promise<{ active: number; idle: number; total: number }> {
  try {
    // Query PostgreSQL to get connection information
    const result = await prisma.$queryRaw<Array<{ state: string; count: number }>>`
      SELECT state, COUNT(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state
    `;

    let active = 0;
    let idle = 0;

    result.forEach((row) => {
      const count = Number(row.count);
      if (row.state === 'active') {
        active = count;
      } else if (row.state === 'idle') {
        idle = count;
      }
    });

    return {
      active,
      idle,
      total: active + idle,
    };
  } catch (_error) {
    // If we can't get metrics, return zeros
    return {
      active: 0,
      idle: 0,
      total: 0,
    };
  }
}
