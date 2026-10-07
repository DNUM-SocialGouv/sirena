import * as Sentry from '@sentry/node';
import type { Logger } from 'pino';

const SENTRY_FLUSH_TIMEOUT_MS = 2_000;

export const FATAL_EXIT_CODE = 1;

export const SHUTDOWN_WATCHDOG_MS = 10_000;

type ProcessGuardsOptions = {
  logger: Logger;
  onFatal: (event: string) => void | Promise<void>;
};

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

export const closeQuietly = async (label: string, logger: Logger, close: () => Promise<unknown>) => {
  try {
    await close();
    logger.info(`${label} closed`);
  } catch (err) {
    logger.warn({ err }, `Failed to close ${label}, continuing shutdown`);
  }
};
