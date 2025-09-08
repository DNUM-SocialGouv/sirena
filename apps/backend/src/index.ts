import { serve } from '@hono/node-server';
import { app } from './app';
import { prisma } from './libs/prisma';
import { setupOpenAPI } from './openAPI';
import '@/config/env.ts';
import { createDefaultLogger } from '@/helpers/pino';
import '@/jobs/scheduler';

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
