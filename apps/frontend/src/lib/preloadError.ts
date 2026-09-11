import { useAppUpdateStore } from '@/stores/appUpdateStore';

let isRegistered = false;
let assetLoadFailed = false;

const ASSET_URL_RE = /(https?:\/\/[^\s'")]+|\/[^\s'")]+\.(?:m?js|css))/;
const PROBE_TIMEOUT_MS = 5000;

const CHUNK_LOAD_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS for/i,
  /'text\/html' is not a valid JavaScript MIME type/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!assetLoadFailed) {
    return false;
  }
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function resetAssetLoadFailedForTests(): void {
  assetLoadFailed = false;
}

/** Vite dispatches `vite:preloadError` with the underlying error as `payload`. */
type PreloadErrorEvent = Event & { payload?: unknown };

function isDepPreloadError(payload: unknown): boolean {
  return payload instanceof Error && payload.message.startsWith('Unable to preload CSS for ');
}

function extractAssetUrl(payload: unknown): string | null {
  if (!(payload instanceof Error)) {
    return null;
  }
  const match = payload.message.match(ASSET_URL_RE);
  return match ? match[0] : null;
}

/**
 * A `vite:preloadError` fires for two very different reasons:
 *  1. a deploy removed the content-hashed chunk this session still points at
 *     (nginx serves `/assets/` with `try_files $uri =404`, so a stale chunk
 *     yields a hard 404) — a refresh fixes it;
 *  2. a transient network failure (offline, flaky connection) — a refresh does
 *     NOT help and would needlessly risk discarding an in-progress form.
 *
 * We probe the failing asset to tell them apart: only a genuine 404 (the file
 * is gone from the server) means a new release shipped. Any other outcome — the
 * asset still resolves, or the server is unreachable — is treated as a network
 * blip and stays silent.
 */
async function isStaleDeploy(url: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.status === 404;
  } catch {
    return false;
  }
}

export function registerPreloadErrorHandler(): void {
  if (isRegistered) {
    return;
  }
  isRegistered = true;

  window.addEventListener('vite:preloadError', (event) => {
    const { payload } = event as PreloadErrorEvent;
    assetLoadFailed = true;

    if (isDepPreloadError(payload)) {
      event.preventDefault();
    }

    const url = extractAssetUrl(payload);
    if (!url) {
      // No identifiable asset to probe: surface the notice conservatively. The
      // notice alone never discards a form — only the user's refresh click does.
      useAppUpdateStore.getState().notifyUpdateAvailable();
      return;
    }

    void isStaleDeploy(url).then((stale) => {
      if (stale) {
        useAppUpdateStore.getState().notifyUpdateAvailable();
      }
    });
  });
}
