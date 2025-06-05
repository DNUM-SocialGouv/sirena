import type { UserState } from '@/stores/userStore';
import { redirect } from '@tanstack/react-router';

export type BeforeLoadContext = {
  location: {
    href: string;
    pathname: string;
    search: Record<string, unknown>;
  };
  context: {
    userStore: UserState;
  };
  params?: Record<string, unknown>;
};

export type AuthGuardFunction = (params: BeforeLoadContext) => undefined | never;

export const requireAuth: AuthGuardFunction = ({ location, context }) => {
  if (!context.userStore.isLogged) {
    throw redirect({
      to: '/login',
      search: {
        redirect: location.href,
      },
    });
  }
};

export const requireAdmin: AuthGuardFunction = ({ location, context }) => {
  requireAuth({ location, context });

  if (!context.userStore.isAdmin) {
    throw redirect({
      to: '/home',
    });
  }
};

export const requireAuthAndAdmin: AuthGuardFunction = (params) => {
  requireAdmin(params); // requireAdmin inclut déjà requireAuth
};

export const createAuthGuard = (
  authCheck: (context: UserState) => boolean,
  redirectTo = '/login',
): AuthGuardFunction => {
  return ({ location, context }) => {
    if (!authCheck(context.userStore)) {
      throw redirect({
        to: redirectTo,
        search: redirectTo === '/login' ? { redirect: location.href } : undefined,
      });
    }
  };
};
