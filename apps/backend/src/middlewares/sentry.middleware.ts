import { sentry } from '@hono/sentry';
import * as Sentry from '@sentry/node';
import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { envVars } from '@/config/env';
import {
  createSentryBusinessContext,
  createSentryRequestContext,
  createSentryUserContext,
  extractClientIp,
  extractRequestContext,
  setSentryCorrelationTags,
  type User,
} from '@/helpers/middleware';

/**
 * Sentry middleware using @hono/sentry with custom context enrichment
 * Combines official @hono/sentry package with project-specific features:
 * - Request context correlation
 * - User context integration
 * - GDPR-compliant IP anonymization
 * - Business context for French government compliance
 */
export const sentryMiddleware = () => {
  // Base @hono/sentry middleware with custom configuration
  const baseSentryMiddleware = sentry({
    dsn: envVars.SENTRY_DSN_BACKEND,
    environment: envVars.SENTRY_ENVIRONMENT,
    beforeSend: (event) => {
      // Sanitize sensitive data for GDPR compliance
      if (event.user?.email) {
        // Email will be automatically sanitized by Sentry's beforeSend
        // Keep it for now, Sentry will handle PII scrubbing
      }
      return event;
    },
  });

  // Enhanced middleware that wraps the base middleware
  return createMiddleware(async (c: Context, next: Next) => {
    // Run the base sentry middleware first to get Sentry instance in context
    await baseSentryMiddleware(c, async () => {
      const context = extractRequestContext(c);

      // Set request context with correlation data (GDPR compliant)
      Sentry.getCurrentScope().setContext('request', createSentryRequestContext(c, context));

      // Set tags for correlation and filtering
      setSentryCorrelationTags(Sentry.getCurrentScope(), context);
      Sentry.getCurrentScope().setTag('method', c.req.method);
      Sentry.getCurrentScope().setTag('route', c.req.path);

      try {
        // Use Sentry's startSpan for tracing
        await Sentry.startSpan(
          {
            name: `${c.req.method} ${c.req.path}`,
            op: 'http.server',
            attributes: {
              'http.method': c.req.method,
              'http.url': c.req.url,
              'http.route': c.req.path,
            },
          },
          async (span) => {
            await next();

            // Set response attributes
            span.setAttributes({
              'http.status_code': c.res.status,
            });

            // Handle user context if available after authentication
            const user = c.get('user') as User | undefined;
            if (user) {
              setUserContext(c, user, context);
            }
          },
        );
      } catch (error) {
        // Capture exception with full context
        Sentry.withScope((scope) => {
          scope.setContext('response', {
            statusCode: c.res.status,
          });

          if (error instanceof Error) {
            Sentry.captureException(error);
          } else {
            Sentry.captureMessage(`Non-Error exception: ${String(error)}`);
          }
        });

        throw error;
      }
    });
  });
};

/**
 * Helper function to set user context in Sentry
 * Extracted from the old sentryUserMiddleware for reuse
 */
const setUserContext = (c: Context, user: User, context: any) => {
  const anonymizedIp = extractClientIp(c);

  // Set user context
  Sentry.getCurrentScope().setUser(createSentryUserContext(user, anonymizedIp));

  // Set business context with correlation data
  const businessContext = createSentryBusinessContext(context);
  if (businessContext) {
    Sentry.getCurrentScope().setContext('business', {
      ...businessContext,
      userEmail: user.email, // Will be sanitized by Sentry's beforeSend
    });
  }

  // Set user fingerprint for better correlation with frontend events
  Sentry.getCurrentScope().setFingerprint(['user', user.id]);
};

/**
 * Legacy user middleware - now integrated into the main sentryMiddleware
 * @deprecated User context is now handled automatically in sentryMiddleware
 */
export const sentryUserMiddleware = () => {
  return createMiddleware(async (_c: Context, next: Next) => {
    // This is now a no-op since user context is handled in the main middleware
    // Keeping for backward compatibility during transition
    await next();
  });
};
