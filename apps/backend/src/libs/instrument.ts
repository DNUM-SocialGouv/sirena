import * as Sentry from '@sentry/node';
import { envVars } from '../config/env.js';
import { APP_VERSION } from '../config/version.constant.js';

if (envVars.SENTRY_ENABLED) {
  Sentry.init({
    dsn: envVars.SENTRY_DSN_BACKEND,
    environment: envVars.APP_ENV,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
        response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      },
      httpBodies: [],
      urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    ignoreSpans: [/^GET \/health$/, /^GET \/version$/],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    release: APP_VERSION,
    integrations: [Sentry.prismaIntegration()],
    // installProcessGuards already reports fatal errors: avoid a duplicate Sentry event.
    defaultIntegrations: Sentry.getDefaultIntegrations({}).filter(
      (integration) => integration.name !== 'OnUncaughtException' && integration.name !== 'OnUnhandledRejection',
    ),
  });
}
