import * as Sentry from '@sentry/react';
import { env } from '@/config/env';
import { APP_VERSION } from '@/config/version.constant';
import { getSessionId } from '@/lib/tracking';

const scheduleIdle = (cb: () => void) => {
  if (typeof window === 'undefined') return;
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (ric) ric(cb, { timeout: 4000 });
  else window.setTimeout(cb, 2000);
};

if (env.SENTRY_ENABLED === 'true') {
  Sentry.init({
    dsn: env.SENTRY_DSN_FRONTEND,
    environment: env.APP_ENV,
    integrations: [Sentry.browserTracingIntegration()],
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

  // Replay is bundled locally (we stay off the Sentry CDN — strict CSP +
  // self-hosted policy) but its initialisation is deferred to idle so it
  // doesn't compete with the boot path for CPU.
  scheduleIdle(() => {
    try {
      Sentry.getClient()?.addIntegration(Sentry.replayIntegration());
    } catch {
      // Replay is non-critical: failures must not break the app.
    }
  });
}
