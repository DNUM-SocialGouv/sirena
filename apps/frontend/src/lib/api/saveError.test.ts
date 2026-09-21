import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/lib/api/tanstackQuery';
import { toastManager } from '@/lib/toastManager';
import {
  notifyAutoMerge,
  notifyConflictPersistent,
  notifyConflictRefreshed,
  notifyConflictUnusable,
  notifySaveFailure,
  notifySaveHttpFailure,
  notifySaveNetworkFailure,
} from './saveError';

const spyToast = () => vi.spyOn(toastManager, 'add').mockImplementation(() => undefined as never);

const lastToast = (add: ReturnType<typeof spyToast>) => add.mock.calls[add.mock.calls.length - 1][0];

describe('notifySaveNetworkFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('raises an error toast that says the changes were not saved', () => {
    const add = spyToast();

    notifySaveNetworkFailure();

    expect(add).toHaveBeenCalledTimes(1);
    const [toast] = add.mock.calls[0];
    expect(toast.title).toBe('Erreur');
    expect(toast.description).toMatch(/n'ont pas pu être enregistrées/);
    expect(toast.data).toEqual({ icon: 'fr-alert--error' });
  });

  it('never auto-dismisses, so a lost save cannot scroll past unnoticed', () => {
    const add = spyToast();

    notifySaveNetworkFailure();

    expect(add.mock.calls[0][0].timeout).toBe(0);
  });
});

describe('notifySaveHttpFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [400, /ne sont pas valides/],
    [403, /pas autorisé/],
    [404, /introuvable/],
  ])('translates a %i into plain words instead of echoing the server', (status, expected) => {
    const add = spyToast();

    notifySaveHttpFailure(new HttpError('HTTP', status, { message: 'Requete not found' }));

    expect(lastToast(add).description).toMatch(expected);
    expect(lastToast(add).description).not.toMatch(/Requete not found/);
  });

  it('falls back to a generic sentence on a status it does not know', () => {
    const add = spyToast();

    notifySaveHttpFailure(new HttpError('HTTP', 500, { message: 'Internal Server Error' }));

    expect(lastToast(add).description).toMatch(/Réessayez dans quelques instants/);
    expect(lastToast(add).description).not.toMatch(/Internal Server Error/);
  });
});

describe('notifySaveFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('treats an answered request as an HTTP failure', () => {
    const add = spyToast();

    notifySaveFailure(new HttpError('HTTP', 404));

    expect(lastToast(add).description).toMatch(/introuvable/);
  });

  it('treats anything else as a request that never got an answer', () => {
    const add = spyToast();

    notifySaveFailure(new TypeError('Failed to fetch'));

    expect(lastToast(add).description).toMatch(/connexion au serveur a échoué/);
    expect(lastToast(add).timeout).toBe(0);
  });
});

describe('conflict notifications', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['notifyConflictUnusable', notifyConflictUnusable, 'fr-alert--error', /depuis votre dernière consultation/],
    ['notifyConflictRefreshed', notifyConflictRefreshed, 'fr-alert--warning', /La page a été actualisée/],
    ['notifyConflictPersistent', notifyConflictPersistent, 'fr-alert--error', /continuent d’être modifiées/],
  ])('%s shares the same conflict title', (_name, notify, icon, expected) => {
    const add = spyToast();

    notify();

    expect(lastToast(add).title).toBe('Erreur : Conflit de données');
    expect(lastToast(add).description).toMatch(expected);
    expect(lastToast(add).data).toEqual({ icon });
  });

  it('announces an automatic merge as information', () => {
    const add = spyToast();

    notifyAutoMerge();

    expect(lastToast(add).title).toBe('Information : Fusion automatique');
    expect(lastToast(add).data).toEqual({ icon: 'fr-alert--info' });
  });
});
