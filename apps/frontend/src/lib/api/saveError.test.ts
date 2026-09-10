import { afterEach, describe, expect, it, vi } from 'vitest';
import { toastManager } from '@/lib/toastManager';
import { notifySaveNetworkFailure } from './saveError';

describe('notifySaveNetworkFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('raises an error toast that says the changes were not saved', () => {
    const add = vi.spyOn(toastManager, 'add').mockImplementation(() => undefined as never);

    notifySaveNetworkFailure();

    expect(add).toHaveBeenCalledTimes(1);
    const [toast] = add.mock.calls[0];
    expect(toast.title).toBe('Erreur');
    expect(toast.description).toMatch(/n'ont pas pu être enregistrées/);
    expect(toast.data).toEqual({ icon: 'fr-alert--error' });
  });

  it('never auto-dismisses, so a lost save cannot scroll past unnoticed', () => {
    const add = vi.spyOn(toastManager, 'add').mockImplementation(() => undefined as never);

    notifySaveNetworkFailure();

    expect(add.mock.calls[0][0].timeout).toBe(0);
  });
});
