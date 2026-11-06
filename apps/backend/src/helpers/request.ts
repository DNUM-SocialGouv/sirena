import type { IncomingMessage } from 'node:http';

/** True when the client cut the request before its body was fully received. */
export const isRequestBodyInterrupted = (c: { env: unknown }) => {
  const incoming = (c.env as { incoming?: IncomingMessage } | undefined)?.incoming;
  return Boolean(incoming && !incoming.readableEnded && (incoming.destroyed || incoming.errored));
};
