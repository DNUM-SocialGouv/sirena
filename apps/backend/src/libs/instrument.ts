import * as Sentry from '@sentry/node';
import { APP_VERSION } from '@/config/version.constant';

if (process.env.SENTRY_ENABLED === 'true') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_BACKEND,
    environment: process.env.SENTRY_ENVIRONMENT,
    includeLocalVariables: process.env.NODE_ENV === 'production',
    ignoreTransactions: [/^GET \/health$/],
    tracesSampleRate: 1.0,
    release: APP_VERSION,
  });
}
