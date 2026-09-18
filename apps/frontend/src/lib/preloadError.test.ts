import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppUpdateStore } from '@/stores/appUpdateStore';
import { isChunkLoadError, registerPreloadErrorHandler, resetAssetLoadFailedForTests } from './preloadError';

const CHUNK_URL = 'https://app.test/assets/index-abc123.js';
const CSS_URL = 'https://app.test/assets/index-abc123.css';

function dispatchPreloadError(payload?: unknown): Event {
  const event = new Event('vite:preloadError', { cancelable: true }) as Event & { payload?: unknown };
  event.payload = payload;
  window.dispatchEvent(event);
  return event;
}

function preloadError(url = CHUNK_URL): Error {
  return new Error(`Failed to fetch dynamically imported module: ${url}`);
}

function depPreloadError(url = CSS_URL): Error {
  return new Error(`Unable to preload CSS for ${url}`);
}

describe('registerPreloadErrorHandler', () => {
  afterEach(() => {
    useAppUpdateStore.setState({ isUpdateAvailable: false });
    resetAssetLoadFailedForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('flags an update when the failing asset is gone (404 = stale deploy)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    registerPreloadErrorHandler();

    const event = dispatchPreloadError(preloadError());

    expect(event.defaultPrevented).toBe(false);
    await vi.waitFor(() => expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(true));
    expect(fetch).toHaveBeenCalledWith(CHUNK_URL, expect.objectContaining({ method: 'HEAD', cache: 'no-store' }));
  });

  it('stays silent when the asset still resolves (200 = network blip)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    registerPreloadErrorHandler();

    const event = dispatchPreloadError(preloadError());

    expect(event.defaultPrevented).toBe(false);
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

    expect(event.defaultPrevented).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(true);
  });

  it('cancels a CSS dependency preload failure, which Vite recovers from on its own', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    registerPreloadErrorHandler();

    const event = dispatchPreloadError(depPreloadError());

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(true));
  });

  it('lets a module load failure reject so the router never receives an undefined module', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    registerPreloadErrorHandler();

    const event = dispatchPreloadError(preloadError());

    expect(event.defaultPrevented).toBe(false);
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

describe('isChunkLoadError', () => {
  afterEach(() => {
    resetAssetLoadFailedForTests();
    vi.unstubAllGlobals();
  });

  it('reports nothing while no asset has failed in this session', () => {
    expect(isChunkLoadError(preloadError())).toBe(false);
    expect(isChunkLoadError(depPreloadError())).toBe(false);
  });

  it.each([
    ['Chrome', `Failed to fetch dynamically imported module: ${CHUNK_URL}`],
    ['Firefox', `error loading dynamically imported module: ${CHUNK_URL}`],
    ['Safari', 'Importing a module script failed.'],
    ['Vite CSS', `Unable to preload CSS for ${CSS_URL}`],
    [
      'SPA fallback',
      "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of 'text/html'. 'text/html' is not a valid JavaScript MIME type",
    ],
  ])('matches the %s wording once an asset has failed', (_engine, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    registerPreloadErrorHandler();
    dispatchPreloadError(preloadError());

    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('leaves a genuine application error reported, even after an asset failed', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    registerPreloadErrorHandler();
    dispatchPreloadError(preloadError());

    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'component')"))).toBe(false);
    expect(isChunkLoadError(new Error('HTTP 500'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it('flags the failure synchronously, before the stale-deploy probe resolves', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    registerPreloadErrorHandler();

    dispatchPreloadError(preloadError());

    expect(isChunkLoadError(preloadError())).toBe(true);
  });
});
