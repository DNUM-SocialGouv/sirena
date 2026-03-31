import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getPrometheusContentType, getPrometheusMetrics } from './metrics.js';
import { logger } from './logger.js';

export function createMonitoringServer(port: number) {
  const app = new Hono();

  app.get('/metrics', async (c) => {
    const metrics = await getPrometheusMetrics();
    return c.text(metrics, 200, { 'Content-Type': getPrometheusContentType() });
  });

  return serve({ fetch: app.fetch, port }, (info) => {
    logger.info({ port: info.port }, 'Monitoring server started');
  });
}
