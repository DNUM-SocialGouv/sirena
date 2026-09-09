import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCsvLines, GeoReferentielDownloadError } from './geoReferentiel.download.js';

const fetchMock = vi.fn();
const originalFetch = global.fetch;

const streamOf = (chunks: Uint8Array[]): AsyncIterable<Uint8Array> => ({
  async *[Symbol.asyncIterator]() {
    for (const chunk of chunks) {
      yield chunk;
    }
  },
});

const respondWith = (chunks: Uint8Array[], contentType = 'text/csv') => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': contentType }),
    body: streamOf(chunks),
  });
};

const collect = async (url = 'https://example.test/data.csv', encoding: 'utf-8' | 'latin1' = 'utf-8') => {
  const lines: string[] = [];
  for await (const line of fetchCsvLines(url, { encoding })) {
    lines.push(line);
  }
  return lines;
};

describe('fetchCsvLines', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should split the payload into lines', async () => {
    respondWith([new TextEncoder().encode('a;b\n1;2\n3;4\n')]);

    expect(await collect()).toEqual(['a;b', '1;2', '3;4']);
  });

  it('should emit the last line when the payload has no trailing newline', async () => {
    respondWith([new TextEncoder().encode('a;b\n1;2')]);

    expect(await collect()).toEqual(['a;b', '1;2']);
  });

  it('should normalise CRLF line endings', async () => {
    respondWith([new TextEncoder().encode('a;b\r\n1;2\r\n')]);

    expect(await collect()).toEqual(['a;b', '1;2']);
  });

  it('should reassemble a line split across two chunks', async () => {
    const encoder = new TextEncoder();
    respondWith([encoder.encode('a;b\n1;'), encoder.encode('2\n')]);

    expect(await collect()).toEqual(['a;b', '1;2']);
  });

  it('should reassemble a multi-byte UTF-8 character split across two chunks', async () => {
    const encoded = new TextEncoder().encode('Métropole\n');
    // « é » occupe deux octets : la coupure tombe au milieu du caractère.
    respondWith([encoded.slice(0, 2), encoded.slice(2)]);

    expect(await collect()).toEqual(['Métropole']);
  });

  it('should decode latin-1 payloads whose bytes are not valid UTF-8', async () => {
    // 0xE9 = « é » en latin-1, séquence invalide en UTF-8.
    respondWith([new Uint8Array([0x4c, 0x69, 0x62, 0x65, 0x6c, 0x6c, 0xe9, 0x0a])]);

    expect(await collect('https://example.test/data.csv', 'latin1')).toEqual(['Libellé']);
  });

  it('should follow redirects and never set an Accept-Encoding header', async () => {
    respondWith([new TextEncoder().encode('a\n')]);

    await collect();

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/data.csv', {
      redirect: 'follow',
      signal: undefined,
    });
    // Poser cet en-tête à la main désactive la décompression automatique d'undici.
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toBeUndefined();
  });

  it('should throw when the response status is not ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers(), body: null });

    await expect(collect()).rejects.toThrow(GeoReferentielDownloadError);
  });

  it('should throw when the response is an HTML page', async () => {
    respondWith([new TextEncoder().encode('<!DOCTYPE html>')], 'text/html; charset=utf-8');

    await expect(collect()).rejects.toThrow(/HTML inattendue/);
  });

  it('should throw when the response has no body', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), body: null });

    await expect(collect()).rejects.toThrow(/sans corps/);
  });

  it('should propagate an abort signal to fetch', async () => {
    const controller = new AbortController();
    respondWith([new TextEncoder().encode('a\n')]);

    const lines: string[] = [];
    for await (const line of fetchCsvLines('https://example.test/data.csv', {
      encoding: 'utf-8',
      signal: controller.signal,
    })) {
      lines.push(line);
    }

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/data.csv', {
      redirect: 'follow',
      signal: controller.signal,
    });
  });
});
