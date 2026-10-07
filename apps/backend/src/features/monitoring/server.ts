import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { envVars } from '../../config/env.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { loggerStorage } from '../../libs/asyncLocalStorage.js';
import type { LivenessResult } from './liveness.js';

interface MonitoringServerOptions {
  getMetrics: () => Promise<string>;
  getContentType: () => string;
  port?: number;
  checkLiveness?: () => LivenessResult;
}

const alwaysAlive = (): LivenessResult => ({ alive: true });

export function createMonitoringServer(options: MonitoringServerOptions) {
  const { getMetrics, getContentType, port = envVars.MONITORING_PORT, checkLiveness = alwaysAlive } = options;
  const logger = createDefaultLogger();

  const app = new Hono();

  app.get('/health', (c) => {
    const liveness = checkLiveness();
    if (liveness.alive) {
      return c.text('ok', 200);
    }

    logger.error({ worker: liveness.stoppedWorker }, 'Liveness check failed, worker stopped consuming its queue');
    return c.text('unhealthy', 503);
  });

  app.get('/metrics', async (c) => {
    const metrics = await loggerStorage.run(logger, () => getMetrics());
    return c.text(metrics, 200, {
      'Content-Type': getContentType(),
    });
  });

  const server = serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logger.info({ port: info.port }, `Monitoring server is running on http://localhost:${info.port}`);
    },
  );

  return server;
}
