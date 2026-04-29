import * as Sentry from '@sentry/react';
import { env } from '@/config/env';
import { APP_VERSION } from '@/config/version.constant';
import { getSessionId } from '@/lib/tracking';

if (env.SENTRY_ENABLED === 'true') {
  Sentry.init({
    dsn: env.SENTRY_DSN_FRONTEND,
    environment: env.APP_ENV,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^\/api(\/|$)/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    release: APP_VERSION,
    beforeSend: (event) => {
      const sessionId = getSessionId();
      if (!event.tags?.sessionId) {
        event.tags = { ...event.tags, sessionId, source: 'frontend' };
      }
      return event;
    },
  });
}
