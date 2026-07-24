import * as Sentry from '@sentry/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSentryUser, getLastKnownSentryUser, identifySentryUser } from './sentryUser';

vi.mock('@sentry/react', () => ({
  setUser: vi.fn(),
  setTags: vi.fn(),
}));

const user = {
  id: 'user-123',
  email: 'agent@example.gouv.fr',
  role: 'ENTITY_ADMIN',
  topEntiteId: 'entite-42',
};

describe('sentryUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('identifySentryUser', () => {
    it('should attach the user to the Sentry scope with role and entite tags', () => {
      identifySentryUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123', email: 'agent@example.gouv.fr' });
      expect(Sentry.setTags).toHaveBeenCalledWith({
        userRole: 'ENTITY_ADMIN',
        userTopEntiteId: 'entite-42',
      });
    });

    it('should keep the user in memory as the last known user', () => {
      identifySentryUser(user);

      expect(getLastKnownSentryUser()).toEqual(user);
    });
  });

  describe('clearSentryUser', () => {
    it('should detach the user from the Sentry scope but keep the last known user', () => {
      identifySentryUser(user);
      clearSentryUser();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
      expect(getLastKnownSentryUser()).toEqual(user);
    });
  });
});
