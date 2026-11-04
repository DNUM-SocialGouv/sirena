/** biome-ignore-all lint/suspicious/noExplicitAny: <tests purposes> */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { type ServerType, serve } from '@hono/node-server';
import { API_ERROR_CODES, ERROR_KIND } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_FILE_SIZE } from '../../config/files.constant.js';
import { errorHandler } from '../../helpers/errors.js';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { prisma } from '../../libs/__mocks__/prisma.js';
import { loggerStorage } from '../../libs/asyncLocalStorage.js';
import { uploadFileToMinio } from '../../libs/minio.js';
import ThirdPartyApp from './third-party.controller.js';
import { MAX_JSON_BODY_SIZE } from './v1/shared.js';

// End-to-end test of the third-party attachment upload over a real HTTP server: real body limit,
// real multipart streaming (busboy), real service. Only the storage, database, queue, auth and
// rate limiter (Redis) are stubbed. The storage stub consumes the stream like MinIO would.

vi.mock('../../libs/prisma.js', async (importOriginal) => {
  const { prisma } = await import('../../libs/__mocks__/prisma.js');
  const actual = await importOriginal<typeof import('../../libs/prisma.js')>();
  return { ...actual, prisma };
});

vi.mock('../../libs/minio.js', async () => {
  const { Writable } = await import('node:stream');
  const { pipeline } = await import('node:stream/promises');
  return {
    uploadFileToMinio: vi.fn(async (input: Readable) => {
      await pipeline(
        input,
        new Writable({
          write(_chunk, _encoding, callback) {
            callback();
          },
        }),
      );
      return { objectPath: 'uploads/abc-123.pdf', rollback: vi.fn(), encryptionMetadata: { iv: 'iv', authTag: 'tag' } };
    }),
  };
});

vi.mock('../../jobs/queues/fileProcessing.queue.js', () => ({
  addFileProcessingJob: vi.fn(),
}));

vi.mock('../../middlewares/rateLimiter.middleware.js', () => ({
  rateLimiter: () => (_c: Context, next: Next) => next(),
}));

const { apiKeyAuthHandler } = vi.hoisted(() => ({
  apiKeyAuthHandler: vi.fn((c: Context, next: Next) => {
    c.set('apiKey', { id: 'key-1', account: { id: 'account-1' } });
    return next();
  }),
}));

vi.mock('../../middlewares/apiKey.middleware.js', () => ({
  apiKeyAuth: () => apiKeyAuthHandler,
}));

vi.mock('../dematSocial/affectation/affectation.js', () => ({
  assignEntitesToRequeteTask: vi.fn(() => Promise.resolve()),
}));

vi.mock('../declarants/declarants.notification.service.js', () => ({
  sendDeclarantAcknowledgmentEmail: vi.fn(() => Promise.resolve()),
}));

const TRACE_ID = 'trace-integration';
const REQUETE_ID = 'RT-2026-02-0001';
const BOUNDARY = '----SirenaIntegrationBoundary';
const MB = 1024 * 1024;
const TEST_TIMEOUT_MS = 120_000;

const logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  bindings: () => ({ traceId: TRACE_ID }),
};

const app = factoryWithLogs
  .createApp()
  .use((c: Context, next: Next) => {
    c.set('logger', logger);
    return loggerStorage.run(logger as any, () => next());
  })
  .route('/third-party', ThirdPartyApp)
  .onError(errorHandler);

let server: ServerType;
let port: number;

const PDF_HEAD = Buffer.from('%PDF-1.4\n');
const FILLER = Buffer.alloc(256 * 1024, 0x61);
const MULTIPART_HEAD = Buffer.from(
  `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="rapport.pdf"\r\n` +
    'Content-Type: application/pdf\r\n\r\n',
);
const MULTIPART_TAIL = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);

// Generates the multipart body lazily so the client side does not hold the file in memory.
function* multipartChunks(fileSize: number) {
  yield MULTIPART_HEAD;
  yield PDF_HEAD;
  let remaining = fileSize - PDF_HEAD.length;
  while (remaining > 0) {
    const size = Math.min(remaining, FILLER.length);
    yield size === FILLER.length ? FILLER : FILLER.subarray(0, size);
    remaining -= size;
  }
  yield MULTIPART_TAIL;
}

const multipartLength = (fileSize: number) => MULTIPART_HEAD.length + fileSize + MULTIPART_TAIL.length;

type HttpResult = { status: number; headers: http.IncomingHttpHeaders; body: any };

const readResponse = (res: http.IncomingMessage) =>
  new Promise<HttpResult>((resolve, reject) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('error', reject);
    res.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // keep raw text
      }
      resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
    });
  });

const uploadAttachment = ({ fileSize, withContentLength }: { fileSize: number; withContentLength: boolean }) =>
  new Promise<HttpResult>((resolve, reject) => {
    const headers: http.OutgoingHttpHeaders = { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` };
    if (withContentLength) {
      headers['content-length'] = multipartLength(fileSize);
    }
    const req = http.request(
      { host: '127.0.0.1', port, method: 'POST', path: `/third-party/v1/requetes/${REQUETE_ID}/attachments`, headers },
      (res) => readResponse(res).then(resolve, reject),
    );
    // The server may answer and close before the whole body is sent: that is the expected behaviour.
    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') reject(err);
    });
    Readable.from(multipartChunks(fileSize)).pipe(req);
  });

/** Sends only the headers (announcing `contentLength` bytes) plus a few bytes, then waits for the answer. */
const sendHeadersOnly = (path: string, contentType: string, contentLength: number) =>
  new Promise<HttpResult & { bytesSent: number }>((resolve, reject) => {
    const firstBytes = Buffer.alloc(1024, 0x61);
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path,
        headers: { 'content-type': contentType, 'content-length': contentLength },
      },
      (res) =>
        readResponse(res).then((result) => {
          req.destroy();
          resolve({ ...result, bytesSent: firstBytes.length });
        }, reject),
    );
    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'ECONNRESET') reject(err);
    });
    req.write(firstBytes);
  });

const trackPeakMemory = () => {
  const baseline = process.memoryUsage();
  let peakHeapUsed = baseline.heapUsed;
  let peakArrayBuffers = baseline.arrayBuffers;
  const timer = setInterval(() => {
    const { heapUsed, arrayBuffers } = process.memoryUsage();
    peakHeapUsed = Math.max(peakHeapUsed, heapUsed);
    peakArrayBuffers = Math.max(peakArrayBuffers, arrayBuffers);
  }, 5);
  return () => {
    clearInterval(timer);
    return {
      heapUsedGrowth: peakHeapUsed - baseline.heapUsed,
      arrayBuffersGrowth: peakArrayBuffers - baseline.arrayBuffers,
    };
  };
};

describe('third-party attachments upload (integration, real HTTP server)', () => {
  beforeAll(async () => {
    server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 });
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.requete.findFirst.mockResolvedValue({ id: REQUETE_ID } as any);
    prisma.uploadedFile.create.mockImplementation((async ({ data }: any) => data) as any);
  });

  it(
    'stores a nominal upload and answers 200 with the x-trace-id header',
    async () => {
      const fileSize = 512 * 1024;

      const res = await uploadAttachment({ fileSize, withContentLength: true });

      expect(res.status).toBe(200);
      expect(res.headers['x-trace-id']).toBe(TRACE_ID);
      expect(res.body).toEqual({
        fileId: 'abc-123',
        fileName: 'abc-123.pdf',
        mimeType: 'application/pdf',
        size: fileSize,
      });
      expect(uploadFileToMinio).toHaveBeenCalledTimes(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'keeps memory bounded while streaming a 200 Mo upload',
    async () => {
      // Largest file whose multipart body still fits under the transport limit.
      const fileSize = MAX_FILE_SIZE - MULTIPART_HEAD.length - MULTIPART_TAIL.length;
      const stopTracking = trackPeakMemory();

      const res = await uploadAttachment({ fileSize, withContentLength: true });
      const { heapUsedGrowth, arrayBuffersGrowth } = stopTracking();

      expect(res.status).toBe(200);
      expect(res.body.size).toBe(fileSize);
      expect(heapUsedGrowth).toBeLessThan(50 * MB);
      // Network buffers live outside the V8 heap. They are freed lazily by the GC, hence the wider
      // margin, still far below the 200 Mo a buffered upload would take.
      expect(arrayBuffersGrowth).toBeLessThan(100 * MB);
    },
    TEST_TIMEOUT_MS,
  );

  it.each([
    [
      'attachment upload',
      `/third-party/v1/requetes/${REQUETE_ID}/attachments`,
      `multipart/form-data; boundary=${BOUNDARY}`,
      MAX_FILE_SIZE,
      200,
    ],
    ['JSON requete creation', '/third-party/v1/requetes', 'application/json', MAX_JSON_BODY_SIZE, 1],
  ])(
    'rejects a %s announcing its limit + 1 bytes with 413 before reading the body',
    async (_, path, contentType, maxSize, maxSizeInMo) => {
      const res = await sendHeadersOnly(path, contentType, maxSize + 1);

      expect(res.status).toBe(413);
      expect(res.body).toEqual({
        message: `La requête dépasse la taille maximale autorisée (${maxSizeInMo} Mo)`,
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(uploadFileToMinio).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'rejects a chunked JSON body over MAX_JSON_BODY_SIZE before authentication',
    async () => {
      // No Content-Length: the limit can only be enforced while reading. It runs before the API
      // key check, so it bounds what an anonymous caller can make the server hold in memory.
      const res = await new Promise<HttpResult>((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            method: 'POST',
            path: '/third-party/v1/requetes',
            headers: { 'content-type': 'application/json' },
          },
          (r) => readResponse(r).then(resolve, reject),
        );
        req.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') reject(err);
        });
        Readable.from(multipartChunks(10 * MB)).pipe(req);
      });

      expect(res.status).toBe(413);
      expect(res.body.message).toBe('La requête dépasse la taille maximale autorisée (1 Mo)');
      expect(apiKeyAuthHandler).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'cuts a chunked upload (no Content-Length) as soon as it exceeds MAX_FILE_SIZE',
    async () => {
      const stopTracking = trackPeakMemory();

      const res = await uploadAttachment({ fileSize: MAX_FILE_SIZE + 1, withContentLength: false });
      const { heapUsedGrowth } = stopTracking();

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: 'File size exceeds the maximum allowed',
        cause: { name: API_ERROR_CODES.FILE_MAX_SIZE, kind: ERROR_KIND.BUSINESS },
      });
      expect(prisma.uploadedFile.create).not.toHaveBeenCalled();
      expect(heapUsedGrowth).toBeLessThan(50 * MB);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'still rejects a file whose detected type is not allowed',
    async () => {
      const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01]), Buffer.alloc(57)]);
      const body = Buffer.concat([MULTIPART_HEAD, elf, MULTIPART_TAIL]);

      const res = await new Promise<HttpResult>((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            method: 'POST',
            path: `/third-party/v1/requetes/${REQUETE_ID}/attachments`,
            headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}`, 'content-length': body.length },
          },
          (r) => readResponse(r).then(resolve, reject),
        );
        req.on('error', reject);
        req.end(body);
      });

      expect(res.status).toBe(400);
      expect(res.body.cause).toEqual({ name: API_ERROR_CODES.FILE_TYPE, kind: ERROR_KIND.BUSINESS });
      expect(uploadFileToMinio).not.toHaveBeenCalled();
    },
    TEST_TIMEOUT_MS,
  );
});
