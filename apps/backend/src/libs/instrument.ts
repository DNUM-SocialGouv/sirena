import * as Sentry from '@sentry/node';
import { envVars } from '@/config/env';
import { APP_VERSION } from '@/config/version.constant';

if (envVars.SENTRY_ENABLED) {
  Sentry.init({
    dsn: envVars.SENTRY_DSN_BACKEND,
    environment: envVars.SENTRY_ENVIRONMENT,
    includeLocalVariables: process.env.NODE_ENV === 'production',
    ignoreTransactions: [/^GET \/health$/, /^GET \/version$/],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    release: APP_VERSION,
    integrations: [Sentry.prismaIntegration()],
  });
}
