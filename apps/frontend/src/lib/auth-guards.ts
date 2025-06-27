import { type UserState, useUserStore } from '@/stores/userStore';
import { redirect } from '@tanstack/react-router';

const fallback = '/home' as const;

export type BeforeLoad = {
  location: {
    href: string;
    pathname: string;
    search: Record<string, unknown> & { redirect?: string | undefined };
  };
  params?: Record<string, unknown>;
};

export const checkAuth = (params: BeforeLoad, userStore: UserState) => {
  if (!userStore.isLogged) {
    throw redirect({
      to: '/login',
      search: {
        redirect: params.location.href,
      },
    });
  }
};

const getFallbackByRole = (role: string | null) => {
  if (role === 'SUPER_ADMIN') {
    return '/admin/administration';
  }
  return fallback;
};

export const checkNotAuth = (params: BeforeLoad, userStore: UserState) => {
  if (userStore.isLogged) {
    const redirectUrl = params.location.search?.redirect
      ? params.location.search?.redirect
      : getFallbackByRole(userStore.role);
    throw redirect({ to: redirectUrl });
  }
};

export const checkRoles = (userStore: UserState, roles: string[]) => {
  if (userStore.role && !roles.includes(userStore.role)) {
    throw redirect({
      to: fallback,
    });
  }
};

export const requireAuthAndRoles = (roles: string[]) => {
  return (params: BeforeLoad) => {
    const userStore = useUserStore.getState();
    checkAuth(params, userStore);
    checkRoles(userStore, roles);
  };
};

export const requireAuth = (params: BeforeLoad) => {
  const userStore = useUserStore.getState();
  checkAuth(params, userStore);
};

export const requireNotAuth = (params: BeforeLoad) => {
  const userStore = useUserStore.getState();
  checkNotAuth(params, userStore);
};
