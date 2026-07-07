import { useAppUpdateStore } from '@/stores/appUpdateStore';

let isRegistered = false;

/**
 * After a deployment, a long-lived session still references content-hashed
 * chunks/CSS from the previous release that no longer exist on the server, so
 * Vite dispatches `vite:preloadError`. With `defaultPreload: 'intent'` this can
 * also fire from a background hover-preload, without any navigation.
 *
 * We suppress the throw (which otherwise surfaces as an ErrorBoundary crash and
 * Sentry noise) and flag that a refresh is available. We deliberately do NOT
 * reload automatically: a reload here would discard an in-progress form. The UI
 * surfaces a non-blocking notice and lets the user refresh when they are ready.
 */
export function registerPreloadErrorHandler(): void {
  if (isRegistered) {
    return;
  }
  isRegistered = true;

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    useAppUpdateStore.getState().notifyUpdateAvailable();
  });
}
