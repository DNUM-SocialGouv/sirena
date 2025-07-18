import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import pino from 'pino';
import pretty from 'pino-pretty';
import { envVars } from './config/env';
import HealthcheckController from './features/healthcheck/healthcheck.controller';

const logger = pino(
  {
    level: 'info',
    name: 'healthcheck-server',
  },
  envVars.LOG_FORMAT === 'pretty'
    ? pretty({
        ignore: 'pid,hostname,time',
        translateTime: 'SYS:standard',
      })
    : undefined,
);

const app = new Hono();

app.route('/', HealthcheckController);

export function startHealthcheckServer() {
  if (!envVars.HEALTHCHECK) {
    logger.info('Healthcheck server is disabled');
    return;
  }

  serve(
    {
      fetch: app.fetch,
      port: envVars.HEALTHCHECK_PORT,
    },
    (info) => {
      logger.info({ port: info.port }, `Healthcheck server is running on http://localhost:${info.port}`);
    },
  );
}
