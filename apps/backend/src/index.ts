import { serve } from '@hono/node-server';
import pino from 'pino';
import { app } from './app';
import { getLogLevelConfig } from './helpers/middleware';
import { prisma } from './libs/prisma';
import { setupOpenAPI } from './openAPI';
import '@/config/env.ts';
import { startScheduler } from '@/jobs/scheduler.job';

startScheduler()
  .then(() => {
    console.log('[Scheduler] All jobs scheduled');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Scheduler] Failed to start', err);
    process.exit(1);
  });

const createDefaultLogger = () => {
  const logConfig = getLogLevelConfig();
  return pino({
    level: logConfig.console,
    serializers: {
      err: pino.stdSerializers.err,
    },
  });
};

const logger = createDefaultLogger();

setupOpenAPI(app);

const server = serve(
  {
    fetch: app.fetch,
    port: 4000,
  },
  (info) => {
    logger.info({ port: info.port }, `Server is running on http://localhost:${info.port}`);
  },
);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Graceful shutdown initiated');

  try {
    // Close HTTP server
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
