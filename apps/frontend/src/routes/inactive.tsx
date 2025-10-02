import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { AuthLayout } from '@/components/layout/auth/layout';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { requireAuth } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/lib/router';
import { useUserStore } from '@/stores/userStore';

export const Route = createFileRoute('/inactive')({
  beforeLoad: async () => {
    await queryClient.ensureQueryData(profileQueryOptions());
    return requireAuth;
  },
  head: () => ({
    meta: [
      {
        title: 'Compte inactif - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const profileQuery = useQuery({
    ...profileQueryOptions(),
    enabled: true,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });
  const userStore = useUserStore();

  const label = useMemo(() => (profileQuery.data ? profileQuery.data.prenom : ''), [profileQuery.data]);

  useEffect(() => {
    if (profileQuery.data?.statutId === STATUT_TYPES.ACTIF && userStore.role !== ROLES.PENDING) {
      const userStore = useUserStore.getState();
      userStore.logout();
      router.navigate({ to: '/login', search: { redirect: window.location.pathname } });
    }
  }, [profileQuery.data, userStore.role]);

  return (
    <AuthLayout>
      <h1>Bienvenue {label}</h1>
      <Alert
        severity="info"
        title="Contactez votre administrateur"
        description="Votre compte SIRENA est inactif. Veuillez contacter votre administrateur pour qu’il vous attribue les droits nécessaires à l’utilisation de l’application."
      />
    </AuthLayout>
  );
}
