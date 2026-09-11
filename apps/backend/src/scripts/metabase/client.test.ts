import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMetabaseClient, entityPath } from './client.js';
import { registerSecret } from './secrets.js';

describe('entityPath', () => {
  it('builds the API path for a positive integer id', () => {
    expect(entityPath('card', 12)).toBe('/api/card/12');
    expect(entityPath('dashboard', 4)).toBe('/api/dashboard/4');
  });

  it.each([
    ['a string id', '12'],
    ['a path traversal', '../../admin'],
    ['a float', 1.5],
    ['zero', 0],
    ['a negative id', -3],
    ['an unsafe integer', Number.MAX_SAFE_INTEGER + 2],
    ['null', null],
    ['undefined', undefined],
  ])('refuses %s', (_label, id) => {
    expect(() => entityPath('card', id)).toThrow(/invalid card id/);
  });
});

describe('createMetabaseClient', () => {
  it('strips trailing slashes from the site URL', () => {
    expect(createMetabaseClient({ siteUrl: 'https://metabase.example.com//', apiKey: 'k' }).baseUrl).toBe(
      'https://metabase.example.com',
    );
  });

  it.each(['metabase.example.com', 'file:///etc/passwd', 'javascript:alert(1)'])('refuses %s', (siteUrl) => {
    expect(() => createMetabaseClient({ siteUrl, apiKey: 'k' })).toThrow(/Invalid Metabase URL/);
  });
});

describe('createMetabaseClient request loop', () => {
  const client = () => createMetabaseClient({ siteUrl: 'https://metabase.example.com', apiKey: 'k' });
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  const failure = (status: number) => new Response(`server said ${status}`, { status });

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('never replays a POST after a network error, which could have created a duplicate', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('fetch failed')));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().post('/api/card', { name: 'x' })).rejects.toThrow(/fetch failed/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never replays a POST after a 502, which could have created a duplicate', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(failure(502)));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().post('/api/card', { name: 'x' })).rejects.toThrow(/→ 502/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('replays a POST on 429, the one status proving the request did not run', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(failure(429))
      .mockResolvedValueOnce(ok({ id: 301 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().post('/api/card', { name: 'x' })).resolves.toEqual({ id: 301 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('replays a GET after a network error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok({ id: 4 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().get('/api/dashboard/4')).resolves.toEqual({ id: 4 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up on a GET after three network errors', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('fetch failed')));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().get('/api/dashboard/4')).rejects.toThrow(/fetch failed/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([502, 503, 504])('replays a GET on %i, three attempts at most', async (status) => {
    const fetchMock = vi.fn(() => Promise.resolve(failure(status)));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().get('/api/dashboard/4')).rejects.toThrow(new RegExp(`→ ${status}`));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('resolves a 204 PUT to undefined', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().put('/api/dashboard/4', { name: 'x' })).resolves.toBeUndefined();
  });

  it('redacts a registered secret leaking through an error body', async () => {
    const apiKey = 'fixture-credential-bravo';
    registerSecret(apiKey);
    const fetchMock = vi.fn(() => Promise.resolve(new Response(`unknown key ${apiKey}`, { status: 400 })));
    vi.stubGlobal('fetch', fetchMock);

    const thrown = await client()
      .get('/api/dashboard/4')
      .catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).not.toContain(apiKey);
    expect((thrown as Error).message).toContain('«redacted»');
  });

  it('refuses to follow a redirect, which would carry the API key to another origin', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(ok({ id: 4 })));
    vi.stubGlobal('fetch', fetchMock);

    await client().get('/api/dashboard/4');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://metabase.example.com/api/dashboard/4',
      expect.objectContaining({ redirect: 'error' }),
    );
  });
});
