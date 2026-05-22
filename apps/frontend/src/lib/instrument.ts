import * as Sentry from '@sentry/react';
import { ERROR_KIND } from '@sirena/common/constants';
import { env } from '@/config/env';
import { APP_VERSION } from '@/config/version.constant';
import { getSessionId } from '@/lib/tracking';

const isBusinessHttpError = (error: unknown): boolean => {
  if (!(error instanceof Error) || error.name !== 'HttpError') return false;
  const data = (error as Error & { data?: { kind?: unknown } }).data;
  return data?.kind === ERROR_KIND.BUSINESS;
};

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
    beforeSend: (event, hint) => {
      if (isBusinessHttpError(hint?.originalException)) return null;

      const sessionId = getSessionId();
      if (!event.tags?.sessionId) {
        event.tags = { ...event.tags, sessionId, source: 'frontend' };
      }
      return event;
    },
  });

  scheduleIdle(async () => {
    try {
      const replay = await Sentry.lazyLoadIntegration('replayIntegration');
      Sentry.getClient()?.addIntegration(replay());
    } catch {
      // Replay is non-critical: failures must not break the app.
    }
  });
}
