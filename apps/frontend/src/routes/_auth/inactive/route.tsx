import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo } from 'react';
import { AuthLayout } from '@/components/layout/auth/layout';
import { GlobalLayout } from '@/components/layout/globalLayout';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { useUserStatusSSE } from '@/hooks/useUserStatusSSE';
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

const POLL_INTERVAL = 30000;

function RouteComponent() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    ...profileQueryOptions(),
    enabled: true,
  });
  const userStore = useUserStore();

  const handleStatusChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  }, [queryClient]);

  const { isConnected: sseConnected } = useUserStatusSSE({
    onStatusChange: handleStatusChange,
  });

  // Fallback to polling if SSE is not connected
  useEffect(() => {
    if (sseConnected) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [sseConnected, queryClient]);

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
    <GlobalLayout>
      <AuthLayout>
        <h1>Bienvenue {label}</h1>
        <Alert
          severity="info"
          title="Contactez votre administrateur"
          description={`Votre compte SIRENA est ${reason}. Veuillez contacter votre administrateur pour qu’il vous attribue les droits nécessaires à l’utilisation de l’application.`}
        />
      </AuthLayout>
    </GlobalLayout>
  );
}
