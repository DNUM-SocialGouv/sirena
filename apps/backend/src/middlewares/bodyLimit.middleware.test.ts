import { ERROR_KIND } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../helpers/errors.js';
import factoryWithLogs from '../helpers/factories/appWithLogs.js';
import { streamSafeBodyLimit } from './bodyLimit.middleware.js';

const MB = 1024 * 1024;
const MULTIPART_MAX_SIZE = 4 * MB;
const OTHER_MAX_SIZE = 1 * MB;

const handler = vi.fn(() => new Response('ok'));

const app = factoryWithLogs
  .createApp()
  .use(streamSafeBodyLimit({ multipartMaxSize: MULTIPART_MAX_SIZE, otherMaxSize: OTHER_MAX_SIZE }))
  .post('/', handler)
  .onError(errorHandler);

const streamOf = (size: number) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(size));
      controller.close();
    },
  });

const expectPayloadTooLarge = async (res: Response, maxSizeInMo: number) => {
  expect(res.status).toBe(413);
  expect(await res.json()).toEqual({
    message: `La requête dépasse la taille maximale autorisée (${maxSizeInMo} Mo)`,
    cause: { kind: ERROR_KIND.BUSINESS },
  });
  expect(handler).not.toHaveBeenCalled();
};

describe('bodyLimit.middleware.ts', () => {
  beforeEach(() => {
    handler.mockClear();
  });

  describe('non multipart bodies', () => {
    it('lets a JSON body under the limit through', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hello: 'world' }),
      });

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('rejects a JSON body over its own limit with 413, even when under the multipart limit', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: 'x'.repeat(2 * MB) }),
      });

      await expectPayloadTooLarge(res, 1);
    });

    it('rejects a chunked JSON body over the limit with 413', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: streamOf(OTHER_MAX_SIZE + 1),
        duplex: 'half',
      } as RequestInit);

      await expectPayloadTooLarge(res, 1);
    });
  });

  describe('multipart bodies', () => {
    it('rejects a multipart body from its Content-Length header with 413', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data; boundary=x',
          'content-length': String(MULTIPART_MAX_SIZE + 1),
        },
        body: streamOf(MULTIPART_MAX_SIZE + 1),
        duplex: 'half',
      } as RequestInit);

      await expectPayloadTooLarge(res, 4);
    });

    it('lets a multipart body over the JSON limit but under its own limit through', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data; boundary=x',
          'content-length': String(MULTIPART_MAX_SIZE),
        },
        body: streamOf(MULTIPART_MAX_SIZE),
        duplex: 'half',
      } as RequestInit);

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not read a chunked multipart body and leaves the size check to the streaming upload', async () => {
      const res = await app.request('/', {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=x' },
        body: streamOf(MULTIPART_MAX_SIZE * 2),
        duplex: 'half',
      } as RequestInit);

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
