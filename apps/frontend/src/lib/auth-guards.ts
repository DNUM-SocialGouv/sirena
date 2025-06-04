import type { UserState } from '@/stores/userStore';
import { redirect } from '@tanstack/react-router';

// Type générique plus précis utilisant les types de TanStack Router
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

// Type pour les fonctions de guard
export type AuthGuardFunction = (params: BeforeLoadContext) => undefined | never;

// Guard pour vérifier que l'utilisateur est connecté
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

// Guard pour vérifier que l'utilisateur est admin
export const requireAdmin: AuthGuardFunction = ({ location, context }) => {
  // D'abord vérifier l'authentification
  requireAuth({ location, context });

  if (!context.userStore.isAdmin) {
    throw redirect({
      to: '/home',
    });
  }
};

// Guard combiné (auth + admin) - le plus utilisé
export const requireAuthAndAdmin: AuthGuardFunction = (params) => {
  requireAdmin(params); // requireAdmin inclut déjà requireAuth
};

// Utilitaire pour créer des guards personnalisés
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
