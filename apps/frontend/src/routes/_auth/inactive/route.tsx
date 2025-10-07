import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { AuthLayout } from '@/components/layout/auth/layout';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { requireNotPendingOrActif } from '@/lib/auth-guards';
import { router } from '@/lib/router';
import { useUserStore } from '@/stores/userStore';

export const Route = createFileRoute('/_auth/inactive')({
  beforeLoad: requireNotPendingOrActif,
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

  const reason = useMemo(() => {
    if (profileQuery.data?.statutId !== STATUT_TYPES.ACTIF) {
      return 'inactif';
    }
    if (userStore.role === ROLES.PENDING) {
      return 'en attente de validation';
    }
    return 'indisponible';
  }, [profileQuery.data, userStore.role]);

  const label = useMemo(() => (profileQuery.data ? profileQuery.data.prenom : ''), [profileQuery.data]);

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
        description={`Votre compte SIRENA est ${reason}. Veuillez contacter votre administrateur pour qu’il vous attribue les droits nécessaires à l’utilisation de l’application.`}
      />
    </AuthLayout>
  );
}
