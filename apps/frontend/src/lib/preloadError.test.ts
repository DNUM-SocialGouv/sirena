import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppUpdateStore } from '@/stores/appUpdateStore';
import { registerPreloadErrorHandler } from './preloadError';

const CHUNK_URL = 'https://app.test/assets/index-abc123.js';

function dispatchPreloadError(payload?: unknown): Event {
  const event = new Event('vite:preloadError', { cancelable: true }) as Event & { payload?: unknown };
  event.payload = payload;
  window.dispatchEvent(event);
  return event;
}

function preloadError(url = CHUNK_URL): Error {
  return new Error(`Failed to fetch dynamically imported module: ${url}`);
}

describe('registerPreloadErrorHandler', () => {
  afterEach(() => {
    useAppUpdateStore.setState({ isUpdateAvailable: false });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('flags an update when the failing asset is gone (404 = stale deploy)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    registerPreloadErrorHandler();

    const event = dispatchPreloadError(preloadError());

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(true));
    expect(fetch).toHaveBeenCalledWith(CHUNK_URL, expect.objectContaining({ method: 'HEAD', cache: 'no-store' }));
  });

  it('stays silent when the asset still resolves (200 = network blip)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    registerPreloadErrorHandler();

    const event = dispatchPreloadError(preloadError());

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(false);
  });

  it('stays silent when the server is unreachable (fetch rejects)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    registerPreloadErrorHandler();

    dispatchPreloadError(preloadError());

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(false);
  });

  it('stays silent and skips the probe when offline', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    registerPreloadErrorHandler();

    dispatchPreloadError(preloadError());

    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(false);
  });

  it('surfaces the notice conservatively when no asset URL can be extracted', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    registerPreloadErrorHandler();

    const event = dispatchPreloadError(new Error('boom without any url'));

    expect(event.defaultPrevented).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(true);
  });

  it('registers the listener only once', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    registerPreloadErrorHandler();
    registerPreloadErrorHandler();

    dispatchPreloadError(preloadError());

    await vi.waitFor(() => expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(true));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
