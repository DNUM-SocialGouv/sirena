import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { redirect } from '@tanstack/react-router';
import { type UserState, useUserStore } from '@/stores/userStore';

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
  if (role === ROLES.SUPER_ADMIN) {
    return '/admin/users';
  }
  if (role === ROLES.PENDING) {
    return '/inactive';
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
      to: getFallbackByRole(userStore.role),
    });
  }
};

const checkActif = (userStore: UserState) => {
  if (userStore.statutId !== 'ACTIF' && userStore.role !== ROLES.SUPER_ADMIN) {
    throw redirect({
      to: '/inactive',
    });
  }
};

export const requireAuthAndRoles = (roles: string[]) => {
  return (params: BeforeLoad) => {
    const userStore = useUserStore.getState();
    checkAuth(params, userStore);
    checkActif(userStore);
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

export const requireNotPendingOrActif = (params: BeforeLoad) => {
  const userStore = useUserStore.getState();
  checkAuth(params, userStore);
  if (userStore.role === ROLES.SUPER_ADMIN) {
    throw redirect({ to: '/admin/users' });
  }
  if (
    userStore.role != null &&
    userStore.statutId != null &&
    userStore.role !== ROLES.PENDING &&
    userStore.statutId !== STATUT_TYPES.INACTIF &&
    userStore.statutId !== STATUT_TYPES.NON_RENSEIGNE
  ) {
    throw redirect({ to: fallback });
  }
};
