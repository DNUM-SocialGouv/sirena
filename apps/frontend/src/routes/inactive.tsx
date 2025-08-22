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
  const profileQuery = useQuery({ ...profileQueryOptions(), enabled: false });
  const userStore = useUserStore();

  const label = useMemo(() => (profileQuery.data ? profileQuery.data.firstName : ''), [profileQuery.data]);

  useEffect(() => {
    if (profileQuery.data?.statutId === STATUT_TYPES.ACTIF && userStore.role !== ROLES.PENDING) {
      router.navigate({ to: '/home' });
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
