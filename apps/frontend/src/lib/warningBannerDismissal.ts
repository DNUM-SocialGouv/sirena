const STORAGE_KEY = 'sirena.warningBanner.dismissed';

// Session storage, not local storage: the dismissal must not outlive the browsing session.
const readSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

// Holds the dismissal when storage is unavailable, so closing the banner still works for the
// current page load. It starts false again on the next one, like the session storage entry.
let dismissedInMemory = false;

// Storage fires no event in the tab that wrote it, so subscribers are notified here: a mounted
// banner would otherwise keep a stale copy of the flag once the dismissal is cleared.
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) listener();
};

export const subscribeToWarningBannerDismissal = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const isWarningBannerDismissed = (): boolean => {
  if (dismissedInMemory) return true;
  try {
    return readSessionStorage()?.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const dismissWarningBanner = (): void => {
  dismissedInMemory = true;
  try {
    readSessionStorage()?.setItem(STORAGE_KEY, 'true');
  } catch {
    // Storage may be unavailable (private mode, quota).
  }
  notify();
};

export const clearWarningBannerDismissal = (): void => {
  dismissedInMemory = false;
  try {
    readSessionStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  notify();
};
