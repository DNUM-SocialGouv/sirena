import { afterEach, describe, expect, it } from 'vitest';
import { useAppUpdateStore } from '@/stores/appUpdateStore';
import { registerPreloadErrorHandler } from './preloadError';

describe('registerPreloadErrorHandler', () => {
  afterEach(() => {
    useAppUpdateStore.setState({ isUpdateAvailable: false });
  });

  it('flags an update and prevents the default when a preload error fires', () => {
    registerPreloadErrorHandler();

    const event = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(event);

    expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('registers the listener only once', () => {
    registerPreloadErrorHandler();
    registerPreloadErrorHandler();

    const event = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(event);

    expect(useAppUpdateStore.getState().isUpdateAvailable).toBe(true);
  });
});
