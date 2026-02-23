import { serve } from '@hono/node-server';
import { app } from './app.js';
import { prisma } from './libs/prisma.js';
import { setupOpenAPI } from './openAPI.js';
import { setupThirdPartyOpenAPI } from './openAPI.thirdparty.js';
import './config/env.js';
import { getPrometheusContentType, getPrometheusMetrics } from './features/monitoring/metrics.backend.js';
import { createMonitoringServer } from './features/monitoring/server.js';
import { createDefaultLogger } from './helpers/pino.js';
import { sseEventManager } from './helpers/sse.js';
import './jobs/scheduler/index.js';
import { connection } from './config/redis.js';
import ThirdPartyController from './features/third-party/third-party.controller.js';

const logger = createDefaultLogger();
setupOpenAPI(app);
setupThirdPartyOpenAPI(app, ThirdPartyController);

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

    // Close Redis client
    await connection.quit();
    logger.info('Redis client disconnected');

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
