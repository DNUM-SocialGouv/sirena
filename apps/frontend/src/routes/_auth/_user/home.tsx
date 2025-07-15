import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { ROLES } from '@sirena/common/constants';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { profileQueryOptions } from '@/hooks/queries/useProfile';
import { requireAuth } from '@/lib/auth-guards';
import { useUserStore } from '@/stores/userStore';

export const Route = createFileRoute('/_auth/_user/home')({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      {
        title: 'Accueil - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useQuery({ ...profileQueryOptions(), enabled: false });
  const userStore = useUserStore();

  const label = useMemo(() => (data ? `${data.firstName} ${data.lastName}` : ''), [data]);

  return (
    <div className="home">
      <h1>Bienvenue {label}</h1>
      {userStore.role === ROLES.PENDING && <PendingAlert />}
    </div>
  );
}

function PendingAlert() {
  return (
    <Alert
      severity="info"
      title="Contactez votre administrateur"
      description="Votre compte a SIRENA a bien été créé. Veuillez contacter votre administrateur pour qu'il vous attribue les droits nécessaires à l'utilisation de l'application."
    />
  );
}
