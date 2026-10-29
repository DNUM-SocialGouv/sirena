import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearWarningBannerDismissal,
  dismissWarningBanner,
  isWarningBannerDismissed,
  subscribeToWarningBannerDismissal,
} from './warningBannerDismissal';

const STORAGE_KEY = 'sirena.warningBanner.dismissed';

beforeEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  clearWarningBannerDismissal();
});

describe('warningBannerDismissal', () => {
  it('reports no dismissal on a fresh session', () => {
    expect(isWarningBannerDismissed()).toBe(false);
  });

  it('remembers a dismissal', () => {
    dismissWarningBanner();

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(isWarningBannerDismissed()).toBe(true);
  });

  it('forgets the dismissal when cleared', () => {
    dismissWarningBanner();
    clearWarningBannerDismissal();

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(isWarningBannerDismissed()).toBe(false);
  });

  it('notifies subscribers when the dismissal changes, and stops once unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToWarningBannerDismissal(listener);

    dismissWarningBanner();
    clearWarningBannerDismissal();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    dismissWarningBanner();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('reports no dismissal when storage reads throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(isWarningBannerDismissed()).toBe(false);
  });

  it('keeps the dismissal in memory when the storage write fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => dismissWarningBanner()).not.toThrow();
    expect(isWarningBannerDismissed()).toBe(true);
  });

  it('does not throw when clearing fails', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => clearWarningBannerDismissal()).not.toThrow();
    expect(isWarningBannerDismissed()).toBe(false);
  });
});
