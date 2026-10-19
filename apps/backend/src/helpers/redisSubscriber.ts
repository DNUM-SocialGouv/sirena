import type { Redis } from 'ioredis';

export const SUBSCRIBER_CLOSE_TIMEOUT_MS = 2_000;

/**
 * Closes a pub/sub connection without ever holding back the shutdown. A subscriber is a
 * `duplicate()` of `connection`, so it inherits `maxRetriesPerRequest: null`: a command issued
 * on a down socket stays queued forever. The graceful close is therefore bounded, then
 * `disconnect()` drops the socket without waiting for a reply (a no-op once it is closed).
 * Rejects on timeout so the caller can log it with its own context.
 */
export const closeSubscriber = async (client: Redis, channel: string): Promise<void> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      (async () => {
        await client.unsubscribe(channel);
        await client.quit();
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error(`Redis subscriber on "${channel}" did not close within ${SUBSCRIBER_CLOSE_TIMEOUT_MS}ms`)),
          SUBSCRIBER_CLOSE_TIMEOUT_MS,
        );
        timer.unref();
      }),
    ]);
  } finally {
    clearTimeout(timer);
    client.disconnect();
  }
};
