import { serve } from '@hono/node-server';
import { app } from './app';
import { prisma } from './libs/prisma';
import { setupOpenAPI } from './openAPI';
import '@/config/env';
import { getPrometheusContentType, getPrometheusMetrics } from '@/features/monitoring/metrics.backend';
import { createMonitoringServer } from '@/features/monitoring/server';
import { createDefaultLogger } from '@/helpers/pino';
import { sseEventManager } from '@/helpers/sse';
import '@/jobs/scheduler';

const logger = createDefaultLogger();
setupOpenAPI(app);

// Initialize SSE Redis subscriber before starting the server
const initSSE = async () => {
  try {
    await sseEventManager.initSubscriber();
  } catch (err) {
    logger.error({ err }, 'Failed to initialize SSE subscriber, continuing without distributed SSE');
  }
};

initSSE();

const server = serve(
  {
    fetch: app.fetch,
    port: 4000,
  },
  (info) => {
    logger.info({ port: info.port }, `Server is running on http://localhost:${info.port}`);
  },
);

const monitoringServer = createMonitoringServer({
  getMetrics: getPrometheusMetrics,
  getContentType: getPrometheusContentType,
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Graceful shutdown initiated');

  try {
    // Close monitoring server
    await new Promise<void>((resolve, reject) => {
      monitoringServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('Monitoring server closed');
          resolve();
        }
      });
    });

    // Close main HTTP server
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('HTTP server closed');
          resolve();
        }
      });
    });

    // Close database connection
    await prisma.$disconnect();
    logger.info('Database connection closed');

    // Close SSE Redis subscriber
    await sseEventManager.cleanup();
    logger.info('SSE subscriber closed');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
