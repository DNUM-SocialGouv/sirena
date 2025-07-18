import { serve } from '@hono/node-server';
import { app } from './app';
import { prisma } from './libs/prisma';
import { setupOpenAPI } from './openAPI';
import '@/config/env.ts';

setupOpenAPI(app);

const server = serve(
  {
    fetch: app.fetch,
    port: 4000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('HTTP server closed');
          resolve();
        }
      });
    });

    // Close database connection
    await prisma.$disconnect();
    console.log('Database connection closed');

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
