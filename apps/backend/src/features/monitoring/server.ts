import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { envVars } from '../../config/env.js';
import { createDefaultLogger } from '../../helpers/pino.js';
import { loggerStorage } from '../../libs/asyncLocalStorage.js';

interface MonitoringServerOptions {
  getMetrics: () => Promise<string>;
  getContentType: () => string;
  port?: number;
}

export function createMonitoringServer(options: MonitoringServerOptions) {
  const { getMetrics, getContentType, port = envVars.MONITORING_PORT } = options;
  const logger = createDefaultLogger();

  const app = new Hono();

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
