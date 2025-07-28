import * as Sentry from '@sentry/react';
import { getSessionId } from '@/lib/tracking';

if (import.meta.env.VITE_SENTRY_ENABLED === 'true') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN_FRONTEND,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^\/api(\/|$)/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    release: import.meta.env.VITE_APP_VERSION,
    beforeSend: (event) => {
      // Ensure correlation tags are set
      const sessionId = getSessionId();
      if (!event.tags?.sessionId) {
        event.tags = { ...event.tags, sessionId, source: 'frontend' };
      }
      return event;
    },
  });
}
