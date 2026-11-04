import { ERROR_KIND } from '@sirena/common/constants';
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import factoryWithLogs from '../helpers/factories/appWithLogs.js';

const MULTIPART_CONTENT_TYPE = /^multipart\/form-data/i;

const throwPayloadTooLarge = (c: Context, maxSize: number): never => {
  const maxSizeInMo = Math.floor(maxSize / (1024 * 1024));
  const body = {
    message: `La requête dépasse la taille maximale autorisée (${maxSizeInMo} Mo)`,
    cause: { kind: ERROR_KIND.BUSINESS },
  };
  const res = new Response(JSON.stringify(body), {
    status: 413,
    headers: { ...Object.fromEntries(c.res.headers), 'Content-Type': 'application/json' },
  });
  throw new HTTPException(413, { message: body.message, res });
};

type StreamSafeBodyLimitOptions = {
  /** Limit for multipart bodies (file uploads). */
  multipartMaxSize: number;
  /** Limit for every other body (JSON). Keep it small: see below. */
  otherMaxSize: number;
};

/**
 * Transport-level guard on the request body size, built on Hono's `bodyLimit`.
 *
 * Hono's `bodyLimit` reads `c.req.raw.body`. On @hono/node-server this attaches a reader to the
 * incoming request, which steals chunks from routes that parse `c.env.incoming` directly with
 * busboy (see upload.middleware.ts) and hangs them.
 *
 * So multipart bodies are only checked on their Content-Length header here (rejected before any
 * byte of the body is read). Chunked multipart uploads are bounded by the streaming size limiter
 * of `extractUploadedFileMiddleware`.
 *
 * Every other body goes through Hono's `bodyLimit`, which buffers a chunked body (no
 * Content-Length) in memory until `otherMaxSize` is reached. This runs before authentication, so
 * `otherMaxSize` is the memory any anonymous caller can hold per request: keep it small.
 */
export const streamSafeBodyLimit = ({ multipartMaxSize, otherMaxSize }: StreamSafeBodyLimitOptions) => {
  const limit = bodyLimit({ maxSize: otherMaxSize, onError: (c) => throwPayloadTooLarge(c, otherMaxSize) });

  return factoryWithLogs.createMiddleware(async (c, next) => {
    if (!MULTIPART_CONTENT_TYPE.test(c.req.header('content-type') ?? '')) {
      return limit(c, next);
    }

    const contentLength = c.req.header('content-length');
    if (contentLength !== undefined && !c.req.header('transfer-encoding')) {
      if (Number.parseInt(contentLength, 10) > multipartMaxSize) {
        throwPayloadTooLarge(c, multipartMaxSize);
      }
    }

    await next();
  });
};
