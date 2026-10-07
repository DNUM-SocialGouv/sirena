import * as Sentry from '@sentry/node';
import type { Logger } from 'pino';

const SENTRY_FLUSH_TIMEOUT_MS = 2_000;

export const FATAL_EXIT_CODE = 1;

export const SHUTDOWN_WATCHDOG_MS = 10_000;

type ProcessGuardsOptions = {
  logger: Logger;
  onFatal: (event: string) => void | Promise<void>;
};

/**
 * Without these guards an uncaught exception exits Node with code 1 and no usable trace, which
 * makes an application crash indistinguishable from the orchestrator killing the pod. That is
 * what made the 2026-10-07 incident so slow to diagnose. See docs/postmortem-2026-10-07.md.
 */
export const installProcessGuards = ({ logger, onFatal }: ProcessGuardsOptions) => {
  let handled = false;

  const handleFatal = (event: string) => (err: unknown) => {
    // A cascading fatal error must not mask the first cause.
    if (handled) {
      logger.error({ err, event }, 'Additional fatal error while shutting down');
      return;
    }
    handled = true;

    logger.fatal({ err, event }, `Fatal error: ${event}`);
    Sentry.captureException(err);

    void Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS)
      .catch(() => {})
      .then(() => onFatal(event));
  };

  process.on('uncaughtException', handleFatal('uncaughtException'));
  process.on('unhandledRejection', handleFatal('unhandledRejection'));
};

/**
 * During a network incident, failing to close a connection must not turn a requested shutdown
 * into an error exit: the exit code is our only clue to tell a crash from an orchestrated stop.
 */
export const closeQuietly = async (label: string, logger: Logger, close: () => Promise<unknown>) => {
  try {
    await close();
    logger.info(`${label} closed`);
  } catch (err) {
    logger.warn({ err }, `Failed to close ${label}, continuing shutdown`);
  }
};
