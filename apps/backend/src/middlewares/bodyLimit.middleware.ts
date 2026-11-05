import { throwHTTPException413PayloadTooLarge } from '@sirena/backend-utils/helpers';
import { API_ERROR_CODES, ERROR_KIND } from '@sirena/common/constants';
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import factoryWithLogs from '../helpers/factories/appWithLogs.js';

const MULTIPART_CONTENT_TYPE = /^multipart\/form-data/i;

const KO = 1024;
const MO = 1024 * KO;

/** Human readable size limit, shared by the error message and the OpenAPI documentation. */
export const formatMaxSize = (bytes: number) =>
  bytes >= MO ? `${Math.floor(bytes / MO)} Mo` : `${Math.ceil(bytes / KO)} Ko`;

const throwPayloadTooLarge = (c: Context, maxSize: number): never =>
  throwHTTPException413PayloadTooLarge(`Request body exceeds the maximum allowed size (${formatMaxSize(maxSize)})`, {
    res: c.res,
    kind: ERROR_KIND.BUSINESS,
    cause: { name: API_ERROR_CODES.BODY_MAX_SIZE },
  });

type StreamSafeBodyLimitOptions = {
  /** Limit for multipart bodies (file uploads), checked on the Content-Length header only. */
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
 * byte of the body is read). A multipart body without Content-Length (chunked transfer) is NOT
 * bounded by this middleware: `extractUploadedFileMiddleware` only bounds its first file part
 * (MAX_FILE_SIZE), the other parts are read and discarded. The total size of such a body is only
 * bounded by the ingress (`proxy-body-size`, see the backend Helm chart).
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
      const announcedSize = Number(contentLength);
      // Fail closed on a malformed header (Node's HTTP parser should already have rejected it).
      if (!Number.isSafeInteger(announcedSize) || announcedSize > multipartMaxSize) {
        throwPayloadTooLarge(c, multipartMaxSize);
      }
    }

    await next();
  });
};
