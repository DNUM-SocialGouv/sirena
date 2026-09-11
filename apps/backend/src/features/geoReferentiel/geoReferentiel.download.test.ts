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

const collect = async (
  url = 'https://example.test/data.csv',
  encoding: 'utf-8' | 'latin1' = 'utf-8',
  delimiter = ';',
) => {
  const lines: string[] = [];
  for await (const line of fetchCsvLines(url, { encoding, delimiter })) {
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
      signal: expect.any(AbortSignal),
    });
    // Poser cet en-tête à la main désactive la décompression automatique d'undici.
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toBeUndefined();
  });

  it('should keep a record whose quoted field holds a line break', async () => {
    // Un libellé multi-lignes ne doit pas produire deux enregistrements illisibles.
    respondWith([new TextEncoder().encode('a,b\n"Saint-Georges\nle Haut",01D\n')]);

    expect(await collect('https://example.test/data.csv', 'utf-8', ',')).toEqual([
      'a,b',
      '"Saint-Georges\nle Haut",01D',
    ]);
  });

  it('should reassemble a quoted field split across two chunks', async () => {
    const encoder = new TextEncoder();
    respondWith([encoder.encode('a,b\n"Saint-Georges\n'), encoder.encode('le Haut",01D\n')]);

    expect(await collect('https://example.test/data.csv', 'utf-8', ',')).toEqual([
      'a,b',
      '"Saint-Georges\nle Haut",01D',
    ]);
  });

  it('should treat a doubled quote as an escape rather than the end of the field', async () => {
    respondWith([new TextEncoder().encode('a,b\n"L""Abergement\nClémenciat",01D\n')]);

    expect(await collect('https://example.test/data.csv', 'utf-8', ',')).toEqual([
      'a,b',
      '"L""Abergement\nClémenciat",01D',
    ]);
  });

  it('should treat a lone quote inside an unquoted field as data', async () => {
    // Sans cette garde, un guillemet isolé avalerait tout le reste du fichier.
    respondWith([new TextEncoder().encode('a;b\n12";34\n56;78\n')]);

    expect(await collect()).toEqual(['a;b', '12";34', '56;78']);
  });

  it('should end a record on the line break that follows a closed quoted field', async () => {
    respondWith([new TextEncoder().encode('"a","b"\r\n"1","2"\r\n')]);

    expect(await collect('https://example.test/data.csv', 'utf-8', ',')).toEqual(['"a","b"', '"1","2"']);
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

  it('should abort the download when the caller aborts', async () => {
    const controller = new AbortController();
    respondWith([new TextEncoder().encode('a\n')]);

    const lines: string[] = [];
    for await (const line of fetchCsvLines('https://example.test/data.csv', {
      encoding: 'utf-8',
      delimiter: ';',
      signal: controller.signal,
    })) {
      lines.push(line);
    }

    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal.aborted).toBe(false);
    controller.abort();
    expect(init.signal.aborted).toBe(true);
  });

  it('should give the download a deadline even without a caller signal', async () => {
    respondWith([new TextEncoder().encode('a\n')]);

    await collect();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);
  });
});
