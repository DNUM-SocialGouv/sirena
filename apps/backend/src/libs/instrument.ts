import * as Sentry from '@sentry/node';
import { envVars } from '../config/env.js';
import { APP_VERSION } from '../config/version.constant.js';

if (envVars.SENTRY_ENABLED) {
  Sentry.init({
    dsn: envVars.SENTRY_DSN_BACKEND,
    environment: envVars.APP_ENV,
    includeLocalVariables: false,
    ignoreTransactions: [/^GET \/health$/, /^GET \/version$/],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    release: APP_VERSION,
    integrations: [Sentry.prismaIntegration()],
    // installProcessGuards (helpers/processGuards.ts) already reports fatal errors and then
    // triggers the shutdown. Without this removal every crash would raise two Sentry events.
    defaultIntegrations: Sentry.getDefaultIntegrations({}).filter(
      (integration) => integration.name !== 'OnUncaughtException' && integration.name !== 'OnUnhandledRejection',
    ),
  });
}
