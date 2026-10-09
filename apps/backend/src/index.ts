import './libs/instrument.js';
import { serve } from '@hono/node-server';
import { app } from './app.js';
import { prisma } from './libs/prisma.js';
import { setupOpenAPI } from './openAPI.js';
import { setupThirdPartyOpenAPI } from './openAPI.thirdparty.js';
import './config/env.js';
import { getPrometheusContentType, getPrometheusMetrics } from './features/monitoring/metrics.backend.js';
import { createMonitoringServer } from './features/monitoring/server.js';
import { createDefaultLogger } from './helpers/pino.js';
import { closeQuietly, FATAL_EXIT_CODE, installProcessGuards, SHUTDOWN_WATCHDOG_MS } from './helpers/processGuards.js';
import { sseEventManager } from './helpers/sse.js';
import './jobs/scheduler/index.js';
import { connection } from './config/redis.js';
import ThirdPartyController from './features/third-party/third-party.controller.js';

const logger = createDefaultLogger();

// Installed before any side-effecting call, so a crash during start-up is traced too.
// `gracefulShutdown` is a hoisted function declaration: the servers it closes may still be in
// their temporal dead zone at that point, and `closeQuietly` swallows that.
installProcessGuards({ logger, onFatal: (event) => gracefulShutdown(event, FATAL_EXIT_CODE) });

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

function closeServer(target: { close: (cb: (err?: unknown) => void) => void }) {
  return new Promise<void>((resolve, reject) => {
    target.close((err) => (err ? reject(err) : resolve()));
  });
}

async function gracefulShutdown(signal: string, exitCode = 0) {
  logger.info({ signal }, 'Graceful shutdown initiated');

  // `server.close` waits for in-flight requests, which during an outage may never finish.
  // Without this timer the pod would hang in Terminating.
  const watchdog = setTimeout(() => {
    logger.error({ signal }, 'Shutdown watchdog fired, forcing exit');
    process.exit(exitCode || FATAL_EXIT_CODE);
  }, SHUTDOWN_WATCHDOG_MS);
  watchdog.unref();

  await closeQuietly('Monitoring server', logger, () => closeServer(monitoringServer));
  await closeQuietly('HTTP server', logger, () => closeServer(server));
  await closeQuietly('Database connection', logger, () => prisma.$disconnect());
  await closeQuietly('SSE subscriber', logger, () => sseEventManager.cleanup());
  await closeQuietly('Redis client', logger, () => connection.quit());

  clearTimeout(watchdog);
  logger.info('Graceful shutdown completed');
  process.exit(exitCode);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
