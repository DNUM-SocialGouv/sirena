import * as Sentry from '@sentry/react';

export interface SentryUserInfo {
  id: string;
  email?: string;
  role?: string | null;
  topEntiteId?: string | null;
}

let lastKnownUser: SentryUserInfo | null = null;

export const identifySentryUser = (user: SentryUserInfo) => {
  lastKnownUser = user;
  Sentry.setUser({ id: user.id, email: user.email });
  Sentry.setTags({
    userRole: user.role ?? undefined,
    userTopEntiteId: user.topEntiteId ?? undefined,
  });
};

export const clearSentryUser = () => {
  Sentry.setUser(null);
};

export const getLastKnownSentryUser = (): SentryUserInfo | null => lastKnownUser;
